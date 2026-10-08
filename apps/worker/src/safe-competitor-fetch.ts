import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";

const MAX_BYTES = 1_500_000;

function publicAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (version !== 6) return false;
  const normalized = address.toLowerCase();
  // Public IPv6 unicast is 2000::/3. Reject mapped, local, link-local and
  // documentation ranges rather than attempting to enumerate every special range.
  return /^[23]/.test(normalized) && !normalized.startsWith("2001:db8:");
}

async function requestPinned(url: URL): Promise<{ status: number; location?: string; type: string; body: string }> {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !publicAddress(entry.address)))
    throw new Error("Competitor host resolved to a non-public address");
  const selected = addresses[0];
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        servername: url.hostname,
        lookup: ((_hostname: string, _options: unknown, callback: (error: Error | null, address: string, family: number) => void) => callback(null, selected.address, selected.family)) as never,
        headers: {
          "user-agent": "VelozySEOResearch/1.0 (+https://velozy.com/crawler)",
          accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_BYTES) {
            request.destroy(new Error("Competitor page exceeds the crawl size limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({
          status: response.statusCode || 0,
          location: response.headers.location,
          type: String(response.headers["content-type"] || ""),
          body: Buffer.concat(chunks).toString("utf8"),
        }));
      },
    );
    request.setTimeout(8_000, () => request.destroy(new Error("Competitor request timed out")));
    request.on("error", reject);
    request.end();
  });
}

async function safeGet(start: URL, allowedHost = start.hostname) {
  let current = start;
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (current.protocol !== "https:" || current.username || current.password || current.port || current.hostname.toLowerCase() !== allowedHost.toLowerCase())
      throw new Error("Competitor redirects must remain on public HTTPS URLs");
    const response = await requestPinned(current);
    if ([301, 302, 303, 307, 308].includes(response.status) && response.location) {
      current = new URL(response.location, current);
      continue;
    }
    return response;
  }
  throw new Error("Competitor page exceeded the redirect limit");
}

export function robotsAllows(body: string, path: string) {
  const relevant: Array<{ path: string; allow: boolean }> = [];
  let agents: string[] = [];
  let directives: Array<{ path: string; allow: boolean }> = [];
  const flush = () => {
    if (agents.some((agent) => agent === "*" || "velozyseoresearch".includes(agent))) relevant.push(...directives);
    agents = [];
    directives = [];
  };
  let hasDirective = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.split("#", 1)[0]?.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (name === "user-agent") {
      if (hasDirective) { flush(); hasDirective = false; }
      agents.push(value.toLowerCase());
    } else if ((name === "disallow" || name === "allow") && value) {
      directives.push({ path: value, allow: name === "allow" });
      hasDirective = true;
    }
  }
  flush();
  const matching = relevant.filter((rule) => {
    const expression = rule.path.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp("^" + expression).test(path);
  }).sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return !matching.length || matching[0].allow;
}

async function pageSummary(url: URL, domain: string) {
  const page = await safeGet(url, domain);
  if (page.status < 200 || page.status >= 300 || !/text\/html|application\/xhtml\+xml/i.test(page.type))
    throw new Error("Competitor page returned an unsupported response (" + page.status + ")");
  const { parse } = await import("node-html-parser");
  const root = parse(page.body);
  for (const element of root.querySelectorAll("script,style,noscript,iframe,svg,template")) element.remove();
  return { url: url.toString(), title: root.querySelector("title")?.textContent.trim().slice(0, 300) || "", description: root.querySelector('meta[name="description"]')?.getAttribute("content")?.slice(0, 600) || "", text: root.textContent.replace(/\s+/g, " ").trim().slice(0, 6_000) };
}

export async function fetchCompetitorSummary(domain: string) {
  const origin = new URL(`https://${domain}/`);
  const robots = await safeGet(new URL("/robots.txt", origin));
  if (robots.status !== 200 && robots.status !== 404 && robots.status !== 410)
    return { domain, blockedByRobots: true, title: "", description: "", text: "", pages: [] };
  const rules = robots.status === 200 ? robots.body : "";
  if (!robotsAllows(rules, "/")) return { domain, blockedByRobots: true, title: "", description: "", text: "", pages: [] };
  const sitemapUrls = rules.split(/\r?\n/).flatMap((line) => {
    const match = /^\s*sitemap\s*:\s*(https:\/\/\S+)/i.exec(line);
    if (!match) return [];
    try { const url = new URL(match[1]); return url.hostname === domain ? [url] : []; } catch { return []; }
  });
  if (!sitemapUrls.length) sitemapUrls.push(new URL("/sitemap.xml", origin));
  const sitemapPages: URL[] = [];
  for (const sitemapUrl of sitemapUrls.slice(0, 2)) {
    try {
      const result = await safeGet(sitemapUrl, domain);
      if (result.status !== 200 || !/xml|text\/plain/i.test(result.type)) continue;
      for (const match of result.body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        try {
          const url = new URL(match[1].trim());
          if (url.hostname === domain && url.protocol === "https:" && !url.username && !url.password && !url.port && robotsAllows(rules, url.pathname) && url.pathname !== "/") sitemapPages.push(url);
        } catch { /* Ignore malformed sitemap entries. */ }
        if (sitemapPages.length >= 5) break;
      }
    } catch { /* A missing or malformed sitemap does not block homepage research. */ }
    if (sitemapPages.length >= 5) break;
  }
  const pages = [await pageSummary(origin, domain)];
  for (const url of [...new Map(sitemapPages.map((url) => [url.toString(), url])).values()].slice(0, 4)) {
    try { pages.push(await pageSummary(url, domain)); } catch { /* Keep other bounded page observations. */ }
  }
  return {
    domain,
    blockedByRobots: false,
    title: pages[0].title,
    description: pages[0].description,
    text: pages.map((page) => page.text).join(" ").slice(0, 12_000),
    pages,
  };
}
