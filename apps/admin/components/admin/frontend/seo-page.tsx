"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  WandSparkles,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { apiFetch } from "@/src/lib/api";
import RecordTable, {
  type RecordFilter,
} from "@/components/admin/manage/record-table";
import type { DataTableColumn } from "@/components/admin/manage/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatStrip } from "./page-frame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TargetType = "page" | "product" | "collection" | "blog";
type SeoRecord = {
  id: string;
  type: TargetType;
  title: string;
  slug: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
  editPath: string;
};
type Finding = {
  targetType: TargetType;
  targetId: string;
  title: string;
  slug: string;
  rule: string;
  field: string;
  severity: "high" | "medium" | "low";
  message: string;
  editPath: string;
  id?: string;
};
type Audit = {
  id: string;
  score: number | null;
  findings: Finding[];
  createdAt: string;
};
const auditDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
function formatAuditDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : auditDateFormatter.format(date);
}
type SeoResponse = {
  records: SeoRecord[];
  summary: { total: number; missingTitles: number; issues: number };
};
type SearchRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
type Suggestion = {
  id: string;
  targetType: TargetType;
  targetId: string;
  field: string;
  beforeValue: string | null;
  afterValue: string;
  rationale: string;
  status: string;
  createdAt: string;
};
type Competitor = {
  domain: string;
  rank: number;
  commonKeywords: number;
  organicKeywords: number;
  backlinks: number;
  referringDomains: number;
  id: string;
};
type SerpResult = {
  position: number;
  domain: string;
  title: string;
  url: string;
  id: string;
};
type SeoDomainRating = {
  configured: boolean;
  domain: string;
  rating: number | null;
  checkedAt?: string;
};
type SeoFieldData = {
  configured: boolean;
  domain: string;
  fieldData: {
    available: boolean;
    record?: { metrics?: Record<string, { percentiles?: { p75?: number } }> };
  } | null;
};

export function useSeoData() {
  const { selectedProjectId } = useAdmin();
  const [records, setRecords] = useState<SeoRecord[]>([]);
  const [summary, setSummary] = useState<SeoResponse["summary"]>({
    total: 0,
    missingTitles: 0,
    issues: 0,
  });
  const [audits, setAudits] = useState<Audit[]>([]);
  const [searchRows, setSearchRows] = useState<SearchRow[]>([]);
  const [searchConnected, setSearchConnected] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(0);
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!selectedProjectId) {
      setRecords([]);
      setSummary({ total: 0, missingTitles: 0, issues: 0 });
      setAudits([]);
      setSearchRows([]);
      setSearchConnected(false);
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        recordResponse,
        auditResponse,
        searchResponse,
        suggestionResponse,
      ] = await Promise.all([
        apiFetch(
          `/api/admin/seo/records?projectId=${encodeURIComponent(selectedProjectId)}`,
          { cache: "no-store" },
        ),
        apiFetch(
          `/api/admin/seo/audits?projectId=${encodeURIComponent(selectedProjectId)}`,
          { cache: "no-store" },
        ),
        apiFetch(
          `/api/admin/seo/search-performance?projectId=${encodeURIComponent(selectedProjectId)}`,
          { cache: "no-store" },
        ),
        apiFetch(
          `/api/admin/seo/ai/suggestions?projectId=${encodeURIComponent(selectedProjectId)}`,
          { cache: "no-store" },
        ),
      ]);
      if (
        !recordResponse.ok ||
        !auditResponse.ok ||
        !searchResponse.ok ||
        !suggestionResponse.ok
      )
        throw new Error("Could not load SEO data");
      const recordBody = (await recordResponse.json()) as SeoResponse;
      const auditBody = (await auditResponse.json()) as { audits: Audit[] };
      const searchBody = (await searchResponse.json()) as {
        connected: boolean;
        rows: SearchRow[];
      };
      const suggestionBody = (await suggestionResponse.json()) as {
        suggestions: Suggestion[];
      };
      if (sequence !== requestSequence.current) return;
      setRecords(recordBody.records ?? []);
      setSummary(
        recordBody.summary ?? { total: 0, missingTitles: 0, issues: 0 },
      );
      setAudits(auditBody.audits ?? []);
      setSearchConnected(searchBody.connected);
      setSearchRows(searchBody.rows ?? []);
      setSuggestions(suggestionBody.suggestions ?? []);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      console.error("Failed to load SEO data", error);
      toast.error("Could not load SEO data");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [selectedProjectId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return {
    selectedProjectId,
    records,
    summary,
    audits,
    searchRows,
    searchConnected,
    suggestions,
    loading,
    refresh,
    setAudits,
    setSuggestions,
  };
}

