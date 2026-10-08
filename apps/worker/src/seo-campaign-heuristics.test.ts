import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyIntent, hasCannibalization, mapTarget, normalizePhrase, resolveResearchLocale, scoreOpportunity } from "./seo-campaign-heuristics.js";
import { robotsAllows } from "./safe-competitor-fetch.js";

test("normalizes phrases and classifies intent with stable rule precedence", () => {
  assert.equal(normalizePhrase("  Cafés & Gifts! "), "cafes gifts");
  assert.equal(classifyIntent("best wedding jeweller near me"), "local");
  assert.equal(classifyIntent("best wedding jewellery"), "commercial");
  assert.equal(classifyIntent("buy wedding jewellery"), "transactional");
  assert.equal(classifyIntent("how to clean wedding jewellery"), "informational");
});

test("maps to the strongest matching target and flags ambiguous overlap", () => {
  const targets = [
    { id: "a", title: "Wedding jewellery", slug: "wedding-jewellery", targetType: "collection" as const },
    { id: "b", title: "Wedding jewellery", slug: "wedding-jewellery-sets", targetType: "page" as const },
  ];
  assert.equal(mapTarget("wedding jewellery sets", targets).target?.id, "b");
  assert.equal(mapTarget("wedding jewellery", targets).ambiguous, true);
  assert.equal(hasCannibalization("wedding jewellery", targets), true);
});

test("scores missing provider evidence as unknown and blocks autopilot eligibility", () => {
  const result = scoreOpportunity({
    phrase: "buy custom wedding jewellery",
    profile: { businessName: "Acme", industry: "Jewellery", offerings: ["custom wedding jewellery"], goals: ["orders"], markets: ["India"] },
    targetMatch: 0.7,
    searchVolume: null,
    maxSearchVolume: 0,
    keywordDifficulty: null,
    targetInventoryAvailable: true,
    cannibalization: false,
  });
  assert.equal(result.intent, "transactional");
  assert.equal(result.competitionLabel, "unknown");
  assert.equal(result.evidenceCoverage, 50);
  assert.equal(result.autopilotEligible, false);
});

test("uses a supported market and language pair instead of guessing a default locale", () => {
  assert.deepEqual(resolveResearchLocale(["Delhi, India"], ["Hindi"]), { market: "india", countryCode: "ind", locationCode: 2356, languageCode: "hi" });
  assert.equal(resolveResearchLocale(["Mars"], ["English"]), null);
});

test("robots rules block disallowed competitor paths and honor a more specific allow", () => {
  const robots = "User-agent: *\nDisallow: /private\nAllow: /private/public\n";
  assert.equal(robotsAllows(robots, "/private/account"), false);
  assert.equal(robotsAllows(robots, "/private/public/catalog"), true);
  assert.equal(robotsAllows(robots, "/catalog"), true);
});
