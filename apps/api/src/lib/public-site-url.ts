export function publicSiteUrl(subdomain: string) {
  const platformDomain = process.env.PLATFORM_DOMAIN || "localhost:3002";
  const protocol = platformDomain.includes("localhost") ? "http" : "https";
  return `${protocol}://${subdomain}.${platformDomain}`;
}
