import { resolveTxt } from "node:dns/promises";
import { domainToASCII } from "node:url";

export function normalizeCustomHostname(value: string) {
  let hostname = value.trim().toLowerCase().replace(/\.$/, "");
  if (/^https?:\/\//i.test(hostname)) {
    try {
      const url = new URL(hostname);
      if (url.pathname !== "/" || url.search || url.hash || url.port) return null;
      hostname = url.hostname;
    } catch {
      return null;
    }
  }
  hostname = domainToASCII(hostname).replace(/^www\./, "");
  if (
    !hostname || hostname.length > 253 || !hostname.includes(".") ||
    hostname.split(".").some((label) => label.length < 1 || label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) ||
    /^\d+(?:\.\d+){3}$/.test(hostname)
  ) return null;
  return hostname;
}

export function customDomainChallengeName(hostname: string) {
  return `_velozy-verification.${hostname}`;
}

export async function hasCustomDomainVerificationRecord(
  hostname: string,
  token: string,
  lookup: typeof resolveTxt = resolveTxt,
) {
  try {
    const records = await lookup(customDomainChallengeName(hostname));
    return records.some((record) => record.join("") === token);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (["ENODATA", "ENOTFOUND", "ESERVFAIL", "ETIMEOUT", "EREFUSED"].includes(code || "")) return false;
    throw error;
  }
}
