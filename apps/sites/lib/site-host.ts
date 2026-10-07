import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteDomains } from "@/lib/db/schema";

export function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().split(":")[0].replace(/^www\./, "");
}

export async function findPublishedSite(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return db.query.siteDomains.findFirst({
    where: and(
      eq(siteDomains.hostname, normalized),
      eq(siteDomains.isVerified, true),
    ),
    with: { project: true },
  });
}
