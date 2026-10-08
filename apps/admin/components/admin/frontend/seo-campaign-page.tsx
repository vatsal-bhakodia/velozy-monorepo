"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, LoaderCircle, Plus, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageFrame, SectionCard } from "@/components/admin/frontend/page-frame";
import { countries } from "@/src/lib/countries";
import { useAdmin } from "@/src/admin-context";
import { apiFetch } from "@/src/lib/api";

type Profile = {
  businessName: string;
  industry: string;
  description: string;
  offerings: string[];
  markets: string[];
  languages: string[];
  goals: string[];
  audience: string;
  tone: string;
  restrictions: string[];
};
type Campaign = {
  id: string;
  status: string;
  profile: Profile | Record<string, never>;
  profileConfirmedAt: string | null;
  autopilotEnabled: boolean;
  settings: Record<string, boolean | number>;
};
type Candidate = { id: string; domain: string; classification: string; status: string; evidence?: { source?: string; intersections?: number | null } };
type Job = { id: string; kind: string; status: string; progress: number; lastError?: string | null; createdAt: string };
type Opportunity = {
  id: string;
  researchRunId: string | null;
  cluster: string;
  intent: string;
  targetType: "page" | "collection" | "blog";
  targetId: string | null;
  targetPath: string | null;
  action: string;
  status: string;
  keywords: string[];
  rationale: string;
  confidence: string;
  score: number | null;
  scoreBreakdown: Record<string, number>;
  evidenceCoverage: number | null;
  autopilotEligible: boolean;
  approvedAt: string | null;
  metrics: { searchVolume?: number | null; searchImpressions28d?: number | null; clicks28d?: number | null; keywordDifficulty?: number | null; searchDemandSource?: string | null; source?: string; locale?: { market: string; languageCode: string } | null };
  draft?: { title?: string; metaTitle?: string; metaDescription?: string; excerpt?: string; content?: string; bodyHtml?: string; imageUrl?: string; imageAlt?: string; automationNote?: string } | null;
};
type Publication = { id: string; targetType: string; targetId: string; publishedAt: string; rollbackOf: string | null };
type ResearchRun = { id: string; version: number; status: string; createdAt: string; completedAt: string | null; result?: { opportunityCount?: number; competitorCount?: number; keywordMetricCount?: number; keywordMetricStatus?: string; competitorDiscovery?: { count?: number; status?: string; warning?: string }; warning?: string | null } | null; lastError?: string | null };
type CampaignResponse = {
  campaign: Campaign;
  suggestedProfile: Profile;
  domains: Array<{ hostname: string; isVerified: boolean }>;
  competitors: Candidate[];
  jobs: Job[];
  opportunities: Opportunity[];
  researchRuns: ResearchRun[];
};

const emptyProfile: Profile = {
  businessName: "", industry: "", description: "", offerings: [], markets: [], languages: [], goals: [], audience: "", tone: "", restrictions: [],
};
const industryChoices = ["Retail & ecommerce", "Jewellery", "Fashion & apparel", "Food & beverage", "Health & wellness", "Professional services", "Home & interior", "Travel & hospitality", "Education", "Technology & SaaS", "Beauty & cosmetics", "Nonprofit", "Other"];
const languageChoices = ["Arabic", "English", "French", "German", "Hindi", "Japanese", "Mandarin", "Portuguese", "Spanish"];
const goalChoices = ["Increase sales", "Generate leads", "Get more bookings", "Build brand awareness", "Educate customers", "Grow organic traffic", "Promote products or services"];
const toneChoices = ["Professional", "Friendly", "Expert", "Premium", "Approachable", "Playful", "Minimal"];
const listValue = (items: string[]) => items.join("\n");
const parseList = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
const addChoice = (items: string[], choice: string) => items.some((item) => item.toLowerCase() === choice.toLowerCase()) ? items : [...items, choice];

async function responseBody(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.message || "Request failed");
  return body;
}

