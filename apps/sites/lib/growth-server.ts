import { randomUUID } from "node:crypto";

const apiBase = (
  process.env.VELOZY_API_URL ||
  process.env.NEXT_PUBLIC_VELOZY_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");

async function postGrowth(
  host: string,
  path: string,
  body: unknown,
  userAgent?: string,
) {
  const secret = process.env.GROWTH_INTERNAL_SECRET;
  if (!secret || secret.length < 32 || !host) return undefined;
  try {
    const response = await fetch(`${apiBase}/api/public/growth/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-growth-internal-secret": secret,
        "x-growth-site-host": host,
        "x-growth-request-id": randomUUID(),
        ...(userAgent ? { "user-agent": userAgent.slice(0, 500) } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(900),
    });
    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
}

export function meterPublishedPageView(
  host: string,
  path: string,
  userAgent?: string,
) {
  return postGrowth(host, "pageviews", { path }, userAgent);
}
