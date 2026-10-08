const STOP_WORDS = new Set(["a", "an", "and", "at", "for", "from", "how", "in", "of", "on", "or", "the", "to", "what", "where", "with", "your"]);

export function normalizePhrase(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function phraseTokens(value: string) {
  return new Set(normalizePhrase(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token)));
}

function overlap(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const token of left) if (right.has(token)) matches++;
  return matches / Math.min(left.size, right.size);
}

export type HeuristicIntent = "informational" | "commercial" | "transactional" | "local";

export function classifyIntent(phrase: string, markets: string[] = []): HeuristicIntent {
  const text = normalizePhrase(phrase);
  const marketTokens = new Set(markets.flatMap((market) => [...phraseTokens(market)]));
  const tokens = phraseTokens(text);
  if (/\b(near me|nearby|in my area|local|open now)\b/.test(text) || [...tokens].some((token) => marketTokens.has(token))) return "local";
  if (/\b(buy|order|book|hire|quote|pricing|price|cost|shop|purchase|service|services)\b/.test(text)) return "transactional";
  if (/\b(best|top|review|reviews|vs|versus|compare|comparison|alternative)\b/.test(text)) return "commercial";
  return "informational";
}

export type TargetCandidate = { id: string; title: string; slug: string; targetType: "page" | "collection"; metaTitle?: string | null; metaDescription?: string | null; contentSummary?: string };

export function mapTarget(phrase: string, targets: TargetCandidate[]) {
  const phraseSet = phraseTokens(phrase);
  const ranked = targets.map((target) => {
    const headingTokens = phraseTokens([target.title, target.slug.replaceAll("-", " "), target.metaTitle || ""].join(" "));
    const contentTokens = phraseTokens([target.metaDescription || "", target.contentSummary || ""].join(" "));
    let phraseCoverage = 0;
    for (const token of phraseSet) if (headingTokens.has(token) || contentTokens.has(token)) phraseCoverage++;
    phraseCoverage = phraseSet.size ? phraseCoverage / phraseSet.size : 0;
    const match = phraseCoverage * 0.6 + overlap(phraseSet, headingTokens) * 0.35 + overlap(phraseSet, contentTokens) * 0.05;
    return { target, match };
  }).sort((a, b) => b.match - a.match || a.target.id.localeCompare(b.target.id));
  return { target: ranked[0]?.match >= 0.3 ? ranked[0].target : null, match: ranked[0]?.match || 0, ambiguous: ranked[1]?.match >= 0.75 && ranked[0].match - ranked[1].match < 0.1 };
}

export type HeuristicScoreInput = {
  phrase: string;
  profile: Record<string, unknown>;
  targetMatch: number;
  searchVolume: number | null;
  maxSearchVolume: number;
  keywordDifficulty: number | null;
  targetInventoryAvailable: boolean;
  cannibalization: boolean;
};

export function scoreOpportunity(input: HeuristicScoreInput) {
  const offerings = Array.isArray(input.profile.offerings) ? input.profile.offerings.filter((value): value is string => typeof value === "string") : [];
  const businessText = [String(input.profile.businessName || ""), String(input.profile.industry || ""), String(input.profile.description || ""), ...offerings].join(" ");
  const relevance = Math.round(30 * overlap(phraseTokens(input.phrase), phraseTokens(businessText)));
  const demand = input.searchVolume !== null && input.searchVolume > 0 && input.maxSearchVolume > 0
    ? Math.round(25 * Math.log1p(input.searchVolume) / Math.log1p(input.maxSearchVolume))
    : 0;
  const competition = input.keywordDifficulty !== null && input.keywordDifficulty >= 0 && input.keywordDifficulty <= 100
    ? Math.round(20 * (100 - input.keywordDifficulty) / 100)
    : 0;
  const goals = Array.isArray(input.profile.goals) ? input.profile.goals.join(" ").toLowerCase() : "";
  const intent = classifyIntent(input.phrase, Array.isArray(input.profile.markets) ? input.profile.markets.filter((x): x is string => typeof x === "string") : []);
  const goalFit = /order|sale|revenue|lead|book|enquir|conversion/.test(goals)
    ? intent === "transactional" || intent === "commercial" || intent === "local" ? 15 : 5
    : intent === "informational" || intent === "commercial" ? 12 : 8;
  const implementation = input.targetMatch >= 0.2 ? 10 : 4;
  const score = relevance + demand + competition + goalFit + implementation;
  const evidenceCoverage = 25 + (input.searchVolume !== null ? 25 : 0) + (input.keywordDifficulty !== null ? 25 : 0) + (input.targetInventoryAvailable ? 25 : 0);
  return {
    intent,
    score,
    evidenceCoverage,
    breakdown: { businessRelevance: relevance, searchDemand: demand, competitiveOpportunity: competition, goalFit, implementationFit: implementation },
    cannibalization: input.cannibalization,
    autopilotEligible: score >= 70 && relevance >= 20 && evidenceCoverage === 100 && !input.cannibalization,
    competitionLabel: input.keywordDifficulty === null ? "unknown" : input.keywordDifficulty <= 30 ? "low" : input.keywordDifficulty <= 60 ? "medium" : "high",
  };
}

export function hasCannibalization(phrase: string, targets: TargetCandidate[]) {
  const matches = targets.filter((target) => overlap(phraseTokens(phrase), phraseTokens(`${target.title} ${target.slug.replaceAll("-", " ")}`)) >= 0.5);
  return matches.length > 1;
}

const TARGETS: Record<string, { location: number; countryCode: string; languages: Record<string, string> }> = {
  australia: { location: 2036, countryCode: "aus", languages: { english: "en", en: "en" } },
  canada: { location: 2124, countryCode: "can", languages: { english: "en", en: "en", french: "fr", fr: "fr" } },
  france: { location: 2250, countryCode: "fra", languages: { french: "fr", fr: "fr" } },
  germany: { location: 2276, countryCode: "deu", languages: { german: "de", de: "de" } },
  india: { location: 2356, countryCode: "ind", languages: { english: "en", en: "en", hindi: "hi", hi: "hi" } },
  japan: { location: 2392, countryCode: "jpn", languages: { japanese: "ja", ja: "ja" } },
  singapore: { location: 2702, countryCode: "sgp", languages: { english: "en", en: "en" } },
  "united arab emirates": { location: 2784, countryCode: "are", languages: { english: "en", en: "en", arabic: "ar", ar: "ar" } },
  "united kingdom": { location: 2826, countryCode: "gbr", languages: { english: "en", en: "en" } },
  "united states": { location: 2840, countryCode: "usa", languages: { english: "en", en: "en" } },
};

export function resolveResearchLocale(markets: string[], languages: string[]) {
  const market = markets.map(normalizePhrase).flatMap((value) => Object.keys(TARGETS).filter((country) => value === country || value.endsWith(` ${country}`)))[0];
  if (!market) return null;
  const target = TARGETS[market];
  const language = languages.map(normalizePhrase).find((value) => target.languages[value]);
  const languageCode = language ? target.languages[language] : Object.values(target.languages)[0];
  return { market, countryCode: target.countryCode, locationCode: target.location, languageCode };
}