export default function SeoCampaignPage() {
  const { selectedProjectId, projects } = useAdmin();
  const project = projects.find((item) => item.id === selectedProjectId);
  const [data, setData] = useState<CampaignResponse | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [autopilotConfirmed, setAutopilotConfirmed] = useState(false);
  const [blogTimes, setBlogTimes] = useState<Record<string, string>>({});
  const [publications, setPublications] = useState<Publication[]>([]);
  const [settings, setSettings] = useState({ pagePublishing: false, categoryPublishing: false, blogScheduling: false, maxPagesPerMonth: 2, maxBlogsPerMonth: 4, blogScheduleDays: 7 });
  const industryOptions = profile.industry && !industryChoices.includes(profile.industry) ? [...industryChoices, profile.industry] : industryChoices;
  const toneOptions = profile.tone && !toneChoices.includes(profile.tone) ? [...toneChoices, profile.tone] : toneChoices;

  const refresh = useCallback(async () => {
    if (!selectedProjectId) { setData(null); setLoading(false); return; }
    try {
      const [campaignResponse, publicationResponse] = await Promise.all([
        apiFetch(`/api/admin/seo/campaign?projectId=${encodeURIComponent(selectedProjectId)}`, { cache: "no-store" }),
        apiFetch(`/api/admin/seo/campaign/publications?projectId=${encodeURIComponent(selectedProjectId)}`, { cache: "no-store" }),
      ]);
      const body = await responseBody(campaignResponse) as CampaignResponse;
      const publicationBody = await responseBody(publicationResponse);
      setData(body);
      setPublications(publicationBody.publications || []);
      const saved = body.campaign.profile as Profile;
      setProfile(body.campaign.profileConfirmedAt ? saved : body.suggestedProfile);
      const storedSettings = body.campaign.settings || {};
      setSettings((current) => ({ ...current, ...storedSettings }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the SEO campaign");
    } finally { setLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { void refresh(); }, [refresh]);
  const hasLiveJob = useMemo(() => data?.jobs.some((job) => ["queued", "running"].includes(job.status)), [data?.jobs]);
  const rolledBackPublications = useMemo(() => new Set(publications.flatMap((item) => item.rollbackOf ? [item.rollbackOf] : [])), [publications]);
  useEffect(() => {
    if (!hasLiveJob) return;
    const timer = window.setInterval(() => void refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [hasLiveJob, refresh]);

  const withBusy = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try { await action(); await refresh(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not complete the action"); }
    finally { setBusy(""); }
  };

  const saveProfile = () => withBusy("profile", async () => {
    if (!selectedProjectId) return;
    await responseBody(await apiFetch("/api/admin/seo/campaign/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, profile }) }));
    toast.success("Business profile confirmed");
  });
  const addCompetitor = () => withBusy("competitor", async () => {
    if (!selectedProjectId || !competitorDomain.trim()) return;
    await responseBody(await apiFetch("/api/admin/seo/campaign/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, domain: competitorDomain }) }));
    setCompetitorDomain(""); toast.success("Competitor added for verification");
  });
  const setCompetitor = (candidate: Candidate, status: "approved" | "rejected") => withBusy(candidate.id, async () => {
    await responseBody(await apiFetch(`/api/admin/seo/campaign/competitors/${candidate.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, status }) }));
  });
  const startResearch = () => withBusy("research", async () => {
    await responseBody(await apiFetch("/api/admin/seo/campaign/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, idempotencyKey: crypto.randomUUID() }) }));
    toast.success("SEO research started");
  });
  const generateDraft = (opportunity: Opportunity) => withBusy(`generate:${opportunity.id}`, async () => {
    await responseBody(await apiFetch(`/api/admin/seo/campaign/opportunities/${opportunity.id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, idempotencyKey: crypto.randomUUID() }) }));
    toast.success("Content draft queued");
  });
  const approveOpportunity = (opportunity: Opportunity, status: "approved" | "rejected") => withBusy(`approval:${opportunity.id}`, async () => {
    await responseBody(await apiFetch(`/api/admin/seo/campaign/opportunities/${opportunity.id}/approval`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, status }) }));
    toast.success(status === "approved" ? "Roadmap item approved" : "Roadmap item approval removed");
  });
  const findImage = (opportunity: Opportunity) => withBusy(`image:${opportunity.id}`, async () => {
    await responseBody(await apiFetch(`/api/admin/seo/campaign/opportunities/${opportunity.id}/image`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, query: opportunity.cluster }) }));
    toast.success("Image processed and added to the media library");
  });
  const publish = (opportunity: Opportunity) => withBusy(`publish:${opportunity.id}`, async () => {
    const scheduleAt = blogTimes[opportunity.id] ? new Date(blogTimes[opportunity.id]).toISOString() : undefined;
    await responseBody(await apiFetch(`/api/admin/seo/campaign/opportunities/${opportunity.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, scheduleAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) }));
    toast.success(opportunity.targetType === "blog" ? "Blog scheduled" : "Content published");
  });
  const toggleAutopilot = (enabled: boolean) => withBusy("autopilot", async () => {
    if (enabled && !autopilotConfirmed) throw new Error("Confirm the publishing authorization first");
    await responseBody(await apiFetch("/api/admin/seo/campaign/autopilot", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, enabled, settings }) }));
    setAutopilotConfirmed(false);
    toast.success(enabled ? "Campaign autopilot enabled" : "Campaign paused");
  });
  const rollback = (publication: Publication) => withBusy(`rollback:${publication.id}`, async () => {
    await responseBody(await apiFetch(`/api/admin/seo/campaign/publications/${publication.id}/rollback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId }) }));
    toast.success("Content rolled back");
  });

  if (!selectedProjectId) return <PageFrame title="SEO Campaign" description="Choose a project to set up its SEO campaign."><p className="text-sm text-neutral-500">Select a project to continue.</p></PageFrame>;
  return <PageFrame title="SEO Campaign" description="Understand your business, verify competitors, find keyword opportunities, and publish useful on-page improvements.">
    <div className="space-y-6">
      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"><CircleAlert className="h-4 w-4" />{error}<Button variant="ghost" size="sm" onClick={() => void refresh()}>Retry</Button></div>}
      <SectionCard title="Business profile" description="Review the project details and confirm what the SEO campaign should target.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">Business name<Input value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm">Industry<Select value={profile.industry || undefined} onValueChange={(industry) => setProfile({ ...profile, industry })}><SelectTrigger><SelectValue placeholder="Choose an industry" /></SelectTrigger><SelectContent>{industryOptions.map((industry) => <SelectItem key={industry} value={industry}>{industry}</SelectItem>)}</SelectContent></Select></label>
          <label className="grid gap-1.5 text-sm md:col-span-2">What does the business offer?<Textarea rows={3} value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm">Products and services (one per line)<Textarea rows={3} value={listValue(profile.offerings)} onChange={(e) => setProfile({ ...profile, offerings: parseList(e.target.value) })} /></label>
          <div className="grid gap-1.5 text-sm"><span>Target markets (cities, regions, countries)</span><Select value="" onValueChange={(market) => setProfile({ ...profile, markets: addChoice(profile.markets, market) })}><SelectTrigger aria-label="Add a target country"><SelectValue placeholder="Select a country" /></SelectTrigger><SelectContent className="max-h-72">{countries.map(({ code, name, flag }) => <SelectItem key={code} value={name}><span className="flex items-center gap-2"><span aria-hidden="true" className="text-base leading-none">{flag}</span><span>{name}</span><span className="ml-auto text-xs text-muted-foreground">{code}</span></span></SelectItem>)}</SelectContent></Select><Textarea aria-label="Target markets" rows={2} placeholder="Add cities, regions, or other markets" value={listValue(profile.markets)} onChange={(e) => setProfile({ ...profile, markets: parseList(e.target.value) })} /></div>
          <div className="grid gap-1.5 text-sm"><span>Search languages</span><Select value="" onValueChange={(language) => setProfile({ ...profile, languages: addChoice(profile.languages, language) })}><SelectTrigger aria-label="Add a search language"><SelectValue placeholder="Add a language" /></SelectTrigger><SelectContent>{languageChoices.map((language) => <SelectItem key={language} value={language}>{language}</SelectItem>)}</SelectContent></Select><Input aria-label="Selected search languages" placeholder="English, Hindi, etc." value={listValue(profile.languages)} onChange={(e) => setProfile({ ...profile, languages: parseList(e.target.value) })} /></div>
          <div className="grid gap-1.5 text-sm"><span>Business goals</span><Select value="" onValueChange={(goal) => setProfile({ ...profile, goals: addChoice(profile.goals, goal) })}><SelectTrigger aria-label="Add a business goal"><SelectValue placeholder="Add a goal" /></SelectTrigger><SelectContent>{goalChoices.map((goal) => <SelectItem key={goal} value={goal}>{goal}</SelectItem>)}</SelectContent></Select><Input aria-label="Selected business goals" placeholder="Choose goals or enter your own" value={listValue(profile.goals)} onChange={(e) => setProfile({ ...profile, goals: parseList(e.target.value) })} /></div>
          <label className="grid gap-1.5 text-sm">Ideal customer<Input value={profile.audience} onChange={(e) => setProfile({ ...profile, audience: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm">Brand tone<Select value={profile.tone || undefined} onValueChange={(tone) => setProfile({ ...profile, tone })}><SelectTrigger><SelectValue placeholder="Choose a tone" /></SelectTrigger><SelectContent>{toneOptions.map((tone) => <SelectItem key={tone} value={tone}>{tone}</SelectItem>)}</SelectContent></Select></label>
          <label className="grid gap-1.5 text-sm">Claims or topics to avoid (one per line)<Textarea rows={2} value={listValue(profile.restrictions)} onChange={(e) => setProfile({ ...profile, restrictions: parseList(e.target.value) })} /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={() => void saveProfile()} disabled={busy === "profile" || loading}>{busy === "profile" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Confirm business profile</Button>{data?.campaign.profileConfirmedAt && <span className="text-sm text-emerald-700 dark:text-emerald-400">Confirmed</span>}</div>
      </SectionCard>

      <SectionCard title="Competitors" description="Research can suggest domains from your verified site and target market. Approve each domain before the campaign studies it, or add one yourself.">
        <div className="flex flex-col gap-2 sm:flex-row"><Input placeholder="competitor.example" value={competitorDomain} onChange={(e) => setCompetitorDomain(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addCompetitor(); } }} /><Button variant="outline" onClick={() => void addCompetitor()} disabled={!competitorDomain.trim() || busy === "competitor"}><Plus className="mr-2 h-4 w-4" />Add competitor</Button></div>
        <div className="mt-4 space-y-2">{(data?.competitors || []).length === 0 ? <p className="text-sm text-neutral-500">No competitors yet. Run research to discover candidates from a verified site domain, or add a domain.</p> : data?.competitors.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"><div><p className="font-medium">{item.domain}</p><p className="text-xs text-neutral-500">{item.classification.replaceAll("_", " ")} · {item.status}{item.evidence?.source === "dataforseo_competitor_domain" ? ` · ${item.evidence.intersections ?? "—"} shared ranking keywords (provider estimate)` : ""}</p></div>{item.status === "candidate" && <div className="flex gap-2"><Button size="sm" onClick={() => void setCompetitor(item, "approved")} disabled={busy === item.id}>Verify</Button><Button size="sm" variant="outline" onClick={() => void setCompetitor(item, "rejected")} disabled={busy === item.id}>Remove</Button></div>}</div>)}</div>
      </SectionCard>

      <SectionCard title="Research and roadmap" description="Research uses your confirmed profile, site content, and approved competitor sites. Search volume and keyword difficulty remain unknown until a data provider returns them.">
        <div className="mb-4 flex flex-wrap items-center gap-3"><Button onClick={() => void startResearch()} disabled={!data?.campaign.profileConfirmedAt || !!hasLiveJob || busy === "research"}><Sparkles className="mr-2 h-4 w-4" />Start SEO research</Button><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{loading && <LoaderCircle className="h-4 w-4 animate-spin text-neutral-400" />}</div>
        {data?.jobs.map((job) => <div key={job.id} className="mb-3 flex items-center gap-3 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800"><span className="capitalize">{job.kind}</span><span>{job.status}</span>{job.status === "running" && <span>{job.progress}%</span>}{job.lastError && <span className="text-red-700">{job.lastError}</span>}</div>)}
        {!!data?.researchRuns.length && <div className="mb-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"><h3 className="text-sm font-medium">Research history</h3><div className="mt-2 space-y-2">{data.researchRuns.map((run) => <div key={run.id} className="flex flex-wrap justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-300"><span>Run {run.version} · {run.status} · {new Date(run.createdAt).toLocaleString()}</span><span>{run.result?.opportunityCount ?? 0} opportunities · {run.result?.keywordMetricCount ?? 0} keyword metrics{run.result?.warning ? ` · ${run.result.warning}` : run.lastError ? ` · ${run.lastError}` : ""}</span></div>)}</div></div>}
        <div className="space-y-3">{(data?.opportunities || []).length === 0 ? <p className="text-sm text-neutral-500">Confirm your business profile and run research to build an opportunity list.</p> : data?.opportunities.map((item) => <article key={item.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.cluster}</h3><p className="mt-1 text-xs capitalize text-neutral-500">{item.intent} · {item.targetType} · {item.action.replaceAll("_", " ")} · {item.status} · research run {data.researchRuns.find((run) => run.id === item.researchRunId)?.version ?? "legacy"}</p></div><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">{item.confidence} confidence · {item.score ?? "—"}/100 · {item.evidenceCoverage ?? 0}% evidence</span></div><p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{item.rationale}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500"><span>Search volume: {item.metrics?.searchVolume ?? "Unknown"}</span><span>Search Console impressions: {item.metrics?.searchImpressions28d ?? "Unknown"}</span><span>Keyword difficulty: {item.metrics?.keywordDifficulty ?? "Unknown"}</span><span>Competition: {item.metrics?.keywordDifficulty == null ? "Unmeasured" : item.metrics.keywordDifficulty <= 30 ? "Low (provider measured)" : item.metrics.keywordDifficulty <= 60 ? "Medium (provider measured)" : "High (provider measured)"}</span></div>{item.scoreBreakdown && <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">{Object.entries(item.scoreBreakdown).map(([key, value]) => <span key={key}>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} {value}</span>)}</div>}{item.keywords?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs dark:border-neutral-700">{keyword}</span>)}</div>}
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant={item.approvedAt ? "outline" : "default"} onClick={() => void approveOpportunity(item, item.approvedAt ? "rejected" : "approved")} disabled={!project?.access?.isOwner || busy === `approval:${item.id}`}>{item.approvedAt ? "Remove approval" : "Approve roadmap item"}</Button>{item.approvedAt && <span className="self-center text-xs text-emerald-700 dark:text-emerald-400">Owner approved{item.autopilotEligible ? " · autopilot eligible" : " · manual review only"}</span>}</div>
          {item.draft ? <div className="mt-4 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800"><p className="font-medium">{item.draft.title}</p><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.draft.metaDescription}</p>{item.draft.automationNote && <p role="status" className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Autopilot note: {item.draft.automationNote}</p>}<p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-sm">{item.draft.content || ""}</p>{item.draft.imageUrl && <img className="mt-3 max-h-48 rounded-lg object-cover" src={item.draft.imageUrl} alt={item.draft.imageAlt || "Campaign image"} />}<Button className="mt-3" size="sm" variant="outline" onClick={() => void findImage(item)} disabled={busy === `image:${item.id}`}>Find and process Pexels image</Button>{item.targetType === "blog" && <label className="mt-3 grid max-w-sm gap-1 text-sm">Schedule blog publication<Input type="datetime-local" value={blogTimes[item.id] || ""} onChange={(e) => setBlogTimes({ ...blogTimes, [item.id]: e.target.value })} /> </label>}<Button className="mt-3" size="sm" onClick={() => void publish(item)} disabled={busy === `publish:${item.id}` || ["published", "scheduled", "publishing"].includes(item.status) || (item.targetType === "blog" && !blogTimes[item.id])}>{item.targetType === "blog" ? "Schedule blog" : "Publish content"}</Button></div> : <Button className="mt-3" size="sm" variant="outline" onClick={() => void generateDraft(item)} disabled={busy === `generate:${item.id}` || ["published", "scheduled", "publishing"].includes(item.status)}><Sparkles className="mr-2 h-4 w-4" />Generate draft</Button>}
        </article>)}</div>
      </SectionCard>

      <SectionCard title="Autopilot" description="Owner authorization is required. Page/category updates publish within the selected scope; blogs are scheduled for the approved cadence.">
        <div className="grid gap-3 text-sm sm:grid-cols-2">{(["pagePublishing", "categoryPublishing", "blogScheduling"] as const).map((key) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} /><span>{key === "pagePublishing" ? "Publish page updates" : key === "categoryPublishing" ? "Publish product category updates" : "Schedule blog publishing"}</span></label>)}</div>
        <label className="mt-3 grid max-w-xs gap-1 text-sm">Schedule blogs this many days ahead<Input type="number" min={1} max={90} value={settings.blogScheduleDays} onChange={(e) => setSettings({ ...settings, blogScheduleDays: Number(e.target.value) })} /></label>
        <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Page and category updates per month<Input type="number" min={0} max={100} value={settings.maxPagesPerMonth} onChange={(e) => setSettings({ ...settings, maxPagesPerMonth: Number(e.target.value) })} /></label><label className="grid gap-1 text-sm">Blog schedules per month<Input type="number" min={0} max={100} value={settings.maxBlogsPerMonth} onChange={(e) => setSettings({ ...settings, maxBlogsPerMonth: Number(e.target.value) })} /></label></div>
        {!data?.campaign.autopilotEnabled && <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={autopilotConfirmed} onChange={(e) => setAutopilotConfirmed(e.target.checked)} /><span>I authorize this campaign to publish within these settings. I can pause it at any time.</span></label>}
        <Button className="mt-4" variant={data?.campaign.autopilotEnabled ? "outline" : "default"} onClick={() => void toggleAutopilot(!data?.campaign.autopilotEnabled)} disabled={busy === "autopilot" || (!data?.campaign.autopilotEnabled && !project?.access?.isOwner)}>{data?.campaign.autopilotEnabled ? "Pause autopilot" : "Enable autopilot"}</Button>{!project?.access?.isOwner && <p className="mt-2 text-xs text-neutral-500">Only the project owner can enable autopilot.</p>}
      </SectionCard>

      <SectionCard title="Publication history" description="Published changes can be rolled back to their saved before-state.">
        {(publications || []).filter((item) => !item.rollbackOf).length ? <div className="space-y-2">{publications.filter((item) => !item.rollbackOf).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700"><span className="capitalize">{item.targetType} · {new Date(item.publishedAt).toLocaleString()}{rolledBackPublications.has(item.id) ? " · rolled back" : ""}</span><Button size="sm" variant="outline" onClick={() => void rollback(item)} disabled={busy === `rollback:${item.id}` || rolledBackPublications.has(item.id)}>{rolledBackPublications.has(item.id) ? "Rolled back" : "Rollback"}</Button></div>)}</div> : <p className="text-sm text-neutral-500">No campaign publications yet.</p>}
      </SectionCard>
    </div>
  </PageFrame>;
}
