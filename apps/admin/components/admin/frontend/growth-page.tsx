"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ExternalLink,
  Filter,
  FlaskConical,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unplug,
  X,
} from "lucide-react";
import { useAdmin } from "@/src/admin-context";
import { apiFetch } from "@/src/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RecordTable, {
  type RecordFilter,
} from "@/components/admin/manage/record-table";
import type {
  DataTableActions,
  DataTableColumn,
} from "@/components/admin/manage/table";
import { ToolbarButton } from "@/components/admin/manage/toolbar-button";
import {
  PageFrame,
  PageTabs,
  SectionCard,
  StatCard,
  StatusPill,
} from "./page-frame";

type View =
  "overview" | "analytics" | "experiments" | "recommendations" | "connections";
const views: Array<{ id: View; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "experiments", label: "Experiments" },
  { id: "recommendations", label: "Recommendations" },
  { id: "connections", label: "Connections" },
];
const legacyViews: Record<string, View> = {
  "/analytics": "analytics",
  "/growth/events": "analytics",
  "/growth/experiments": "experiments",
  "/growth/recommendations": "recommendations",
  "/growth/reports": "analytics",
};
async function request<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const response = await apiFetch(path, { ...init, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      result.message || result.error || `Request failed (${response.status})`,
    );
  return result as T;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
function fmt(value: unknown) {
  return Number(value || 0).toLocaleString();
}
function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function useGrowthQuery<T>(
  projectId: string | null | undefined,
  path: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["growth", projectId, path],
    queryFn: () =>
      request<T>(
        `${path}${path.includes("?") ? "&" : "?"}projectId=${projectId}`,
      ),
    enabled: Boolean(projectId) && enabled,
    staleTime: 20_000,
  });
}
function useGrowthActions() {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function run<T>(
    path: string,
    method = "POST",
    body?: unknown,
    success = "Changes saved.",
  ): Promise<T | undefined> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request<T>(path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      setNotice(success);
      await client.invalidateQueries({ queryKey: ["growth"] });
      return result;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The request could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { busy, notice, error, setError, run };
}
function Feedback({ notice, error }: { notice?: string; error?: string }) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {notice}
        </p>
      )}
    </>
  );
}
function Loading() {
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-neutral-500">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      Loading Growth data…
    </div>
  );
}
function QueryError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
    >
      <p className="font-medium">Growth data could not be loaded</p>
      <p className="mt-1">{message}</p>
      <Button onClick={retry} variant="outline" size="sm" className="mt-3">
        Try again
      </Button>
    </div>
  );
}
function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
        <Activity className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <div className="mx-auto mt-1 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        {children}
      </div>
    </div>
  );
}
function DailyBars({
  rows,
  valueKey = "pageViews",
}: {
  rows: any[];
  valueKey?: string;
}) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  if (!rows.length)
    return (
      <Empty title="No measurements in this range">
        Once storefront events arrive, daily activity will appear here.
      </Empty>
    );
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[620px] items-end gap-1 border-b border-neutral-200 px-1 pt-5 dark:border-neutral-800">
        {rows.map((row, index) => (
          <div
            key={`${row.date}-${index}`}
            className="group relative flex min-w-3 flex-1 flex-col justify-end"
            title={`${row.date}: ${fmt(row[valueKey])}`}
          >
            <span className="mb-1 hidden whitespace-nowrap text-center text-[10px] text-neutral-500 group-hover:block">
              {fmt(row[valueKey])}
            </span>
            <div
              className="min-h-1 rounded-t-sm bg-neutral-800 dark:bg-neutral-200"
              style={{
                height: `${Math.max(2, (Number(row[valueKey] || 0) / maximum) * 128)}px`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-2 text-[10px] text-neutral-500">
        <span>{dateLabel(rows[0].date)}</span>
        <span>{dateLabel(rows[rows.length - 1].date)}</span>
      </div>
    </div>
  );
}

export default function GrowthPage() {
  const { selectedProjectId } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawView = params.get("view");
  const requestedView = (
    rawView === "tracking" ? "analytics" : rawView
  ) as View | null;
  const view = views.some((item) => item.id === requestedView)
    ? requestedView!
    : "overview";
  const [globalError, setGlobalError] = useState("");
  useEffect(() => {
    const legacy = legacyViews[location.pathname];
    if (location.pathname === "/growth" && rawView === "tracking")
      navigate("/growth?view=analytics", { replace: true });
    else if (legacy) navigate(`/growth?view=${legacy}`, { replace: true });
    else if (location.pathname !== "/growth")
      navigate("/growth?view=overview", { replace: true });
    else if (!requestedView || !views.some((item) => item.id === requestedView))
      navigate("/growth?view=overview", { replace: true });
  }, [location.pathname, navigate, rawView, requestedView]);
  return (
    <PageFrame
      title="Growth"
      description="Measure storefront activity, review experiments, and manage connected data sources."
    >
      <div className="space-y-5">
        <PageTabs
          items={views.map((item) => ({
            label: item.label,
            href: `/growth?view=${item.id}`,
            active: view === item.id,
          }))}
        />
        {!selectedProjectId ? (
          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
            <Empty title="Choose a project">
              Select a project to view its Growth data.
            </Empty>
          </div>
        ) : (
          <>
            <Feedback error={globalError} />
            {view === "overview" && (
              <Overview
                projectId={selectedProjectId}
                onError={setGlobalError}
              />
            )}
            {view === "analytics" && (
              <Analytics projectId={selectedProjectId} />
            )}
            {view === "experiments" && (
              <Experiments projectId={selectedProjectId} />
            )}
            {view === "recommendations" && (
              <Recommendations projectId={selectedProjectId} />
            )}
            {view === "connections" && (
              <Connections projectId={selectedProjectId} />
            )}
          </>
        )}
      </div>
    </PageFrame>
  );
}

function Overview({
  projectId,
  onError,
}: {
  projectId: string;
  onError: (value: string) => void;
}) {
  const query = useGrowthQuery<any>(projectId, "/api/admin/growth/overview");
  const chart = useGrowthQuery<any>(
    projectId,
    `/api/admin/growth/analytics?source=first_party&from=${daysAgo(29)}&to=${today()}`,
  );
  if (query.isLoading) return <Loading />;
  if (query.error)
    return (
      <QueryError
        message={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  const data = query.data;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Page views"
          value={fmt(data.firstParty?.pageViews)}
          note="Last 30 days"
          icon={BarChart3}
        />
        <StatCard
          label="Visitors"
          value={fmt(data.firstParty?.visitors)}
          note="First party only"
          icon={Activity}
        />
        <StatCard
          label="Running experiments"
          value={fmt(data.activeExperiments)}
          note="Across storefront surfaces"
          icon={FlaskConical}
        />
        <StatCard
          label="Pending recommendations"
          value={fmt(data.pendingRecommendations)}
          note="Waiting for review"
          icon={Sparkles}
        />
      </div>
      <SectionCard
        title="First party traffic"
        description="First party activity collected from your storefront."
        headerAction={
          <a
            href="/growth?view=analytics"
            className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
          >
            Open analytics <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        }
      >
        {chart.isLoading ? (
          <Loading />
        ) : chart.data ? (
          <DailyBars rows={chart.data.daily || []} />
        ) : (
          <QueryError
            message={chart.error?.message || "Analytics is unavailable."}
            retry={() => void chart.refetch()}
          />
        )}
      </SectionCard>
      <SectionCard
        title="Published page views"
        description="Usage counts resolved HTML requests. It contains project and day totals only."
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-medium">
              {fmt(data.billablePageViews)}
            </p>
            <p className="text-xs text-neutral-500">Current UTC day</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/settings/plan-usage">Plan &amp; usage</a>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

function Analytics({ projectId }: { projectId: string }) {
  const [source, setSource] = useState("first_party");
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [pagePath, setPagePath] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSource, setDraftSource] = useState(source);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [draftPagePath, setDraftPagePath] = useState(pagePath);
  const query = useGrowthQuery<any>(
    projectId,
    `/api/admin/growth/analytics?source=${source}&from=${from}&to=${to}${pagePath ? `&pagePath=${encodeURIComponent(pagePath)}` : ""}`,
    Boolean(from && to && from <= to),
  );
  const isSearch = source === "search_console";
  const metrics: Array<[string, unknown, string?, string?]> = isSearch
    ? [
        ["Clicks", query.data?.summary?.clicks],
        ["Impressions", query.data?.summary?.impressions],
        [
          "Click-through rate",
          query.data?.summary?.ctr,
          `${(Number(query.data?.summary?.ctr || 0) * 100).toFixed(2)}%`,
        ],
        [
          "Average position",
          query.data?.summary?.averagePosition,
          Number(query.data?.summary?.averagePosition || 0).toFixed(1),
        ],
      ]
    : source === "google_analytics"
      ? [
          ["Page views", query.data?.summary?.pageViews],
          ["Visitors", query.data?.summary?.visitors],
          ["Sessions", query.data?.summary?.sessions],
          [
            "Bounce rate",
            query.data?.summary?.bounceRate,
            `${(Number(query.data?.summary?.bounceRate || 0) * 100).toFixed(1)}%`,
          ],
        ]
      : [
          ["Page views", query.data?.summary?.pageViews],
          ["Visitors", query.data?.summary?.visitors],
          ["Events", query.data?.summary?.events],
          ["Bounce rate", null, "—", "Session data unavailable"],
        ];
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-base font-medium text-neutral-900 dark:text-white">
          Analytics
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Popover
            open={filtersOpen}
            onOpenChange={(open) => {
              setFiltersOpen(open);
              if (open) {
                setDraftSource(source);
                setDraftFrom(from);
                setDraftTo(to);
                setDraftPagePath(pagePath);
              }
            }}
          >
            <PopoverTrigger asChild>
              <ToolbarButton icon={Filter}>Filters</ToolbarButton>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[280px] space-y-3 rounded-lg border border-neutral-200 bg-white p-3 text-neutral-900 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <p className="border-b border-neutral-200 pb-2 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                Filter by:
              </p>
              <Label className="mb-0 block text-xs text-neutral-600 dark:text-neutral-400">
                Data source
                <Select value={draftSource} onValueChange={setDraftSource}>
                  <SelectTrigger className="mt-1.5 h-8 bg-white px-3 text-xs dark:bg-neutral-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_party">
                      First-party analytics
                    </SelectItem>
                    <SelectItem value="google_analytics">
                      Google Analytics 4
                    </SelectItem>
                    <SelectItem value="search_console">
                      Google Search Console
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Label className="mb-0 block text-xs text-neutral-600 dark:text-neutral-400">
                  From
                  <Input
                    className="mt-1.5 h-8 px-2 text-xs"
                    type="date"
                    value={draftFrom}
                    max={draftTo}
                    onChange={(event) => setDraftFrom(event.target.value)}
                  />
                </Label>
                <Label className="mb-0 block text-xs text-neutral-600 dark:text-neutral-400">
                  To
                  <Input
                    className="mt-1.5 h-8 px-2 text-xs"
                    type="date"
                    value={draftTo}
                    min={draftFrom}
                    max={today()}
                    onChange={(event) => setDraftTo(event.target.value)}
                  />
                </Label>
              </div>
              {draftSource === "first_party" && (
                <Label className="mb-0 block text-xs text-neutral-600 dark:text-neutral-400">
                  Page path
                  <Input
                    className="mt-1.5 h-8 px-3 text-xs"
                    placeholder="Search page paths..."
                    value={draftPagePath}
                    onChange={(event) => setDraftPagePath(event.target.value)}
                  />
                </Label>
              )}
              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDraftSource("first_party");
                    setDraftFrom(daysAgo(29));
                    setDraftTo(today());
                    setDraftPagePath("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !draftFrom ||
                    !draftTo ||
                    draftFrom > draftTo ||
                    draftTo > today()
                  }
                  onClick={() => {
                    setSource(draftSource);
                    setFrom(draftFrom);
                    setTo(draftTo);
                    setPagePath(draftPagePath.trim());
                    setFiltersOpen(false);
                  }}
                >
                  Filter
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <ToolbarButton icon={RefreshCw} onClick={() => void query.refetch()}>
            Refresh
          </ToolbarButton>
        </div>
      </div>
      {source !== "first_party" && (
        <p className="flex items-center gap-2 text-xs text-neutral-500">
          <ShieldCheck className="h-4 w-4" />
          {source === "google_analytics"
            ? "GA4 data is requested directly from Google Analytics and is shown separately."
            : "Search Console data is requested directly from Google and is shown separately."}
        </p>
      )}
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <QueryError
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, display, note]) => (
              <StatCard
                key={String(label)}
                label={String(label)}
                value={display ?? fmt(value)}
                note={note || `${from} to ${to}`}
                icon={BarChart3}
              />
            ))}
          </div>
          <SectionCard
            title="Daily activity"
            description={`${isSearch ? "Search clicks" : "Page views"} · ${from} – ${to}`}
          >
            <DailyBars
              rows={query.data?.daily || []}
              valueKey={isSearch ? "clicks" : "pageViews"}
            />
          </SectionCard>
          {source === "first_party" && (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Top pages">
                  {query.data.topPages?.length ? (
                    query.data.topPages.map((row: any) => (
                      <div
                        key={row.path}
                        className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 text-sm last:border-0 dark:border-neutral-800"
                      >
                        <span className="truncate font-mono text-xs">
                          {row.path || "/"}
                        </span>
                        <span className="tabular-nums">
                          {fmt(row.pageViews)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty title="No page views yet">
                      Publish your site and visit it to begin collecting visits.
                    </Empty>
                  )}
                </SectionCard>
                <SectionCard title="Events">
                  {query.data.events?.length ? (
                    query.data.events.map((row: any) => (
                      <div
                        key={row.name}
                        className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 text-sm last:border-0 dark:border-neutral-800"
                      >
                        <span className="font-mono text-xs">{row.name}</span>
                        <span className="tabular-nums">{fmt(row.count)}</span>
                      </div>
                    ))
                  ) : (
                    <Empty title="No events in this range">
                      Page views and storefront actions will show here.
                    </Empty>
                  )}
                </SectionCard>
              </div>
              <EventTrackingDetails projectId={projectId} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function EventTrackingDetails({ projectId }: { projectId: string }) {
  const eventsQuery = useGrowthQuery<any>(
    projectId,
    "/api/admin/growth/events",
  );
  if (eventsQuery.isLoading) return <Loading />;
  return (
    <div className="space-y-5">
      <SectionCard
        title="Collection health"
        description="Raw events are retained for 90 days."
        headerAction={<StatusPill tone="green">Collection enabled</StatusPill>}
      >
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
          <div>
            <p className="text-xs text-neutral-500">Events retained</p>
            <p className="mt-1 text-xl font-medium tabular-nums">
              {fmt(eventsQuery.data?.total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Event types</p>
            <p className="mt-1 text-xl font-medium tabular-nums">
              {fmt(eventsQuery.data?.events?.length)}
            </p>
          </div>
          <p className="max-w-2xl text-xs leading-5 text-neutral-500">
            Analytics properties are checked for contact details. Deduplication
            and timestamp limits protect ingestion from retries and stale
            events.
          </p>
        </div>
      </SectionCard>
      {eventsQuery.error ? (
        <QueryError
          message={eventsQuery.error.message}
          retry={() => void eventsQuery.refetch()}
        />
      ) : (
        <RecordTable
          contained
          title="Observed event types"
          description="Activity from the last 30 days."
          data={(eventsQuery.data?.events || []).map((row: any) => ({
            ...row,
            id: row.name,
          }))}
          columns={[
            {
              header: "Event",
              accessor: "name",
              render: (row: any) => (
                <code className="font-mono text-xs">{row.name}</code>
              ),
            },
            {
              header: "Occurrences",
              accessor: "count",
              render: (row: any) => fmt(row.count),
            },
            {
              header: "Last seen",
              accessor: "lastSeen",
              render: (row: any) =>
                row.lastSeen ? new Date(row.lastSeen).toLocaleString() : "—",
            },
          ]}
          filters={[
            { key: "name", label: "Event", placeholder: "Search events..." },
          ]}
          exportName="growth-event-types"
          headerActions={
            <ToolbarButton
              icon={RefreshCw}
              onClick={() => void eventsQuery.refetch()}
            >
              Refresh
            </ToolbarButton>
          }
          emptyState={{
            icon: Activity,
            message: "No first party events yet",
            description:
              "Publish a page and visit the storefront to verify event collection.",
          }}
        />
      )}
    </div>
  );
}

function Experiments({ projectId }: { projectId: string }) {
  const query = useGrowthQuery<any>(projectId, "/api/admin/growth/experiments");
  const targets = useGrowthQuery<any>(projectId, "/api/admin/growth/targets");
  const events = useGrowthQuery<any>(projectId, "/api/admin/growth/events");
  const action = useGrowthActions();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useGrowthQuery<any>(
    projectId,
    `/api/admin/growth/experiments/${selectedId}`,
    Boolean(selectedId),
  );
  async function transition(id: string, verb: string) {
    await action.run(
      `/api/admin/growth/experiments/${id}/transition`,
      "POST",
      { projectId, action: verb },
      `Experiment ${verb === "start" ? "started" : verb === "stop" ? "completed" : `${verb}d`}.`,
    );
  }
  if (query.isLoading || targets.isLoading || events.isLoading)
    return <Loading />;
  if (query.error)
    return (
      <QueryError
        message={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  const experiments = query.data?.experiments || [];
  const experimentColumns: DataTableColumn<any>[] = [
    {
      header: "Experiment",
      accessor: "name",
      render: (experiment) => (
        <div>
          <p className="font-medium">{experiment.name}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {experiment.targetType}
            {experiment.targetId
              ? " · specific target"
              : " · all matching surface"}
          </p>
        </div>
      ),
    },
    { header: "Goal event", accessor: "primaryEvent" },
    {
      header: "Status",
      accessor: "status",
      render: (experiment) => (
        <StatusPill
          tone={
            experiment.status === "running"
              ? "green"
              : experiment.status === "paused"
                ? "amber"
                : "neutral"
          }
        >
          {experiment.status}
        </StatusPill>
      ),
    },
    {
      header: "Sample goal",
      accessor: "sampleSizeTarget",
      render: (experiment) => fmt(experiment.sampleSizeTarget),
    },
    {
      header: "Updated",
      accessor: "updatedAt",
      render: (experiment) =>
        new Date(experiment.updatedAt).toLocaleDateString(),
    },
  ];
  const experimentFilters: RecordFilter<any>[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Running", value: "running" },
        { label: "Paused", value: "paused" },
        { label: "Completed", value: "completed" },
      ],
    },
    { key: "targetType", label: "Storefront surface" },
  ];
  const experimentActions: DataTableActions<any> = {
    primary: {
      icon: BarChart3,
      title: () => "View results",
      disabled: () => action.busy,
      onClick: (experiment) => setSelectedId(experiment.id),
    },
    menu: [
      {
        label: "Start",
        disabled: (experiment) => experiment.status !== "draft" || action.busy,
        onClick: (experiment) => void transition(experiment.id, "start"),
      },
      {
        label: "Pause",
        disabled: (experiment) =>
          experiment.status !== "running" || action.busy,
        onClick: (experiment) => void transition(experiment.id, "pause"),
      },
      {
        label: "Resume",
        disabled: (experiment) => experiment.status !== "paused" || action.busy,
        onClick: (experiment) => void transition(experiment.id, "resume"),
      },
      { separator: true },
      {
        label: "Complete",
        disabled: (experiment) =>
          !["running", "paused"].includes(experiment.status) || action.busy,
        onClick: (experiment) => void transition(experiment.id, "stop"),
      },
    ],
  };
  return (
    <div className="space-y-5">
      <Feedback error={action.error} notice={action.notice} />
      {creating && (
        <ExperimentBuilder
          projectId={projectId}
          targets={targets.data}
          events={events.data?.events || []}
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void query.refetch();
          }}
        />
      )}
      <RecordTable
        contained
        title="Storefront experiments"
        description="Variants can adjust visible headings and button labels. Commerce prices and checkout rules stay unchanged."
        data={experiments}
        columns={experimentColumns}
        actions={experimentActions}
        filters={experimentFilters}
        dateRange="updatedAt"
        dateRangeLabel="Updated"
        exportName="growth-experiments"
        headerActions={
          <Button size="sm" onClick={() => setCreating((value) => !value)}>
            <Plus className="h-4 w-4" />
            {creating ? "Close builder" : "Create experiment"}
          </Button>
        }
        emptyState={{
          icon: FlaskConical,
          message: "No experiments yet",
          description:
            "Create an experiment for a published page, product, cart or checkout. It starts after baseline data checks.",
        }}
      />
      {selectedId && (
        <ExperimentDetail
          projectId={projectId}
          id={selectedId}
          data={detail.data}
          loading={detail.isLoading}
          error={detail.error?.message}
          close={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function ExperimentBuilder({
  projectId,
  targets,
  events,
  onCancel,
  onCreated,
}: {
  projectId: string;
  targets?: any;
  events: any[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const action = useGrowthActions();
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState("page");
  const [targetId, setTargetId] = useState("");
  const [primaryEvent, setPrimaryEvent] = useState(
    events[0]?.name || "page_view",
  );
  const [baselineRate, setBaselineRate] = useState("0.02");
  const [effect, setEffect] = useState("0.2");
  const [headline, setHeadline] = useState("");
  const [buttonText, setButtonText] = useState("");
  const choices =
    targetType === "page"
      ? targets?.pages || []
      : targetType === "product"
        ? targets?.products || []
        : [];
  const eventChoices = Array.from(
    new Set([
      "page_view",
      "add_to_cart",
      "checkout_started",
      "purchase",
      ...events.map((event: any) => event.name),
    ]),
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    const experience = {
      ...(headline.trim() ? { headline: headline.trim() } : {}),
      ...(buttonText.trim() ? { buttonText: buttonText.trim() } : {}),
    };
    void action
      .run<any>(
        "/api/admin/growth/experiments",
        "POST",
        {
          projectId,
          name,
          targetType,
          targetId: ["page", "product"].includes(targetType) ? targetId : null,
          primaryEvent,
          baselineRate: Number(baselineRate),
          minimumDetectableEffect: Number(effect),
          guardrailEvents: [],
          variants: [
            {
              key: "control",
              name: "Control",
              isControl: true,
              allocation: 50,
              experience: {},
            },
            {
              key: "variant_b",
              name: "Variant B",
              isControl: false,
              allocation: 50,
              experience,
            },
          ],
        },
        "Draft experiment created.",
      )
      .then((result) => {
        if (result) onCreated();
      });
  }
  return (
    <SectionCard
      title="Experiment setup"
      description="A two-variant test with equal traffic allocation. You can edit visible text only."
    >
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Label className="mb-0 grid gap-1.5 text-xs">
            Experiment name
            <Input
              required
              minLength={3}
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Homepage headline test"
            />
          </Label>
          <Label className="mb-0 grid gap-1.5 text-xs">
            Storefront surface
            <Select
              value={targetType}
              onValueChange={(value) => {
                setTargetType(value);
                setTargetId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page">Published page</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="cart">Cart</SelectItem>
                <SelectItem value="checkout">Checkout</SelectItem>
              </SelectContent>
            </Select>
          </Label>
          {choices.length > 0 && (
            <Label className="mb-0 grid gap-1.5 text-xs">
              Target
              <Select value={targetId || undefined} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose target" />
                </SelectTrigger>
                <SelectContent>
                  {choices.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {item.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          )}
          {choices.length === 0 && ["page", "product"].includes(targetType) && (
            <p className="self-center text-xs text-amber-700 dark:text-amber-300">
              No published {targetType === "page" ? "pages" : "products"} are
              available to test.
            </p>
          )}
          <Label className="mb-0 grid gap-1.5 text-xs">
            Primary event
            <Select value={primaryEvent} onValueChange={setPrimaryEvent}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventChoices.map((eventName) => (
                  <SelectItem key={eventName} value={eventName}>
                    {eventName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>
          <Label className="mb-0 grid gap-1.5 text-xs">
            Baseline conversion rate
            <Input
              required
              type="number"
              min="0.0001"
              max="0.9999"
              step="0.001"
              value={baselineRate}
              onChange={(event) => setBaselineRate(event.target.value)}
            />
            <span className="text-neutral-500">
              Use measured data; this helps estimate sample size.
            </span>
          </Label>
          <Label className="mb-0 grid gap-1.5 text-xs">
            Minimum detectable effect
            <Input
              required
              type="number"
              min="0.01"
              max="2"
              step="0.01"
              value={effect}
              onChange={(event) => setEffect(event.target.value)}
            />
            <span className="text-neutral-500">
              Relative effect, for example 0.2 means 20%.
            </span>
          </Label>
          <Label className="mb-0 grid gap-1.5 text-xs">
            Variant B headline
            <Input
              maxLength={160}
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="A clearer customer promise"
            />
          </Label>
          <Label className="mb-0 grid gap-1.5 text-xs">
            Variant B button label
            <Input
              maxLength={80}
              value={buttonText}
              onChange={(event) => setButtonText(event.target.value)}
              placeholder="Shop the collection"
            />
          </Label>
        </div>
        {!headline.trim() && !buttonText.trim() && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Add a headline or button label so Variant B changes what visitors
            see.
          </p>
        )}
        <Feedback error={action.error} notice={action.notice} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              action.busy ||
              (!headline.trim() && !buttonText.trim()) ||
              (["page", "product"].includes(targetType) && !targetId)
            }
            size="sm"
          >
            {action.busy ? "Creating…" : "Create draft"}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function ExperimentDetail({
  projectId,
  id,
  data,
  loading,
  error,
  close,
}: {
  projectId: string;
  id: string;
  data?: any;
  loading: boolean;
  error?: string;
  close: () => void;
}) {
  const query = useGrowthQuery<any>(
    projectId,
    `/api/admin/growth/experiments/${id}`,
  );
  const result = data || query.data;
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogDescription>Experiment results</DialogDescription>
          <DialogTitle>{result?.experiment?.name || "Experiment"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <Loading />
        ) : error ? (
          <p className="mt-5 text-sm text-red-700">{error}</p>
        ) : (
          result && (
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Status" value={result.experiment.status} />
                <StatCard
                  label="Sample goal"
                  value={fmt(result.experiment.sampleSizeTarget)}
                />
              </div>
              <SectionCard
                title="Variant assignments & goal events"
                className="p-4"
              >
                {(result.variants || []).map((variant: any) => {
                  const assigned =
                    result.assignments?.find(
                      (row: any) => row.variantId === variant.id,
                    )?.count || 0;
                  const conversions =
                    result.events?.find(
                      (row: any) =>
                        row.variantId === variant.key ||
                        row.variantId === variant.id,
                    )?.count || 0;
                  return (
                    <div
                      key={variant.id}
                      className="grid grid-cols-3 gap-2 border-b border-neutral-100 px-4 py-3 text-xs last:border-0 dark:border-neutral-800"
                    >
                      <span>
                        {variant.name}
                        {variant.isControl ? " · control" : ""}
                      </span>
                      <span>{fmt(assigned)} assigned</span>
                      <span>{fmt(conversions)} goals</span>
                    </div>
                  );
                })}
              </SectionCard>
              <p className="text-xs leading-5 text-neutral-500">
                Results report observed counts. They do not claim statistical
                confidence or predicted lift.
              </p>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function Recommendations({ projectId }: { projectId: string }) {
  const query = useGrowthQuery<any>(
    projectId,
    "/api/admin/growth/recommendations",
  );
  const action = useGrowthActions();
  async function decide(id: string, status: string) {
    await action.run(
      `/api/admin/growth/recommendations/${id}`,
      "PATCH",
      { projectId, status },
      status === "approved"
        ? "Recommendation approved. No site change was applied automatically."
        : "Recommendation dismissed.",
    );
  }
  if (query.isLoading) return <Loading />;
  if (query.error)
    return (
      <QueryError
        message={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  const rows = query.data?.recommendations || [];
  const recommendationRecords = rows.map((row: any) => ({
    ...row,
    source: row.proposedAction?.aiAssisted ? "AI assisted" : "Rule based",
  }));
  const recommendationColumns: DataTableColumn<any>[] = [
    {
      header: "Recommendation",
      accessor: "kind",
      render: (row) => (
        <span className="font-medium">
          {row.proposedAction?.title || row.kind}
        </span>
      ),
    },
    {
      header: "Evidence summary",
      accessor: "explanation",
      render: (row) => (
        <div className="max-w-xl">
          <p className="line-clamp-2 text-sm">{row.explanation}</p>
          <details className="mt-2 text-xs text-neutral-500">
            <summary className="cursor-pointer">
              View supporting measurements
            </summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-neutral-50 p-3 text-[11px] dark:bg-neutral-950">
              {JSON.stringify(row.proposedAction?.evidence || {}, null, 2)}
            </pre>
          </details>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => (
        <StatusPill
          tone={
            row.status === "pending"
              ? "amber"
              : row.status === "approved"
                ? "green"
                : "neutral"
          }
        >
          {row.status}
        </StatusPill>
      ),
    },
    {
      header: "Source",
      accessor: "source",
    },
  ];
  const recommendationFilters: RecordFilter<any>[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Dismissed", value: "rejected" },
      ],
    },
    { key: "kind", label: "Type" },
  ];
  const recommendationActions: DataTableActions<any> = {
    primary: {
      icon: Check,
      title: () => "Approve recommendation",
      disabled: (row) => row.status !== "pending" || action.busy,
      onClick: (row) => void decide(row.id, "approved"),
    },
    menu: [
      {
        icon: X,
        label: "Dismiss",
        disabled: (row) => row.status !== "pending" || action.busy,
        onClick: (row) => void decide(row.id, "rejected"),
      },
    ],
  };
  return (
    <div className="space-y-5">
      <Feedback error={action.error} notice={action.notice} />
      <RecordTable
        contained
        title="Evidence led recommendations"
        description="Recommendations combine measured rules with AI wording. Approval records your decision; it never edits the storefront automatically."
        data={recommendationRecords}
        columns={recommendationColumns}
        filters={recommendationFilters}
        dateRange="createdAt"
        dateRangeLabel="Created"
        exportName="growth-recommendations"
        actions={recommendationActions}
        trailingActions={
          <Button
            size="sm"
            className="gap-2"
            disabled={action.busy}
            onClick={() =>
              void action.run(
                "/api/admin/growth/recommendations/generate",
                "POST",
                { projectId },
                "A recommendation was generated from recent measurements.",
              )
            }
          >
            <Sparkles className="h-4 w-4" />
            Generate
          </Button>
        }
        emptyState={{
          icon: Sparkles,
          message: "No recommendations yet",
          description:
            "Collect first party data, then generate a recommendation based on observed activity.",
        }}
      />
    </div>
  );
}

function Connections({ projectId }: { projectId: string }) {
  const query = useGrowthQuery<any>(projectId, "/api/admin/growth/connections");
  const action = useGrowthActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [callbackNotice, setCallbackNotice] = useState("");
  const [properties, setProperties] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState("");
  const providers = [
    {
      id: "google_analytics",
      name: "Google Analytics 4",
      detail: "Traffic, sessions and active users",
    },
    {
      id: "search_console",
      name: "Google Search Console",
      detail: "Search impressions and clicks",
    },
  ];
  const connections = query.data?.connections || [];
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected)
      setCallbackNotice(
        "Google connected. Choose the property this project should report on.",
      );
    if (error)
      action.setError(
        error === "oauth_state_expired"
          ? "Google authorization expired. Start the connection again."
          : error === "invalid_oauth_response"
            ? "Google returned an invalid authorization response."
            : "Google could not connect this source. Check the OAuth setup and try again.",
      );
    if (connected || error) {
      const next = new URLSearchParams(searchParams);
      next.delete("connected");
      next.delete("error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  async function loadProperties(provider: string) {
    setLoading(provider);
    action.setError("");
    try {
      const data = await request<any>(
        `/api/admin/growth/connections/${provider}/properties?projectId=${projectId}`,
      );
      setProperties((old) => ({ ...old, [provider]: data.properties || [] }));
    } catch (cause) {
      action.setError(
        cause instanceof Error
          ? cause.message
          : "Google properties could not be loaded.",
      );
    } finally {
      setLoading("");
    }
  }
  async function connect(provider: string) {
    const data = await action.run<any>(
      "/api/admin/growth/connections/google/start",
      "POST",
      { projectId, provider },
      "Opening Google authorization…",
    );
    if (data?.authorizationUrl) window.location.assign(data.authorizationUrl);
  }
  async function saveProperty(provider: string) {
    await action.run(
      `/api/admin/growth/connections/${provider}/property`,
      "PUT",
      { projectId, propertyId: selected[provider] },
      "Google property saved.",
    );
  }
  return (
    <div className="space-y-5">
      <Feedback
        error={action.error || query.error?.message}
        notice={action.notice || callbackNotice}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => {
          const connection = connections.find(
            (item: any) => item.provider === provider.id,
          );
          const choices = properties[provider.id];
          return (
            <SectionCard
              key={provider.id}
              title={provider.name}
              description={provider.detail}
              headerAction={
                <StatusPill
                  tone={
                    connection?.status === "connected"
                      ? "green"
                      : connection
                        ? "amber"
                        : "neutral"
                  }
                >
                  {connection?.status || "Not connected"}
                </StatusPill>
              }
            >
              <div className="space-y-4">
                {connection?.lastError && (
                  <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    {connection.lastError}
                  </p>
                )}
                {connection?.propertyId && (
                  <p className="break-all rounded-md bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">
                    Selected property: {connection.propertyId}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!connection || connection.status !== "connected" ? (
                    <Button
                      size="sm"
                      disabled={action.busy}
                      onClick={() => void connect(provider.id)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {connection ? "Reconnect Google" : "Connect Google"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading === provider.id}
                        onClick={() => void loadProperties(provider.id)}
                      >
                        {loading === provider.id
                          ? "Loading…"
                          : "Choose property"}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(
                            `/api/admin/growth/connections/${provider.id}`,
                            "DELETE",
                            { projectId },
                            `${provider.name} disconnected.`,
                          )
                        }
                      >
                        <Unplug className="h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
                {choices && (
                  <div className="flex flex-wrap gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={
                          selected[provider.id] ||
                          connection?.propertyId ||
                          undefined
                        }
                        onValueChange={(value) =>
                          setSelected((old) => ({
                            ...old,
                            [provider.id]: value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a property" />
                        </SelectTrigger>
                        <SelectContent>
                          {choices.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        (!selected[provider.id] && !connection?.propertyId) ||
                        action.busy
                      }
                      onClick={() => void saveProperty(provider.id)}
                    >
                      Save property
                    </Button>
                  </div>
                )}
                {connection?.lastSyncedAt && (
                  <p className="text-[11px] text-neutral-500">
                    Last report request{" "}
                    {new Date(connection.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-neutral-500">
        Google access is read-only. Credentials are encrypted at rest and
        removed when a source is disconnected.
      </p>
    </div>
  );
}
