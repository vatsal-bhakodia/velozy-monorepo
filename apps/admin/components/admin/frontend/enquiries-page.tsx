"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Edit, Eye, FileText, Mail, Plus, Send, Trash2 } from "lucide-react";
import { useAdmin } from "@/src/admin-context";
import { apiFetch } from "@/src/lib/api";
import { PageFrame, PageTabs, StatusPill } from "./page-frame";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "./page-frame";
import type { DataTableActions, DataTableColumn } from "@/components/admin/manage/table";
import RecordTable, { type RecordFilter } from "@/components/admin/manage/record-table";
import { FilterPopover } from "@/components/admin/manage/filter-popover";

type Field = { key: string; label: string; fieldType: string; required: boolean; options?: string[] | null; placeholder?: string | null; layout?: string | null };
type FormRecord = { id: string; name: string; purpose: string; status: string; fields: Field[]; submissionCount: number; pageUsageCount?: number; updatedAt: string };
type Note = { id: string; body: string; createdAt: string; authorId: string | null };
type Enquiry = { id: string; status: string; formId: string | null; payload: Record<string, unknown>; fieldSnapshot: Field[]; followUpAt: string | null; assignedTo: string | null; createdAt: string; contact: { name: string | null; email: string | null; phone: string | null } | null; form: FormRecord | null; page: { id: string; title: string; slug: string } | null; notes?: Note[] };
type Member = { id: string; name: string | null; email: string };
type Props = { view?: "inbox" | "forms" | "quotes" | "follow-ups" };

const enquiryTabs = [
  { label: "All enquiries", href: "/enquiries", active: false },
  { label: "Quote requests", href: "/enquiries/quotes", active: false },
  { label: "Follow-ups", href: "/enquiries/follow-ups", active: false },
];
const statuses = ["new", "open", "qualified", "closed", "spam"];
const initialFields: Field[] = [
  { key: "name", label: "Full name", fieldType: "text", required: true },
  { key: "email", label: "Email address", fieldType: "email", required: true },
  { key: "message", label: "Message", fieldType: "textarea", required: false },
];

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await apiFetch(path, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Could not complete the request");
  return data as T;
}
function dateLabel(value: string) { return new Date(value).toLocaleString(); }
function fieldValue(value: unknown) { return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "—"); }
function localDateTime(value: string) { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }

