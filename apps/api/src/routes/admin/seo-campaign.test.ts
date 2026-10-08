import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { processSeoCampaignImage } from "../../lib/seo-campaign-image.js";
import { normalizeDomain } from "./seo-campaign.js";

test("competitor domains normalize to public HTTPS hostnames", () => {
  assert.equal(normalizeDomain("https://www.example.com/path"), "example.com");
  assert.equal(normalizeDomain("example.co.uk"), "example.co.uk");
  for (const value of ["http://example.com", "https://127.0.0.1", "https://localhost", "https://user:pass@example.com", "https://example.com:8443"]) {
    assert.throws(() => normalizeDomain(value));
  }
});

test("campaign image processing re-encodes to metadata-free WebP", async () => {
  const source = await sharp({ create: { width: 32, height: 24, channels: 3, background: "#336699" } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { ImageDescription: "private source metadata" } } })
    .toBuffer();
  const result = await processSeoCampaignImage(source);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.iptc, undefined);
  assert.equal(metadata.xmp, undefined);
});