export type SeoWorkspaceData = ReturnType<typeof useSeoData>;

export function SeoOverviewPage({ data }: { data: SeoWorkspaceData }) {
  const { records, summary, audits, loading, searchRows, searchConnected } =
    data;
  const latest = audits[0];
  const counts = useMemo(
    () => ({
      pages: records.filter((record) => record.type === "page").length,
      products: records.filter((record) => record.type === "product").length,
      collections: records.filter((record) => record.type === "collection")
        .length,
      blogs: records.filter((record) => record.type === "blog").length,
    }),
    [records],
  );
  const clicks = searchRows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = searchRows.reduce((sum, row) => sum + row.impressions, 0);
  const avgPosition = impressions
    ? searchRows.reduce((sum, row) => sum + row.position * row.impressions, 0) /
      impressions
    : 0;
  const [domainRating, setDomainRating] = useState<SeoDomainRating | null>(
    null,
  );
  const [fieldData, setFieldData] = useState<SeoFieldData | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteCheckLoading, setSiteCheckLoading] = useState<
    "pagespeed" | "inspect" | null
  >(null);
  const [pageSpeedResult, setPageSpeedResult] = useState<any>(null);
  const [inspectionResult, setInspectionResult] = useState<any>(null);
  const [siteMetricsError, setSiteMetricsError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setPageSpeedResult(null);
    setInspectionResult(null);
    setSiteMetricsError(null);
    if (!data.selectedProjectId) {
      setDomainRating(null);
      setFieldData(null);
      return;
    }
    const projectId = encodeURIComponent(data.selectedProjectId);
    void Promise.all([
      apiFetch(`/api/admin/seo/domain-rating?projectId=${projectId}`, {
        cache: "no-store",
      }),
      apiFetch(`/api/admin/seo/site-health?projectId=${projectId}`, {
        cache: "no-store",
      }),
    ])
      .then(async ([dr, crux]) => {
        if (!dr.ok || !crux.ok)
          throw new Error(
            dr.status === 409 || crux.status === 409
              ? "Add and verify the site's domain to load SEO site metrics."
              : "Could not load SEO site metrics.",
          );
        const [drBody, cruxBody] = await Promise.all([dr.json(), crux.json()]);
        if (!active) return;
        setDomainRating(drBody as SeoDomainRating);
        setFieldData(cruxBody as SeoFieldData);
        setSiteUrl(`https://${drBody.domain}/`);
      })
      .catch((error) => {
        if (active) {
          setSiteMetricsError(
            error instanceof Error
              ? error.message
              : "Could not load SEO site metrics.",
          );
          console.error("Failed to load SEO site metrics", error);
        }
      });
    return () => {
      active = false;
    };
  }, [data.selectedProjectId]);
  const runSiteCheck = async (kind: "pagespeed" | "inspect") => {
    if (!data.selectedProjectId || siteCheckLoading || !siteUrl.trim()) return;
    setSiteCheckLoading(kind);
    if (kind === "pagespeed") setPageSpeedResult(null);
    else setInspectionResult(null);
    try {
      const response = await apiFetch(
        `/api/admin/seo/site-health/${kind === "pagespeed" ? "pagespeed" : "inspect"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: data.selectedProjectId,
            url: siteUrl.trim(),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Site check failed");
      if (kind === "pagespeed") setPageSpeedResult(body);
      else setInspectionResult(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Site check failed");
    } finally {
      setSiteCheckLoading(null);
    }
  };
  return (
    <div className="space-y-4">
      <StatStrip
        items={[
          {
            label: "Content records",
            value: loading ? "—" : String(summary.total),
            note: `${counts.pages} pages · ${counts.products} products · ${counts.collections} collections · ${counts.blogs} blogs`,
            icon: FileText,
            iconColor: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Missing SEO titles",
            value: loading ? "—" : String(summary.missingTitles),
            note: "Across all content types",
            icon: Search,
            iconColor: "text-amber-600 dark:text-amber-400",
            noteTone: summary.missingTitles > 0 ? "review" : "positive",
          },
          {
            label: "Latest audit score",
            value: latest?.score == null ? "—" : `${latest.score}%`,
            note: latest
              ? formatAuditDate(latest.createdAt)
              : "No audit runs yet",
            icon: CheckCircle2,
            iconColor: "text-green-600 dark:text-green-400",
          },
          {
            label: "Latest audit issues",
            value: latest ? String(latest.findings.length) : "—",
            note: latest
              ? "Open audit findings to review"
              : "Run an audit to establish a baseline",
            icon: AlertTriangle,
            iconColor: "text-orange-600 dark:text-orange-400",
            noteTone: latest?.findings.length ? "review" : "neutral",
          },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                Organic search performance
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Last 28 available days · Google Search Console
              </p>
            </div>
            </div>
          {searchConnected ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Clicks", value: clicks.toLocaleString() },
                { label: "Impressions", value: impressions.toLocaleString() },
                {
                  label: "Avg. CTR",
                  value: impressions
                    ? `${((clicks / impressions) * 100).toFixed(1)}%`
                    : "—",
                },
                {
                  label: "Avg. position",
                  value: impressions ? avgPosition.toFixed(1) : "—",
                },
              ].map((item) => (
                <div key={item.label} className="border-t border-neutral-100 py-3 first:border-0 dark:border-neutral-800 sm:border-t-0 sm:py-0">
                  <p className="text-xs text-neutral-500">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              Connect Search Console in Growth → Connections to see clicks,
              impressions, and query positions.
            </p>
          )}
        </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">
              Domain & page health
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Domain rating and real-user Core Web Vitals for your verified site.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 border-y border-neutral-100 py-3 dark:border-neutral-800 sm:grid-cols-4">
          <div className="py-2 sm:px-3 sm:first:pl-0"><dt className="text-xs text-neutral-500">Ahrefs domain rating</dt><dd className="mt-1 text-lg font-medium tabular-nums">{domainRating?.rating ?? "—"}</dd></div>
          {[
            ["Largest contentful paint", "largest_contentful_paint", 1000, "ms"],
            ["Interaction to next paint", "interaction_to_next_paint", 1000, "ms"],
            ["Cumulative layout shift", "cumulative_layout_shift", 1, ""],
          ].map(([label, key, divisor, suffix]) => {
            const value = fieldData?.fieldData?.record?.metrics?.[String(key)]?.percentiles?.p75;
            return <div key={String(key)} className="py-2 sm:px-3"><dt className="text-xs text-neutral-500">{label === "Largest contentful paint" ? "LCP" : label === "Interaction to next paint" ? "INP" : "CLS"}</dt><dd className="mt-1 text-lg font-medium tabular-nums">{value == null ? "—" : `${(value / Number(divisor)).toFixed(2)}${suffix}`}</dd></div>;
          })}
        </dl>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {!domainRating?.configured && <span>Domain rating is not available yet.</span>}
          {!fieldData?.configured && <span>Core Web Vitals are not available yet.</span>}
          {fieldData?.configured && !fieldData.fieldData?.available && <span>Chrome has no field data for this site yet.</span>}
          {siteMetricsError && <span className="text-red-600 dark:text-red-400">{siteMetricsError}</span>}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={siteUrl}
            onChange={(event) => setSiteUrl(event.target.value)}
            maxLength={2048}
            aria-label="Page URL"
            placeholder="https://example.com/page"
            className="h-10 min-w-64 flex-1"
          />
          <Button
            variant="outline"
            disabled={
              !data.selectedProjectId ||
              !fieldData?.configured ||
              !!siteCheckLoading ||
              !siteUrl.trim()
            }
            onClick={() => void runSiteCheck("pagespeed")}
          >
            {siteCheckLoading === "pagespeed"
              ? "Running…"
              : "Run PageSpeed lab audit"}
          </Button>
          <Button
            variant="outline"
            disabled={
              !data.selectedProjectId ||
              !!siteCheckLoading ||
              !siteUrl.trim() ||
              !data.searchConnected
            }
            onClick={() => void runSiteCheck("inspect")}
          >
            {siteCheckLoading === "inspect"
              ? "Checking…"
              : "Check Google index"}
          </Button>
        </div>
        {(pageSpeedResult || inspectionResult) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pageSpeedResult && (
              <div className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-700">
                <p className="font-medium">PageSpeed · Lighthouse lab data</p>
                <p className="mt-1 text-neutral-500">
                  Performance {pageSpeedResult.scores?.performance ?? "—"} · SEO{" "}
                  {pageSpeedResult.scores?.seo ?? "—"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Lab results simulate a visit and are separate from real-user
                  field data.
                </p>
                {pageSpeedResult.audits?.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                    {pageSpeedResult.audits.slice(0, 5).map((audit: any) => (
                      <li key={audit.id}>
                        <p className="font-medium">{audit.title}</p>
                        {audit.displayValue && (
                          <p className="text-xs text-neutral-500">
                            {audit.displayValue}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {inspectionResult && (
              <div className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-700">
                <p className="font-medium">Google index status</p>
                <p className="mt-1 text-neutral-500">
                  {inspectionResult.result?.indexStatusResult?.verdict ??
                    "No index result"}{" "}
                  ·{" "}
                  {inspectionResult.result?.indexStatusResult?.coverageState ??
                    ""}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      </div>
      <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="text-base font-semibold">Audit history</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Recent technical and on-page checks across pages, products,
          collections, and blog posts.
        </p>
        {audits.length ? (
          <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {audits.slice(0, 5).map((audit) => (
              <div
                key={audit.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <span>{formatAuditDate(audit.createdAt)}</span>
                <span className="text-neutral-500">
                  {audit.score ?? "—"}% score · {audit.findings.length} findings
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            Run a Site Audit to create a baseline.
          </p>
        )}
      </section>
    </div>
  );
}

export function SeoAuditPage({ data }: { data: SeoWorkspaceData }) {
  const { selectedProjectId, records, audits, loading, setAudits } = data;
  const [running, setRunning] = useState(false);
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const activeAudit =
    audits.find((audit) => audit.id === activeAuditId) ?? audits[0];
  const findings = (activeAudit?.findings ?? []).map((finding, index) => ({
    ...finding,
    id: `${finding.targetId}:${finding.rule}:${index}`,
  }));
  const runAudit = useCallback(async () => {
    if (!selectedProjectId || running) return;
    setRunning(true);
    try {
      const response = await apiFetch("/api/admin/seo/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (!response.ok) throw new Error("Audit failed");
      const body = (await response.json()) as { audit: Audit };
      setAudits((current) => [
        body.audit,
        ...current.filter((audit) => audit.id !== body.audit.id),
      ]);
      setActiveAuditId(body.audit.id);
      toast.success(
        `Audit complete: ${body.audit.findings.length} issue${body.audit.findings.length === 1 ? "" : "s"} found`,
      );
    } catch (error) {
      console.error("Failed to run SEO audit", error);
      toast.error("Could not run SEO audit");
    } finally {
      setRunning(false);
    }
  }, [running, selectedProjectId, setAudits]);
  const columns: DataTableColumn<Finding & { id: string }>[] = [
    {
      header: "Finding",
      accessor: "message",
      render: (item) => (
        <div>
          <div className="font-medium">{item.message}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {item.title} · /{item.slug}
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "targetType",
      render: (item) => <span className="capitalize">{item.targetType}</span>,
    },
    { header: "Field", accessor: "field" },
    {
      header: "Severity",
      accessor: "severity",
      render: (item) => (
        <span
          className={`capitalize ${item.severity === "high" ? "text-red-700 dark:text-red-300" : item.severity === "medium" ? "text-amber-700 dark:text-amber-300" : "text-neutral-500"}`}
        >
          {item.severity}
        </span>
      ),
    },
  ];
  const filters: RecordFilter<Finding & { id: string }>[] = [
    {
      key: "targetType",
      label: "Content type",
      type: "select",
      options: ["page", "product", "collection", "blog"].map((value) => ({
        label: value[0].toUpperCase() + value.slice(1),
        value,
      })),
    },
    {
      key: "severity",
      label: "Severity",
      type: "select",
      options: ["high", "medium", "low"].map((value) => ({
        label: value[0].toUpperCase() + value.slice(1),
        value,
      })),
    },
    { key: "message", label: "Finding", placeholder: "Search findings..." },
  ];
  useEffect(() => {
    if (activeAuditId && !audits.some((audit) => audit.id === activeAuditId))
      setActiveAuditId(null);
  }, [activeAuditId, audits]);
  return (
    <RecordTable
      contained
      title="Audit findings"
      description="Open the content editor from a finding to resolve the issue."
      headerAside={
        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 text-right">
          <div className="space-y-1">
            {activeAudit ? (
              <>
                <time
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-200"
                  dateTime={activeAudit.createdAt}
                >
                  {formatAuditDate(activeAudit.createdAt)}
                </time>
                <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  Score {activeAudit.score ?? "—"}% · {activeAudit.findings.length} findings
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  No audit has been run
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {records.length} records are ready to check.
                </p>
              </>
            )}
          </div>
          {audits.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              Audit history
              <select
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                value={activeAudit?.id ?? ""}
                onChange={(event) => setActiveAuditId(event.target.value)}
              >
                {audits.map((audit) => (
                  <option key={audit.id} value={audit.id}>
                    {formatAuditDate(audit.createdAt)} · {audit.findings.length} issues
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      }
      trailingActions={
        <Button
          onClick={() => void runAudit()}
          disabled={!selectedProjectId || running || loading}
          className="h-9 rounded-md border-0 bg-neutral-900 px-4 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {running ? "Running…" : "Run audit"}
        </Button>
      }
      data={findings}
      columns={columns}
      loading={loading || running}
      filters={filters}
      exportName="seo-audit-findings"
      emptyState={{
        icon: CheckCircle2,
        message: activeAudit ? "No issues found" : "Run your first audit",
        description: activeAudit
          ? "This audit found no issues in the checked fields."
          : "Audits inspect all project content and preserve each result for review.",
      }}
      actions={{
        primary: {
          label: "Open content",
          onClick: (finding) => {
            window.location.href = finding.editPath;
          },
        },
        menu: [],
      }}
    />
  );
}

export default SeoOverviewPage;

export function SeoKeywordPage({ data }: { data: SeoWorkspaceData }) {
  const [serpKeyword, setSerpKeyword] = useState("");
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpRows, setSerpRows] = useState<SerpResult[]>([]);
  const [serpCost, setSerpCost] = useState<number | null>(null);
  const [serpTaskId, setSerpTaskId] = useState<string | null>(null);
  const [serpPending, setSerpPending] = useState(false);
  const [serpRequestId, setSerpRequestId] = useState<string | null>(null);
  const [serpRequestKeyword, setSerpRequestKeyword] = useState("");
  const taskStorageKey = (projectId: string) => `seo:serp-task:${projectId}`;
  const requestStorageKey = (projectId: string) =>
    `seo:serp-submit:${projectId}`;
  const updateSerpTask = async (id: string) => {
    if (!data.selectedProjectId) return false;
    const response = await apiFetch(
      `/api/admin/seo/serps/${encodeURIComponent(id)}?projectId=${encodeURIComponent(data.selectedProjectId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("Could not check SERP task status");
    const body = (await response.json()) as {
      task: {
        status: string;
        result?: Omit<SerpResult, "id">[] | null;
        costUsd?: string | number | null;
      };
    };
    if (body.task.status === "completed") {
      setSerpPending(false);
      localStorage.removeItem(taskStorageKey(data.selectedProjectId));
      setSerpCost(body.task.costUsd == null ? null : Number(body.task.costUsd));
      setSerpRows(
        (body.task.result ?? []).map((row) => ({
          ...row,
          id: `${row.position}:${row.url}`,
        })),
      );
      return true;
    }
    if (body.task.status === "failed" || body.task.status === "expired") {
      setSerpPending(false);
      localStorage.removeItem(taskStorageKey(data.selectedProjectId));
      throw new Error(
        body.task.status === "expired"
          ? "SERP task expired; submit the lookup again."
          : "SERP provider could not complete this lookup.",
      );
    }
    setSerpPending(true);
    return false;
  };
  useEffect(() => {
    setSerpRows([]);
    setSerpCost(null);
    setSerpTaskId(null);
    setSerpPending(false);
    setSerpRequestId(null);
    setSerpRequestKeyword("");
    if (!data.selectedProjectId) return;
    const savedRequest = localStorage.getItem(
      requestStorageKey(data.selectedProjectId),
    );
    if (savedRequest) {
      try {
        const request = JSON.parse(savedRequest) as {
          requestId: string;
          keyword: string;
        };
        if (request.requestId && request.keyword) {
          setSerpRequestId(request.requestId);
          setSerpRequestKeyword(request.keyword);
          setSerpKeyword(request.keyword);
        }
      } catch {
        localStorage.removeItem(requestStorageKey(data.selectedProjectId));
      }
    }
    const saved = localStorage.getItem(taskStorageKey(data.selectedProjectId));
    if (!saved) return;
    try {
      const task = JSON.parse(saved) as { id: string; keyword: string };
      if (!task.id || !task.keyword) throw new Error("Invalid saved SEO task");
      setSerpTaskId(task.id);
      setSerpKeyword(task.keyword);
      setSerpPending(true);
      void updateSerpTask(task.id).catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not restore SERP task",
        );
      });
    } catch {
      localStorage.removeItem(taskStorageKey(data.selectedProjectId));
    }
  }, [data.selectedProjectId]);
  const runSerp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data.selectedProjectId || !serpKeyword.trim() || serpLoading) return;
    setSerpLoading(true);
    setSerpRows([]);
    const keyword = serpKeyword.trim();
    const savedRequest = localStorage.getItem(
      requestStorageKey(data.selectedProjectId),
    );
    let requestId = serpRequestKeyword === keyword ? serpRequestId : null;
    if (!requestId && savedRequest) {
      try {
        const request = JSON.parse(savedRequest) as {
          requestId: string;
          keyword: string;
        };
        if (request.keyword === keyword) requestId = request.requestId;
      } catch {
        localStorage.removeItem(requestStorageKey(data.selectedProjectId));
      }
    }
    requestId ??= crypto.randomUUID();
    setSerpRequestId(requestId);
    setSerpRequestKeyword(keyword);
    localStorage.setItem(
      requestStorageKey(data.selectedProjectId),
      JSON.stringify({ requestId, keyword }),
    );
    try {
      const response = await apiFetch("/api/admin/seo/serps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: data.selectedProjectId,
          requestId,
          keyword,
        }),
      });
      if (!response.ok) {
        localStorage.removeItem(requestStorageKey(data.selectedProjectId));
        setSerpRequestId(null);
        setSerpRequestKeyword("");
        throw new Error("Could not load SERP results");
      }
      localStorage.removeItem(requestStorageKey(data.selectedProjectId));
      setSerpRequestId(null);
      setSerpRequestKeyword("");
      const body = (await response.json()) as {
        estimatedCostUsd?: number;
        task: {
          id: string;
          status: string;
          result?: Omit<SerpResult, "id">[] | null;
          costUsd?: string | number | null;
        };
      };
      setSerpTaskId(body.task.id);
      localStorage.setItem(
        taskStorageKey(data.selectedProjectId),
        JSON.stringify({ id: body.task.id, keyword: serpKeyword.trim() }),
      );
      if (body.estimatedCostUsd != null) setSerpCost(body.estimatedCostUsd);
      if (body.task.status === "completed") {
        localStorage.removeItem(taskStorageKey(data.selectedProjectId));
        setSerpRows(
          (body.task.result ?? []).map((row) => ({
            ...row,
            id: `${row.position}:${row.url}`,
          })),
        );
        setSerpCost(
          body.task.costUsd == null ? null : Number(body.task.costUsd),
        );
        setSerpPending(false);
      } else {
        setSerpPending(true);
        for (const delay of [2000, 4000, 8000, 15000, 30000]) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (await updateSerpTask(body.task.id)) break;
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load SERP results. Check the provider setup and monthly budget.",
      );
    } finally {
      setSerpLoading(false);
    }
  };
  const rows = data.searchRows.map((row) => ({ ...row, id: row.query }));
  const columns: DataTableColumn<SearchRow & { id: string }>[] = [
    {
      header: "Search query",
      accessor: "query",
      render: (row) => <span className="font-medium">{row.query}</span>,
    },
    { header: "Clicks", accessor: "clicks" },
    { header: "Impressions", accessor: "impressions" },
    {
      header: "CTR",
      accessor: "ctr",
      render: (row) => `${(row.ctr * 100).toFixed(1)}%`,
    },
    {
      header: "Avg. position",
      accessor: "position",
      render: (row) => row.position.toFixed(1),
    },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="text-base font-semibold">Keywords & SERPs</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Search queries and average positions reported by Google Search Console
          for the last 28 available days.
        </p>
        {!data.searchConnected && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Connect Search Console and select a property in Growth → Connections
            to load keyword performance.
          </p>
        )}
      </div>
      <form
        onSubmit={(event) => void runSerp(event)}
        className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <h3 className="text-sm font-semibold">Google SERP lookup</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Up to 10 organic results. Results arrive asynchronously and use the
          shared SEO data budget.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={serpKeyword}
            onChange={(event) => setSerpKeyword(event.target.value)}
            maxLength={120}
            required
            placeholder="Enter a keyword"
            className="min-w-64 flex-1"
          />
          <Button
            type="submit"
            disabled={
              !data.selectedProjectId ||
              serpLoading ||
              serpPending ||
              !serpKeyword.trim()
            }
          >
            {serpLoading ? "Looking up…" : "Analyze SERP"}
          </Button>
        </div>
        {serpCost !== null && (
          <p className="mt-2 text-xs text-neutral-500">
            Last provider request cost: ${serpCost.toFixed(4)}.
          </p>
        )}
        {serpPending && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
            <span>
              Provider is collecting the SERP. Standard tasks may take several
              minutes.
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={serpLoading}
              onClick={() => {
                if (!serpTaskId) return;
                setSerpLoading(true);
                void updateSerpTask(serpTaskId)
                  .catch((error) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Could not check SERP status",
                    ),
                  )
                  .finally(() => setSerpLoading(false));
              }}
            >
              Check status
            </Button>
          </div>
        )}
      </form>
      {serpRows.length > 0 && (
        <RecordTable
          contained
          title={`Results for “${serpKeyword}”`}
          description="Google organic results at the default US English desktop location. Rankings vary by location, device, and time."
          data={serpRows}
          columns={[
            { header: "Position", accessor: "position" },
            {
              header: "Result",
              accessor: "title",
              render: (row) => (
                <div>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-700 hover:underline dark:text-blue-300"
                  >
                    {row.title || row.domain}
                  </a>
                  <p className="mt-1 text-xs text-neutral-500">{row.domain}</p>
                </div>
              ),
            },
          ]}
          loading={serpLoading}
          exportName="seo-live-serp"
          emptyState={{
            icon: Search,
            message: "No organic results returned",
            description: "Try another keyword.",
          }}
        />
      )}
      <RecordTable
        contained
        title="Organic search queries"
        description="Search Console data is delayed by Google and does not represent live SERP rankings."
        data={rows}
        columns={columns}
        loading={data.loading}
        filters={[
          { key: "query", label: "Query", placeholder: "Search keywords..." },
        ]}
        exportName="seo-search-queries"
        emptyState={{
          icon: Search,
          message: data.searchConnected
            ? "No query data available"
            : "Search Console is not connected",
          description: data.searchConnected
            ? "Google has not returned query data for this period."
            : "Connect a Search Console property to review organic queries.",
        }}
      />
    </div>
  );
}

