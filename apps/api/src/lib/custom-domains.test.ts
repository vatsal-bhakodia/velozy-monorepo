import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customDomainChallengeName, hasCustomDomainVerificationRecord, normalizeCustomHostname } from "./custom-domains.js";

describe("custom domain validation", () => {
  it("normalizes URL input and internationalized names", () => {
    assert.equal(normalizeCustomHostname(" HTTPS://Exämple.com/ "), "xn--exmple-cua.com");
    assert.equal(normalizeCustomHostname("example.com."), "example.com");
    assert.equal(normalizeCustomHostname("www.example.com"), "example.com");
  });

  it("rejects malformed, local, IP, port, and path inputs", () => {
    for (const hostname of ["localhost", "127.0.0.1", "https://example.com/path", "example.com:443", "-bad.example", "bad..example", "https://example.com:8443"]) {
      assert.equal(normalizeCustomHostname(hostname), null, hostname);
    }
  });
});

describe("custom domain DNS ownership challenge", () => {
  it("uses a stable TXT record name and joins split TXT character strings", async () => {
    assert.equal(customDomainChallengeName("example.com"), "_velozy-verification.example.com");
    const found = await hasCustomDomainVerificationRecord("example.com", "velozy-token", async () => [["velozy-", "token"], ["other"]]);
    assert.equal(found, true);
  });

  it("returns false while DNS is pending and surfaces unexpected resolver failures", async () => {
    const missing = Object.assign(new Error("no TXT record"), { code: "ENODATA" });
    assert.equal(await hasCustomDomainVerificationRecord("example.com", "token", async () => { throw missing; }), false);
    const failure = Object.assign(new Error("resolver unavailable"), { code: "ECONNREFUSED" });
    await assert.rejects(hasCustomDomainVerificationRecord("example.com", "token", async () => { throw failure; }), failure);
  });
});
