"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Edit, ExternalLink, List, Plus, RotateCcw, Search, Send, Trash2, X } from "lucide-react";
import { useAdmin } from "@/src/admin-context";
import { apiFetch } from "@/src/lib/api";
import Link from "@/components/router-link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable, { type DataTableActions, type DataTableColumn } from "@/components/admin/manage/table";
import { AdminToolbar } from "@/components/admin/manage/admin-toolbar";
import { DateRangePopover } from "@/components/admin/manage/date-range-popover";
import { FilterPopover, type FilterField } from "@/components/admin/manage/filter-popover";
import { PageFrame, PageTabs, StatusPill } from "./page-frame";

type Plan = {
  id: string; kind: "blog" | "social"; blogId: string | null; channel: string | null; text: string | null;
  mediaIds: string[]; status: string; scheduledAt: string | null; timezone: string; attempts: number;
  failureKind: string | null; lastError: string | null; publishedAt: string | null; createdAt: string; updatedAt: string;
  blog: { title: string; slug: string; status: string; isPublished: boolean } | null;
};
type Blog = { id: string; title: string; status: string; isPublished: boolean };
type Media = { id: string; name: string; url: string; mediaType: string };
type PlanForm = { kind: "blog" | "social"; blogId: string; channel: string; text: string; mediaIds: string[]; status: "draft" | "planned"; scheduledLocal: string };
const channels = ["instagram", "facebook", "linkedin", "x", "tiktok", "pinterest", "youtube"];
const statuses = ["draft", "planned", "scheduled", "overdue", "publishing", "published", "failed", "cancelled"];
const plannerFilters: FilterField[] = [
  { key: "kind", label: "Type", type: "select", options: [{ label: "Blog posts", value: "blog" }, { label: "Social plans", value: "social" }] },
  { key: "channel", label: "Channel", type: "select", options: channels.map((value) => ({ label: value, value })) },
  { key: "status", label: "Status", type: "select", options: statuses.map((value) => ({ label: value, value })) },
];
const input = "h-10";
const card = "rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800";
const tabs = [{ label: "Calendar", href: "/marketing/content-planner?view=calendar" }, { label: "List", href: "/marketing/content-planner?view=list" }];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await apiFetch(path, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || "The request could not be completed.");
  return body as T;
}
function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function fromLocalInput(value: string, timezone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid date and time.");
  if (localInput(date) !== value) throw new Error("That local time does not exist because of a daylight-saving change. Choose another time.");
  for (let minutes = -180; minutes <= 180; minutes += 15) {
    if (minutes && localInput(new Date(date.getTime() + minutes * 60_000)) === value) throw new Error("That local time occurs twice because of a daylight-saving change. Choose a time outside the repeated hour.");
  }
  if (date.getTime() <= Date.now()) throw new Error("Choose a future date and time.");
  return { instant: date.toISOString(), timezone };
}
function dateLabel(value: string | null, timezone: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  if (!value) return "Unscheduled";
  try { return new Intl.DateTimeFormat(undefined, { ...options, timeZone: timezone }).format(new Date(value)); }
  catch { return new Date(value).toLocaleString(); }
}
function statusLabel(plan: Plan) {
  if (plan.status === "scheduled" && plan.scheduledAt && new Date(plan.scheduledAt).getTime() < Date.now()) return "Overdue";
  return plan.status;
}
function statusTone(status: string): "cyan" | "green" | "amber" | "red" | "neutral" {
  if (["published", "planned"].includes(status)) return "green";
  if (["failed", "Overdue"].includes(status)) return "red";
  if (["scheduled", "publishing"].includes(status)) return "amber";
  return "neutral";
}
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function calendarRange(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41, 23, 59, 59, 999);
  return { start, end };
}
function dayKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function ContentPlannerPage() {
  const { selectedProjectId } = useAdmin();
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "calendar";
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [unscheduledDrafts, setUnscheduledDrafts] = useState<Plan[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [blogError, setBlogError] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [mediaError, setMediaError] = useState("");
  const [kind, setKind] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [draftOffset, setDraftOffset] = useState(0);
  const [draftHasMore, setDraftHasMore] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Plan | null | "new">(null);
  const [form, setForm] = useState<PlanForm>({ kind: "blog", blogId: "", channel: channels[0], text: "", mediaIds: [], status: "draft", scheduledLocal: "" });
  const fetchSequence = useRef(0);
  const draftFetchSequence = useRef(0);

  async function refresh(nextOffset = 0, append = false) {
    if (!selectedProjectId) { setPlans([]); return; }
    const sequence = ++fetchSequence.current;
    setLoading(true); setError("");
    if (!append) setPlans([]);
    try {
      const params = new URLSearchParams({ projectId: selectedProjectId, limit: "100", offset: String(nextOffset) });
      const range = view === "calendar" ? calendarRange(anchor) : undefined;
      const start = range?.start ?? (fromDate ? new Date(`${fromDate}T00:00:00`) : undefined);
      const end = range?.end ?? (toDate ? new Date(`${toDate}T23:59:59.999`) : undefined);
      if (start) params.set("from", start.toISOString());
      if (end) params.set("to", end.toISOString());
      if (kind) params.set("kind", kind);
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);
      const data = await request<{ plans: Plan[]; hasMore: boolean }>(`/api/admin/content-plans?${params}`);
      if (sequence === fetchSequence.current) {
        setPlans((current) => append ? [...current, ...data.plans] : data.plans);
        setHasMore(data.hasMore); setOffset(nextOffset);
      }
    } catch (cause) { if (sequence === fetchSequence.current) setError(cause instanceof Error ? cause.message : "Could not load the content planner."); }
    finally { if (sequence === fetchSequence.current) setLoading(false); }
  }
  async function refreshUnscheduled(nextOffset = 0, append = false) {
    const sequence = ++draftFetchSequence.current;
    if (!selectedProjectId || view !== "calendar" || kind === "blog" || (status && status !== "draft")) { setUnscheduledDrafts([]); setDraftHasMore(false); setDraftLoading(false); return; }
    setDraftLoading(true);
    try {
      const params = new URLSearchParams({ projectId: selectedProjectId, kind: "social", status: "draft", limit: "100", offset: String(nextOffset) });
      if (channel) params.set("channel", channel);
      const data = await request<{ plans: Plan[]; hasMore: boolean }>(`/api/admin/content-plans?${params}`);
      if (sequence === draftFetchSequence.current) {
        const drafts = data.plans.filter((plan) => plan.scheduledAt === null);
        setUnscheduledDrafts((current) => append ? [...current, ...drafts] : drafts);
        setDraftHasMore(data.hasMore); setDraftOffset(nextOffset);
      }
    } catch (cause) {
      if (sequence === draftFetchSequence.current) setError(cause instanceof Error ? cause.message : "Could not load unscheduled social drafts.");
    } finally { if (sequence === draftFetchSequence.current) setDraftLoading(false); }
  }
  useEffect(() => { setOffset(0); setDraftOffset(0); void refresh(); void refreshUnscheduled(); }, [selectedProjectId, view, anchor, kind, channel, status, fromDate, toDate]);
  useEffect(() => {
    if (!selectedProjectId) return;
    setBlogsLoading(true); setBlogError("");
    void request<{ blogs: Blog[] }>(`/api/admin/blogs?projectId=${encodeURIComponent(selectedProjectId)}`).then((data) => setBlogs(data.blogs.filter((blog) => blog.status === "draft" && !blog.isPublished))).catch((cause) => { setBlogs([]); setBlogError(cause instanceof Error ? cause.message : "Could not load blog drafts."); }).finally(() => setBlogsLoading(false));
    void request<{ media: Media[] }>(`/api/admin/media?projectId=${encodeURIComponent(selectedProjectId)}`).then((data) => { setMedia(data.media.filter((item) => ["image", "video"].includes(item.mediaType))); setMediaError(""); }).catch((cause) => setMediaError(cause instanceof Error ? cause.message : "Media library is unavailable."));
  }, [selectedProjectId]);

  const openNew = () => { setForm({ kind: "blog", blogId: "", channel: channels[0], text: "", mediaIds: [], status: "draft", scheduledLocal: "" }); setError(""); setEditing("new"); };
  const openEdit = (plan: Plan) => {
    setForm({ kind: plan.kind, blogId: plan.blogId || "", channel: plan.channel || channels[0], text: plan.text || "", mediaIds: plan.mediaIds || [], status: plan.status === "planned" ? "planned" : "draft", scheduledLocal: plan.scheduledAt ? localInput(new Date(plan.scheduledAt)) : "" });
    setError(""); setEditing(plan);
  };
  async function save(event: FormEvent) {
    event.preventDefault(); if (!selectedProjectId || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      let payload: Record<string, unknown>;
      if (form.kind === "blog") {
        if (!form.blogId) throw new Error("Choose a blog draft to schedule.");
        const scheduled = fromLocalInput(form.scheduledLocal, timezone);
        payload = { projectId: selectedProjectId, kind: "blog", blogId: form.blogId, ...scheduled };
      } else {
        const scheduled = form.scheduledLocal ? fromLocalInput(form.scheduledLocal, timezone) : null;
        payload = { projectId: selectedProjectId, kind: "social", channel: form.channel, text: form.text, mediaIds: form.mediaIds, status: form.status, scheduledAt: scheduled?.instant ?? null, timezone };
      }
      await (editing && editing !== "new"
        ? request<{ plan: Plan }>(`/api/admin/content-plans/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : request<{ plan: Plan }>("/api/admin/content-plans", { method: "POST", body: JSON.stringify(payload) }));
      setNotice(editing && editing !== "new" ? "Plan updated." : "Plan created."); setEditing(null); await Promise.all([refresh(), refreshUnscheduled()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this plan."); }
    finally { setSaving(false); }
  }
  async function act(plan: Plan, action: "cancel" | "retry" | "publish-now") {
    if (!selectedProjectId) return;
    if (action === "cancel" && !window.confirm(plan.kind === "blog" ? "Cancel this schedule? The blog draft will remain unchanged." : "Cancel this social post plan?")) return;
    setError(""); setNotice("");
    try {
      await request(`/api/admin/content-plans/${plan.id}/${action}`, { method: "POST", body: JSON.stringify({ projectId: selectedProjectId }) });
      setNotice(action === "cancel" ? "Plan cancelled." : action === "retry" ? "Blog queued for retry." : "Blog queued for immediate publishing."); await Promise.all([refresh(), refreshUnscheduled()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update this plan."); }
  }

  const columns: DataTableColumn<Plan>[] = [
    { header: "Content", accessor: "id", render: (plan) => <div><p className="font-medium">{plan.kind === "blog" ? plan.blog?.title || "Unavailable blog" : `${plan.channel} post`}</p><p className="mt-1 max-w-xl truncate text-xs text-neutral-500">{plan.kind === "social" ? plan.text : plan.blog ? `/blogs/${plan.blog.slug}` : ""}</p>{plan.lastError && <p className="mt-1 max-w-xl text-xs text-red-700 dark:text-red-300">{plan.lastError}</p>}</div> },
    { header: "Type", accessor: "kind", render: (plan) => <span className="capitalize">{plan.kind === "blog" ? "Blog post" : `Social · ${plan.channel}`}</span> },
    { header: "Scheduled", accessor: "scheduledAt", render: (plan) => <span className="text-xs text-neutral-600 dark:text-neutral-300">{dateLabel(plan.scheduledAt, plan.timezone)}</span> },
    { header: "Status", accessor: "status", render: (plan) => <StatusPill tone={statusTone(statusLabel(plan))}>{statusLabel(plan)}</StatusPill> },
  ];
  const actions: DataTableActions<Plan> = {
    primary: { icon: Edit, label: "Edit", title: (plan) => `Edit ${plan.kind === "blog" ? "schedule" : "social plan"}`, disabled: (plan) => plan.status === "publishing" || plan.status === "published", onClick: openEdit },
    menu: [
      { icon: Send, label: "Publish now", disabled: (plan) => plan.kind !== "blog" || !["scheduled", "failed"].includes(plan.status), onClick: (plan) => void act(plan, "publish-now") },
      { icon: RotateCcw, label: "Retry publish", disabled: (plan) => plan.kind !== "blog" || plan.status !== "failed", onClick: (plan) => void act(plan, "retry") },
      { icon: Trash2, label: "Cancel plan", disabled: (plan) => !["draft", "planned", "scheduled", "failed"].includes(plan.status), onClick: (plan) => void act(plan, "cancel") },
      { icon: ExternalLink, label: "Open blog", disabled: (plan) => plan.kind !== "blog" || !plan.blogId, onClick: (plan) => window.location.assign(`/blogs/${plan.blogId}`) },
    ],
  };
  const days = useMemo(() => {
    const first = startOfMonth(anchor); const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [anchor]);
  const planByDay = useMemo(() => {
    const result = new Map<string, Plan[]>();
    for (const plan of plans) {
      if (!plan.scheduledAt) continue;
      const key = dayKey(new Date(plan.scheduledAt), plan.timezone);
      result.set(key, [...(result.get(key) || []), plan]);
    }
    return result;
  }, [plans]);
  const fmtDay = (date: Date) => dayKey(date, timezone);
  const todayKey = dayKey(new Date(), timezone);
  const filteredPlans = plans.filter((plan) => !search.trim() || `${plan.blog?.title || ""} ${plan.channel || ""} ${plan.text || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const missingMediaIds = mediaError ? [] : form.mediaIds.filter((id) => !media.some((item) => item.id === id));
  const filtersPopover = <FilterPopover
    filters={plannerFilters}
    value={{ kind, channel, status }}
    onApply={(values) => {
      setKind(values.kind || "");
      setChannel(values.channel || "");
      setStatus(values.status || "");
    }}
    onClear={() => {
      setKind("");
      setChannel("");
      setStatus("");
    }}
  />;

  return <PageFrame title="Content Planner" description="Plan blog publishing and organize social drafts in one project calendar." headerAction={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New plan</Button>}>
    <div className="space-y-5">
      <PageTabs items={tabs.map((tab) => ({ ...tab, active: (tab.href.includes("list") ? view === "list" : view === "calendar") }))} />
      {!selectedProjectId ? <div className={`${card} border-dashed p-10 text-center text-sm text-neutral-500`}>Select a project to plan content.</div> : <>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}<button className="ml-3 underline" onClick={() => void refresh()}>Try again</button></div>}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</p>}
        <AdminToolbar
          className="mb-1"
          leading={view === "calendar" ? <div className="flex min-h-11 flex-1 flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800">
              <Button variant="ghost" size="icon" aria-label="Previous month" className="h-9 w-9 px-0" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <h2 className="min-w-36 px-1 text-center text-xs font-normal text-neutral-800 dark:text-neutral-100">{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: timezone }).format(anchor)}</h2>
              <Button variant="ghost" size="icon" aria-label="Next month" className="h-9 w-9 px-0" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
            <Button variant="toolbar" size="sm" className="px-4" onClick={() => setAnchor(startOfMonth(new Date()))}>Today</Button>
          </div> : <label className="relative min-w-52 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><Input className="w-full pl-9" aria-label="Search planned content" placeholder="Search title, channel, or text" value={search} onChange={(event) => setSearch(event.target.value)} /></label>}
          actions={<>{filtersPopover}{view === "list" && <DateRangePopover from={fromDate} to={toDate} label="scheduled date" onFromChange={setFromDate} onToChange={setToDate} onClear={() => { setFromDate(""); setToDate(""); }} />}</>}
        />
        <p className="text-xs text-neutral-500">Times shown in {timezone}. Social plans are drafts only and will not be posted to a network.</p>
        {loading && !plans.length ? <div className={`${card} p-10 text-center text-sm text-neutral-500`}>Loading content plans…</div> : view === "calendar" ? <>
        <section className={`${card} overflow-hidden`} aria-label="Content calendar">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-700/70">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-300">{day}</div>)}</div>
              <div className="grid grid-cols-7">{days.map((day) => { const key = fmtDay(day); const items = planByDay.get(key) || []; const outsideMonth = day.getMonth() !== anchor.getMonth(); const isToday = key === todayKey; return <div key={key} className={`min-h-32 border-b border-r border-neutral-100 p-2.5 transition-colors last:border-r-0 dark:border-neutral-700 ${outsideMonth ? "bg-neutral-50/70 dark:bg-neutral-900" : "bg-white dark:bg-neutral-800"}`}>
                <div className="mb-2 flex items-center justify-between"><span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs tabular-nums ${isToday ? "bg-cyan-600 font-semibold text-white shadow-sm shadow-cyan-950/20 dark:bg-cyan-400 dark:text-neutral-950" : outsideMonth ? "text-neutral-400 dark:text-neutral-500" : "font-medium text-neutral-700 dark:text-neutral-100"}`}>{new Intl.DateTimeFormat(undefined, { day: "numeric", timeZone: timezone }).format(day)}</span>{items.length > 0 && <span className="text-[10px] tabular-nums text-neutral-400 dark:text-neutral-400">{items.length} {items.length === 1 ? "plan" : "plans"}</span>}</div>
                <div className="space-y-1.5">{items.slice(0, 3).map((plan) => {
                  const failed = statusLabel(plan) === "Overdue" || plan.status === "failed";
                  const published = plan.status === "published";
                  const eventTone = failed ? "border-red-200/80 bg-red-50 text-red-800 hover:bg-red-100 focus-visible:ring-red-500/40 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100 dark:hover:bg-red-950" : published ? "border-emerald-200/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-500/40 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-950" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 focus-visible:ring-cyan-500/40 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-600 dark:hover:text-white";
                  return <button key={plan.id} onClick={() => openEdit(plan)} className={`block w-full rounded-md border px-2 py-1.5 text-left text-[11px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 ${eventTone}`} title={`${statusLabel(plan)} · ${plan.lastError || dateLabel(plan.scheduledAt, plan.timezone)}`}><span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${failed ? "bg-red-500" : published ? "bg-emerald-500" : plan.kind === "blog" ? "bg-cyan-500" : "bg-neutral-400 dark:bg-neutral-500"}`} /><span className="truncate font-semibold">{dateLabel(plan.scheduledAt, plan.timezone, { hour: "numeric", minute: "2-digit" })} · {plan.kind === "blog" ? plan.blog?.title || "Blog post" : plan.channel}</span></span><span className="mt-1 block truncate pl-3 text-[10px] opacity-75">{statusLabel(plan)}</span></button>;
                })}{items.length > 3 && <p className="px-1.5 pt-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">+{items.length - 3} more plans</p>}</div>
              </div>; })}</div>
            </div>
          </div>
          {hasMore && <div className="border-t border-neutral-200 p-3 text-center dark:border-neutral-800"><Button variant="outline" disabled={loading} onClick={() => void refresh(offset + 100, true)}>Load more plans</Button></div>}
          {!plans.length && !loading && !unscheduledDrafts.length && <div className="p-10 text-center"><CalendarDays className="mx-auto h-6 w-6 text-neutral-400" /><p className="mt-2 text-sm font-medium">No plans in this month</p><p className="mt-1 text-sm text-neutral-500">Schedule a blog draft or add a social post plan.</p></div>}
        </section>
        {kind !== "blog" && (!status || status === "draft") && <section className={`${card} p-4`}><div className="mb-3"><h2 className="text-sm font-medium">Unscheduled social drafts</h2><p className="mt-1 text-xs text-neutral-500">These drafts appear in the list until a time is planned.</p></div>{unscheduledDrafts.length ? <div className="divide-y divide-neutral-100 dark:divide-neutral-800">{unscheduledDrafts.map((plan) => <div key={plan.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"><button className="min-w-0 flex-1 text-left" onClick={() => openEdit(plan)}><span className="block text-sm font-medium capitalize">{plan.channel} · Draft</span><span className="mt-1 block truncate text-xs text-neutral-500">{plan.text}</span></button><Button variant="outline" onClick={() => openEdit(plan)}>Edit</Button><Button variant="outline" disabled={draftLoading} onClick={() => void act(plan, "cancel")}>Cancel</Button></div>)}</div> : <p className="text-sm text-neutral-500">{draftLoading ? "Loading drafts…" : "No unscheduled social drafts."}</p>}{draftHasMore && <div className="mt-3 text-center"><Button variant="outline" disabled={draftLoading} onClick={() => void refreshUnscheduled(draftOffset + 100, true)}>Load more drafts</Button></div>}</section>}
        </> : <>
          <DataTable<Plan> data={filteredPlans} columns={columns} actions={actions} loading={loading} manualSorting searchableColumns={["id", "channel", "text", "status"]} emptyState={{ icon: List, message: plans.length ? "No plans match this search" : "No content plans yet", description: "Create a blog schedule or a social draft to start planning." }} pagination={{ enabled: false, currentPage: 1, itemsPerPage: 100, onPageChange: () => undefined }} />
          <div className="flex items-center justify-between px-2 text-xs text-neutral-500"><span>{offset + 1}–{offset + plans.length}{hasMore ? " · more available" : ""}</span><div className="flex gap-2"><Button variant="outline" disabled={offset === 0 || loading} onClick={() => void refresh(Math.max(0, offset - 100))}>Previous</Button><Button variant="outline" disabled={!hasMore || loading} onClick={() => void refresh(offset + 100)}>Next</Button></div></div>
        </>}
        {hasMore && view === "list" && <p className="text-center text-xs text-neutral-500">Use Next to load more results.</p>}
      </>}
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}><DialogContent showCloseButton={false} className="block max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl border-neutral-200 bg-white p-5 text-neutral-900 outline-none ring-0 focus:outline-none focus-visible:ring-0 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"><form onSubmit={(event) => void save(event)} className="space-y-4">
      <div className="flex items-start justify-between gap-4"><div><DialogTitle id="planner-form-title" className="text-lg font-medium">{editing === "new" ? "New content plan" : "Edit content plan"}</DialogTitle><DialogDescription className="mt-1 text-sm text-neutral-500">Times use {timezone}.</DialogDescription></div><Button type="button" variant="ghost" size="icon" disabled={saving} onClick={() => setEditing(null)} aria-label="Close" className="h-8 w-8 text-neutral-500 dark:text-neutral-400"><X className="h-4 w-4" /></Button></div>
      {editing === "new" && <label className="grid gap-1 text-sm">Plan type<Select value={form.kind} onValueChange={(value) => setForm({ ...form, kind: value as PlanForm["kind"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blog">Schedule a blog draft</SelectItem><SelectItem value="social">Social post draft</SelectItem></SelectContent></Select></label>}
      {editing && editing !== "new" && editing.lastError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{editing.lastError}</p>}
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
      {form.kind === "blog" ? <><label className="grid gap-1 text-sm">Blog draft<Select value={form.blogId || undefined} onValueChange={(blogId) => setForm({ ...form, blogId })}><SelectTrigger><SelectValue placeholder="Choose an unpublished draft" /></SelectTrigger><SelectContent>{blogs.map((blog) => <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>)}</SelectContent></Select></label>{blogsLoading ? <p className="text-sm text-neutral-500">Loading blog drafts…</p> : blogError ? <p role="alert" className="text-sm text-red-700">Blog drafts could not be loaded: {blogError}</p> : !blogs.length && <p className="text-sm text-neutral-500">No unpublished blog drafts. <Link className="text-cyan-700 underline" href="/blogs">Create a blog draft</Link> and return here to schedule it.</p>}<label className="grid gap-1 text-sm">Publish at<Input required type="datetime-local" className={input} value={form.scheduledLocal} onChange={(event) => setForm({ ...form, scheduledLocal: event.target.value })} /></label><p className="text-xs leading-5 text-neutral-500">The planner publishes this blog draft automatically. “Publish now” is available from the plan actions.</p></> : <><label className="grid gap-1 text-sm">Channel<Select value={form.channel} onValueChange={(channel) => setForm({ ...form, channel })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{channels.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1 text-sm">Post text<Textarea required rows={5} maxLength={5000} className="min-h-28" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} /><span className="text-right text-xs text-neutral-500">{form.text.length}/5000</span></label><fieldset><legend className="mb-2 text-sm">Media (optional)</legend>{mediaError ? <p className="text-xs text-neutral-500">Media library unavailable: {mediaError}</p> : media.length ? <div className="max-h-32 space-y-1 overflow-auto rounded-md border border-neutral-200 p-2 dark:border-neutral-600">{media.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.mediaIds.includes(item.id)} onChange={(event) => setForm({ ...form, mediaIds: event.target.checked ? [...form.mediaIds, item.id].slice(0, 10) : form.mediaIds.filter((id) => id !== item.id) })} /><span className="truncate">{item.name}</span></label>)}</div> : <p className="text-xs text-neutral-500">No image or video assets available.</p>}</fieldset><label className="grid gap-1 text-sm">Workflow status<Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as PlanForm["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="planned">Planned</SelectItem></SelectContent></Select></label><label className="grid gap-1 text-sm">Scheduled time {form.status === "planned" ? "(required)" : "(optional)"}<Input required={form.status === "planned"} type="datetime-local" className={input} value={form.scheduledLocal} onChange={(event) => setForm({ ...form, scheduledLocal: event.target.value })} /></label><p className="text-xs leading-5 text-neutral-500">Social plans are for planning only. Velozy will not connect to or post on your social accounts.</p></>}
      {form.kind === "social" && missingMediaIds.length > 0 && <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><p>Some attached media is no longer available. Remove those references before saving.</p><div className="mt-2 flex flex-wrap gap-2">{missingMediaIds.map((id) => <button key={id} type="button" className="rounded border border-amber-300 px-2 py-1 font-mono text-xs underline dark:border-amber-800" onClick={() => setForm({ ...form, mediaIds: form.mediaIds.filter((mediaId) => mediaId !== id) })}>Remove {id.slice(0, 8)}…</button>)}</div></div>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving}>{saving ? "Saving…" : editing === "new" ? "Create plan" : "Save changes"}</Button></div>
    </form></DialogContent></Dialog>
  </PageFrame>;
}