export function SeoCompetitorPage({ data }: { data: SeoWorkspaceData }) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [cost, setCost] = useState<number | null>(null);
  const load = async () => {
    if (!data.selectedProjectId || loading) return;
    setLoading(true);
    try {
      const response = await apiFetch("/api/admin/seo/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: data.selectedProjectId }),
      });
      if (!response.ok) throw new Error("Could not load competitors");
      const body = (await response.json()) as {
        competitors: Omit<Competitor, "id">[];
        costUsd: number | null;
      };
      setCompetitors(
        body.competitors.map((row) => ({ ...row, id: row.domain })),
      );
      setCost(body.costUsd);
    } catch (error) {
      console.error(error);
      toast.error(
        "Could not load competitors. Verify a public domain and check provider setup and monthly budget.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-blue-50 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Competitor analysis</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Compare backlink profiles, keyword overlap, and SERP competitors.
            Discover sites with backlink overlap for the verified project
            domain.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-700">
        <p className="text-sm text-neutral-500">
          Provider cost is charged to the SEO budget, capped at $1 per project
          and $10 platform-wide monthly.
          {cost !== null ? ` Last request: $${cost.toFixed(4)}.` : ""}
        </p>
        <Button
          variant="outline"
          disabled={!data.selectedProjectId || loading}
          onClick={() => void load()}
        >
          {loading
            ? "Analyzing…"
            : competitors.length
              ? "Refresh competitors"
              : "Find competitors"}
        </Button>
      </div>
      <div className="mt-6">
        <RecordTable
          contained
          title="Backlink competitors"
          description="DataForSEO Domain Rank is not comparable to Ahrefs DR. Competitor domains are external sites, not project records."
          data={competitors}
          columns={[
            { header: "Domain", accessor: "domain" },
            { header: "Domain Rank", accessor: "rank" },
            { header: "Common keywords", accessor: "commonKeywords" },
            { header: "Organic keywords", accessor: "organicKeywords" },
            { header: "Backlinks", accessor: "backlinks" },
            { header: "Referring domains", accessor: "referringDomains" },
          ]}
          loading={loading}
          exportName="seo-competitors"
          emptyState={{
            icon: BarChart3,
            message: "No competitor data loaded",
            description:
              "Run an on-demand competitor analysis for the verified project domain.",
          }}
        />
      </div>
    </div>
  );
}

