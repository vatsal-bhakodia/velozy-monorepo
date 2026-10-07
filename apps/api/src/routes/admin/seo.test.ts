import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditRecords,
  domainRatingFrom,
  organicSerpRows,
  serpTaskOutcome,
  verifiedHttpsUrl,
} from "./seo.js";

const record = (overrides: Record<string, unknown> = {}) => ({
  id: "record-1",
  type: "page" as const,
  title: "About",
  slug: "about",
  status: "published",
  metaTitle: "About us",
  metaDescription: "Learn about our company.",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  editPath: "/pages",
  body: "Page body",
  ...overrides,
});

describe("SEO audit checks", () => {
  it("returns no findings for complete metadata and content", () => {
    assert.deepEqual(auditRecords([record()]), []);
  });

  it("reports missing and overlong metadata plus empty page content", () => {
    const findings = auditRecords([
      record({ metaTitle: null, metaDescription: "d".repeat(161), body: "  " }),
    ]);
    assert.deepEqual(
      findings.map(({ rule, severity }) => [rule, severity]),
      [
        ["missing_title", "high"],
        ["long_description", "low"],
        ["missing_content", "medium"],
      ],
    );
  });

  it("marks every record sharing a case-insensitive SEO title", () => {
    const findings = auditRecords([
      record(),
      record({
        id: "record-2",
        type: "blog",
        title: "Our story",
        metaTitle: "ABOUT US",
        body: "Blog body",
      }),
    ]);
    assert.deepEqual(
      findings.map(({ rule, targetId }) => [rule, targetId]),
      [
        ["duplicate_title", "record-1"],
        ["duplicate_title", "record-2"],
      ],
    );
  });

  it("checks product and collection metadata without content-only rules", () => {
    const findings = auditRecords([
      record({
        type: "product",
        metaTitle: null,
        metaDescription: null,
        body: undefined,
      }),
      record({
        id: "collection-1",
        type: "collection",
        metaTitle: null,
        metaDescription: null,
        body: undefined,
      }),
    ]);
    assert.equal(findings.length, 4);
    assert.ok(
      findings.every(
        ({ rule }) =>
          rule === "missing_title" || rule === "missing_description",
      ),
    );
  });
});

describe("SEO provider data guards", () => {
  it("accepts only valid Ahrefs ratings", () => {
    assert.equal(
      domainRatingFrom({ domain_rating: { domain_rating: 72.5 } }),
      72.5,
    );
    assert.equal(
      domainRatingFrom({ domain_rating: { domain_rating: 101 } }),
      null,
    );
    assert.equal(domainRatingFrom({}), null);
  });

  it("keeps only the first ten organic SERP results and normalizes missing fields", () => {
    const rows = organicSerpRows([
      ...Array.from({ length: 12 }, (_, index) => ({
        type: "organic",
        rank_group: index + 1,
        url: `https://example.com/${index}`,
      })),
      { type: "paid", rank_group: 1, url: "https://ads.example.com" },
    ]);
    assert.equal(rows.length, 10);
    assert.deepEqual(rows[0], {
      position: 1,
      domain: "",
      title: "",
      url: "https://example.com/0",
    });
  });

  it("restricts Google checks to HTTPS on the verified domain", () => {
    assert.equal(
      verifiedHttpsUrl(
        "https://shop.example.com/item#details",
        "shop.example.com",
      ),
      "https://shop.example.com/item",
    );
    assert.equal(
      verifiedHttpsUrl("http://shop.example.com/item", "shop.example.com"),
      null,
    );
    assert.equal(
      verifiedHttpsUrl(
        "https://shop.example.com.attacker.test/",
        "shop.example.com",
      ),
      null,
    );
    assert.equal(
      verifiedHttpsUrl("https://shop.example.com:8443/", "shop.example.com"),
      null,
    );
  });

  it("keeps queued provider statuses pending and distinguishes terminal task errors", () => {
    assert.equal(serpTaskOutcome(40601, false), "pending");
    assert.equal(serpTaskOutcome(40602, false), "pending");
    assert.equal(serpTaskOutcome(20000, false), "pending");
    assert.equal(serpTaskOutcome(20000, true), "completed");
    assert.equal(serpTaskOutcome(40401, false), "failed");
    assert.equal(serpTaskOutcome(40401, true), "failed");
  });
});