function FormLibrary({ projectId }: { projectId: string }) {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FormRecord | null>(null);
  const [saving, setSaving] = useState(false);
  async function refresh() {
    if (!projectId) { setForms([]); setLoading(false); return; }
    setLoading(true);
    try { setForms((await request<{ forms: FormRecord[] }>(`/api/admin/forms?projectId=${encodeURIComponent(projectId)}`)).forms); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load forms"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [projectId]);
  const updateField = (index: number, changes: Partial<Field>) => setEditing((current) => current ? ({ ...current, fields: current.fields.map((field, i) => i === index ? { ...field, ...changes } : field) }) : current);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!editing || saving) return;
    setSaving(true); setError("");
    try {
      const { id: formId, ...formData } = editing;
      await request<{ form: FormRecord }>(formId ? `/api/admin/forms/${formId}` : "/api/admin/forms", formId ? "PATCH" : "POST", { ...formData, ...(formId ? { id: formId } : {}), projectId });
      setEditing(null); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save form"); }
    finally { setSaving(false); }
  };
  const archive = async (form: FormRecord) => {
    if (!window.confirm(form.pageUsageCount ? `This form is used on ${form.pageUsageCount} page(s). Archiving it will stop those published forms from accepting submissions. Continue?` : "Archive this form? It will no longer accept new submissions.")) return;
    try { await request(`/api/admin/forms/${form.id}?projectId=${encodeURIComponent(projectId)}`, "DELETE"); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not archive form"); }
  };
  const columns: DataTableColumn<FormRecord>[] = [
    { header: "Form", accessor: "name", render: (form) => <div><p className="font-medium">{form.name}</p><p className="mt-1 text-xs capitalize text-neutral-500">{form.purpose}</p></div> },
    { header: "Fields", accessor: "fields", render: (form) => form.fields.length },
    { header: "Submissions", accessor: "submissionCount" },
    { header: "Pages using it", accessor: "pageUsageCount", render: (form) => form.pageUsageCount || 0 },
    { header: "Status", accessor: "status", render: (form) => <StatusPill tone={form.status === "active" ? "green" : "neutral"}>{form.status}</StatusPill> },
  ];
  const actions: DataTableActions<FormRecord> = {
    primary: { icon: Edit, label: "Edit", title: (form) => `Edit ${form.name}`, onClick: setEditing },
    menu: [{ icon: Archive, label: "Archive", disabled: (form) => form.status !== "active", onClick: (form) => void archive(form) }],
  };
  const filters: RecordFilter<FormRecord>[] = [
    { key: "name", label: "Form", placeholder: "Search by name..." },
    { key: "purpose", label: "Purpose", type: "select", options: ["general", "quote", "contact", "booking"].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })) },
    { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Archived", value: "archived" }] },
  ];
  return <>
    <RecordTable<FormRecord>
      title="Forms"
      description="Manage reusable forms and see how many submissions each one has received."
      data={forms}
      columns={columns}
      loading={loading}
      aboveTable={error ? <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{error}</p> : undefined}
      primaryAction={{ label: "Create form", onClick: () => setEditing({ id: "", name: "Contact form", purpose: "general", status: "active", fields: initialFields.map((field) => ({ ...field })), submissionCount: 0, updatedAt: "" }) }}
      filters={filters}
      dateRange="updatedAt"
      dateRangeLabel="Last updated"
      actions={actions}
      emptyState={{ icon: FileText, message: "No forms found", description: "Forms generated in the builder will be saved here for reuse." }}
    />
    <Dialog
      open={Boolean(editing)}
      onOpenChange={(open) => {
        if (!open && !saving) setEditing(null);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {editing && (
          <form onSubmit={(event) => void save(event)} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit form" : "Create form"}</DialogTitle>
              <DialogDescription>
                Configure the fields visitors can submit on your site.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Label className="grid gap-1.5">
                Form name
                <Input
                  required
                  maxLength={255}
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                />
              </Label>
              <Label className="grid gap-1.5">
                Purpose
                <Select
                  value={editing.purpose}
                  onValueChange={(purpose) => setEditing({ ...editing, purpose })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General enquiry</SelectItem>
                    <SelectItem value="quote">Quote request</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                  </SelectContent>
                </Select>
              </Label>
              {editing.id && (
                <Label className="grid gap-1.5">
                  Status
                  <Select
                    value={editing.status}
                    onValueChange={(status) => setEditing({ ...editing, status })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </Label>
              )}
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium">Fields</h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Add at least one field and provide options for choice fields.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      fields: [
                        ...editing.fields,
                        {
                          key: `field_${editing.fields.length + 1}`,
                          label: "New field",
                          fieldType: "text",
                          required: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Add field
                </Button>
              </div>

              {editing.fields.map((field, index) => (
                <div
                  key={`${field.key}-${index}`}
                  className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
                    <Label className="grid gap-1.5 text-xs">
                      Field label
                      <Input
                        value={field.label}
                        onChange={(event) =>
                          updateField(index, { label: event.target.value })
                        }
                      />
                    </Label>
                    <Label className="grid gap-1.5 text-xs">
                      Field key
                      <Input
                        value={field.key}
                        onChange={(event) =>
                          updateField(index, { key: event.target.value })
                        }
                        className="font-mono text-xs"
                      />
                    </Label>
                    <Label className="grid gap-1.5 text-xs">
                      Field type
                      <Select
                        value={field.fieldType}
                        onValueChange={(fieldType) =>
                          updateField(index, { fieldType })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["text", "email", "tel", "textarea", "select", "radio", "checkbox", "date"].map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${field.label || "field"}`}
                      disabled={editing.fields.length <= 1}
                      onClick={() =>
                        setEditing({
                          ...editing,
                          fields: editing.fields.filter((_, i) => i !== index),
                        })
                      }
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateField(index, { required: checked === true })
                      }
                    />
                    Required
                  </label>
                  {["select", "radio"].includes(field.fieldType) && (
                    <Label className="grid gap-1.5 text-xs">
                      Options, separated by commas
                      <Input
                        value={(field.options || []).join(", ")}
                        onChange={(event) =>
                          updateField(index, {
                            options: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Label>
                  )}
                </div>
              ))}
            </section>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button disabled={saving}>
                {saving ? "Saving…" : "Save form"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  </>;
}

function Inbox({ projectId, view }: { projectId: string; view: "inbox" | "quotes" | "follow-ups" }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [status, setStatus] = useState("");
  const [formId, setFormId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    if (!projectId) { setEnquiries([]); setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ projectId, view, limit: "50", offset: String((page - 1) * 50) });
      if (status) params.set("status", status);
      if (formId) params.set("formId", formId);
      if (search.trim()) params.set("q", search.trim());
      const data = await request<{ enquiries: Enquiry[]; total: number }>(`/api/admin/enquiries?${params}`);
      setEnquiries(data.enquiries); setTotal(data.total); setSelected((current) => current ? data.enquiries.find((item) => item.id === current.id) ? { ...data.enquiries.find((item) => item.id === current.id)!, notes: current.notes } : null : null); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load enquiries"); }
    finally { setLoading(false); }
  }
  useEffect(() => { setPage(1); }, [projectId, status, formId, search, view]);
  useEffect(() => { void refresh(); }, [projectId, status, formId, search, page, view]);
  useEffect(() => {
    if (!projectId) return;
    void Promise.all([request<{ members: Member[] }>(`/api/admin/enquiry-assignees?projectId=${projectId}`), request<{ forms: FormRecord[] }>(`/api/admin/forms?projectId=${projectId}`)]).then(([memberData, formData]) => { setMembers(memberData.members); setForms(formData.forms); }).catch(() => undefined);
  }, [projectId]);
  const title = view === "quotes" ? "Quote requests" : view === "follow-ups" ? "Follow-ups" : "Enquiries";
  const visibleForms = view === "quotes" ? forms.filter((form) => form.purpose === "quote") : forms;
  async function mutate(payload: Record<string, unknown>) {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try { await request(`/api/admin/enquiries/${selected.id}`, "PATCH", { projectId, ...payload }); await refresh(); await loadDetail(selected.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update enquiry"); }
    finally { setBusy(false); }
  }
  async function addNote(event: FormEvent) {
    event.preventDefault(); if (!selected || !note.trim() || busy) return;
    setBusy(true); setError("");
    try { await request(`/api/admin/enquiries/${selected.id}/notes`, "POST", { projectId, body: note.trim() }); setNote(""); await refresh(); await loadDetail(selected.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add note"); }
    finally { setBusy(false); }
  }
  async function loadDetail(enquiryId: string) {
    setSelected(enquiries.find((item) => item.id === enquiryId) ?? null);
    setDetailLoading(true);
    try { const data = await request<{ enquiry: Enquiry }>(`/api/admin/enquiries/${enquiryId}?projectId=${encodeURIComponent(projectId)}`); setSelected(data.enquiry); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load enquiry details"); }
    finally { setDetailLoading(false); }
  }
  const fields = useMemo(() => selected?.fieldSnapshot?.length ? selected.fieldSnapshot : Object.keys(selected?.payload || {}).map((key) => ({ key, label: key, fieldType: "text", required: false })), [selected]);
  const columns: DataTableColumn<Enquiry>[] = [
    { header: "Enquiry", accessor: "id", render: (item) => <div className="min-w-0"><p className="truncate font-medium">{item.contact?.name || item.contact?.email || "Website visitor"}</p><p className="mt-1 truncate text-xs text-neutral-500">{item.form?.name || "Legacy form"} · {Object.values(item.payload).map(fieldValue).join(" · ").slice(0, 90)}</p></div> },
    { header: "Status", accessor: "status", render: (item) => <StatusPill tone={item.status === "new" ? "cyan" : item.status === "closed" ? "green" : item.status === "spam" ? "red" : "amber"}>{item.status}</StatusPill> },
    { header: "Received", accessor: "createdAt", render: (item) => <span className="text-xs text-neutral-500">{dateLabel(item.createdAt)}</span> },
  ];
  const tableActions: DataTableActions<Enquiry> = {
    primary: { icon: Eye, label: "View", title: (item) => `View enquiry from ${item.contact?.name || item.contact?.email || "website visitor"}`, onClick: (item) => void loadDetail(item.id) },
    menu: [],
  };
  return (
    <>
      <RecordTable<Enquiry>
        title={title}
        description="Review submissions, assign owners, and keep follow-ups moving."
        data={enquiries}
        columns={columns}
        loading={loading}
        manualSorting
        serverPagination={{
          currentPage: page,
          itemsPerPage: 50,
          totalItems: total,
          onPageChange: setPage,
        }}
        subNavigation={
          <PageTabs
            items={enquiryTabs.map((tab) => ({
              ...tab,
              active:
                tab.href ===
                {
                  inbox: "/enquiries",
                  quotes: "/enquiries/quotes",
                  "follow-ups": "/enquiries/follow-ups",
                }[view],
            }))}
          />
        }
        trailingActions={
          <FilterPopover
            filters={[
              {
                key: "search",
                label: "Search",
                placeholder: "Search enquiries...",
              },
              {
                key: "status",
                label: "Status",
                type: "select",
                options: statuses.map((item) => ({
                  label: item[0].toUpperCase() + item.slice(1),
                  value: item,
                })),
              },
              {
                key: "formId",
                label: "Form",
                type: "select",
                options: visibleForms.map((form) => ({
                  label: form.name,
                  value: form.id,
                })),
              },
            ]}
            value={{ search, status, formId }}
            onApply={(next) => {
              setSearch(next.search || "");
              setStatus(next.status || "");
              setFormId(next.formId || "");
            }}
            onClear={() => {
              setSearch("");
              setStatus("");
              setFormId("");
            }}
          />
        }
        aboveTable={
          error ? (
            <p
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          ) : undefined
        }
        actions={tableActions}
        emptyState={{
          icon: Mail,
          message: `No matching ${title.toLowerCase()}`,
          description: "Submissions from published forms will appear here.",
        }}
      />

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.contact?.name || "Website visitor"}
                </DialogTitle>
                <DialogDescription>
                  #{selected.id.slice(0, 8)} · {dateLabel(selected.createdAt)}
                  {selected.contact?.email ? ` · ${selected.contact.email}` : ""}
                </DialogDescription>
              </DialogHeader>

              {detailLoading ? (
                <p className="text-sm text-neutral-500">Loading enquiry details…</p>
              ) : (
                <div className="space-y-4">
                  <SectionCard title="Submission details">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-neutral-500">Form</dt>
                        <dd className="mt-1">{selected.form?.name || "Legacy form"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-neutral-500">Page</dt>
                        <dd className="mt-1">
                          {selected.page ? (
                            <a
                              className="text-cyan-700 hover:underline dark:text-cyan-400"
                              href={`/${selected.page.slug}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {selected.page.title}
                            </a>
                          ) : "Unknown"}
                        </dd>
                      </div>
                      {selected.contact?.phone && (
                        <div>
                          <dt className="text-xs text-neutral-500">Phone</dt>
                          <dd className="mt-1">{selected.contact.phone}</dd>
                        </div>
                      )}
                    </dl>
                  </SectionCard>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Label className="mb-0 grid gap-1.5">
                      Status
                      <Select
                        value={selected.status}
                        disabled={busy}
                        onValueChange={(value) => void mutate({ status: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statuses.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item[0].toUpperCase() + item.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                    <Label className="mb-0 grid gap-1.5">
                      Assign to
                      <Select
                        value={selected.assignedTo || "unassigned"}
                        disabled={busy}
                        onValueChange={(value) =>
                          void mutate({ assignedTo: value === "unassigned" ? null : value })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name || member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                    <Label className="mb-0 grid gap-1.5 sm:col-span-2">
                      Follow-up due
                      <Input
                        type="datetime-local"
                        disabled={busy}
                        value={selected.followUpAt ? localDateTime(selected.followUpAt) : ""}
                        onChange={(event) =>
                          void mutate({
                            followUpAt: event.target.value
                              ? new Date(event.target.value).toISOString()
                              : null,
                          })
                        }
                      />
                    </Label>
                  </div>

                  <SectionCard title="Form responses">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {fields.map((field) => (
                        <div
                          key={field.key}
                          className="rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                        >
                          <dt className="text-xs text-neutral-500">{field.label}</dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                            {fieldValue(selected.payload[field.key])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </SectionCard>

                  <SectionCard title="Internal notes">
                    <div className="space-y-2">
                      {(selected.notes || []).map((item) => (
                        <p
                          key={item.id}
                          className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-sm dark:bg-neutral-800"
                        >
                          {item.body}
                          <span className="mt-1 block text-xs text-neutral-500">
                            {dateLabel(item.createdAt)}
                          </span>
                        </p>
                      ))}
                    </div>
                    <form onSubmit={(event) => void addNote(event)} className="mt-3 space-y-2">
                      <Textarea
                        aria-label="Add internal note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        maxLength={10000}
                        placeholder="Write an internal note"
                        className="min-h-20"
                      />
                      <div className="flex justify-end">
                        <Button disabled={busy || !note.trim()}>
                          <Send className="mr-2 h-4 w-4" /> Save note
                        </Button>
                      </div>
                    </form>
                  </SectionCard>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void mutate({ status: selected.status === "closed" ? "open" : "closed" })}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {selected.status === "closed" ? "Reopen" : "Archive"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void mutate({ status: selected.status === "spam" ? "new" : "spam" })}
                >
                  {selected.status === "spam" ? "Restore" : "Mark spam"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function EnquiriesPage({ view = "inbox" }: Props) {
  const { selectedProjectId } = useAdmin();
  if (view === "forms") {
    if (selectedProjectId) return <FormLibrary projectId={selectedProjectId} />;
    return (
      <PageFrame
        title="Forms"
        description="Manage reusable forms and see how many submissions each one has received."
      >
        <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Select a project to manage its forms.
        </div>
      </PageFrame>
    );
  }

  const activePath = {
    inbox: "/enquiries",
    quotes: "/enquiries/quotes",
    "follow-ups": "/enquiries/follow-ups",
  }[view];
  if (selectedProjectId)
    return <Inbox projectId={selectedProjectId} view={view} />;

  const navigation = (
    <PageTabs
      items={enquiryTabs.map((tab) => ({
        ...tab,
        active: tab.href === activePath,
      }))}
    />
  );

  return (
    <PageFrame
      title="Enquiries"
      description="Manage submissions from the forms published on your site."
    >
      <div className="space-y-5">
        {navigation}
        <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Select a project to manage its enquiries.
        </div>
      </div>
    </PageFrame>
  );
}