export function SeoAiPage({ data }: { data: SeoWorkspaceData }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const latestFindings = data.audits[0]?.findings ?? [];
  const pending = data.suggestions.filter((item) => item.status === "pending");
  const eligibleFindings = latestFindings
    .filter((finding) =>
      ["metaTitle", "metaDescription"].includes(finding.field),
    )
    .map((finding, index) => ({
      ...finding,
      id: `${finding.targetId}:${finding.rule}:${index}`,
    }));
  const generate = async (
    finding: Finding,
    field: "metaTitle" | "metaDescription",
  ) => {
    if (!data.selectedProjectId || busy) return;
    const key = `${finding.targetId}:${field}`;
    setBusy(key);
    try {
      const response = await apiFetch("/api/admin/seo/ai/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          projectId: data.selectedProjectId,
          targetType: finding.targetType,
          targetId: finding.targetId,
          field,
          keyword: keyword.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = typeof body.error === "string" ? body.error : "Could not generate suggestion";
        throw new Error(message.includes("AI credits") ? `${message} Open Settings → Billing & usage to upgrade or add credits.` : message);
      }
      const body = (await response.json()) as { suggestion: Suggestion };
      data.setSuggestions((current) => [body.suggestion, ...current]);
      toast.success("Draft suggestion created for review");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not generate suggestion");
    } finally {
      setBusy(null);
    }
  };
  const review = async (
    suggestion: Suggestion,
    action: "apply" | "dismiss",
  ) => {
    if (!data.selectedProjectId) return;
    setBusy(suggestion.id);
    try {
      const response = await apiFetch(
        `/api/admin/seo/ai/suggestions/${suggestion.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: data.selectedProjectId }),
        },
      );
      if (!response.ok) throw new Error("Could not update suggestion");
      data.setSuggestions((current) =>
        current.map((item) =>
          item.id === suggestion.id
            ? { ...item, status: action === "apply" ? "applied" : "dismissed" }
            : item,
        ),
      );
      if (action === "apply") await data.refresh();
      toast.success(
        action === "apply" ? "SEO metadata updated" : "Suggestion dismissed",
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not update suggestion");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <WandSparkles className="h-5 w-5 text-violet-600" />
          <h2 className="text-base font-semibold">AI SEO optimizer</h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Generate metadata drafts from audit findings. Every change is reviewed
          and applied manually; AI never publishes content.
        </p>
        <label className="mt-4 block max-w-md text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Optional target keyword
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            maxLength={120}
            list="seo-search-console-keywords"
            placeholder="Use a Search Console query or planned keyword"
            className="mt-1"
          />
          <datalist id="seo-search-console-keywords">
            {data.searchRows.map((row) => (
              <option key={row.query} value={row.query} />
            ))}
          </datalist>
        </label>
      </div>
      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((suggestion) => (
            <article
              key={suggestion.id}
              className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-neutral-500">
                    {suggestion.field} · {suggestion.targetType}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-neutral-500">Before: </span>
                    {suggestion.beforeValue || "(empty)"}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    <span className="text-neutral-500">Draft: </span>
                    {suggestion.afterValue}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {suggestion.rationale}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={busy === suggestion.id}
                    onClick={() => void review(suggestion, "apply")}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy === suggestion.id}
                    onClick={() => void review(suggestion, "dismiss")}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <RecordTable
        contained
        title="Audit findings eligible for AI drafts"
        description="Only title and description metadata can be updated here. Fix content issues in the existing editor."
        data={eligibleFindings}
        columns={[
          { header: "Finding", accessor: "message" },
          { header: "Page", accessor: "title" },
          { header: "Field", accessor: "field" },
        ]}
        loading={data.loading}
        filters={[
          {
            key: "message",
            label: "Finding",
            placeholder: "Search findings...",
          },
        ]}
        exportName="seo-ai-findings"
        emptyState={{
          icon: CheckCircle2,
          message: "No metadata findings to optimize",
          description: "Run an audit to identify metadata gaps.",
        }}
        actions={{
          primary: {
            label: "Draft title",
            onClick: (finding) => void generate(finding, "metaTitle"),
            disabled: (finding) =>
              finding.field !== "metaTitle" || busy !== null,
          },
          menu: [
            {
              label: "Draft description",
              onClick: (finding) => void generate(finding, "metaDescription"),
              disabled: (finding) =>
                finding.field !== "metaDescription" || busy !== null,
            },
          ],
        }}
      />
    </div>
  );
}
