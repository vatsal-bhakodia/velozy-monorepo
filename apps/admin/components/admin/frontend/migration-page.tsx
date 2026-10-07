"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  FileUp,
  Loader2,
  Package,
  RotateCcw,
  ShieldCheck,
  Store,
} from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import RecordTable, { type RecordFilter } from "@/components/admin/manage/record-table";
import type { DataTableColumn } from "@/components/admin/manage/table";
import { PageFrame, SectionCard, StatCard, StatusPill } from "./page-frame";

type Platform = "shopify" | "woocommerce";
type PreviewRecord = {
  externalId: string;
  product: { name: string; sku?: string | null };
  variants: unknown[];
  media: string[];
  metadata: Record<string, unknown>;
  warnings: string[];
};
type Preview = {
  runId: string;
  platform: Platform;
  profiles: string[];
  headers: string[];
  records: PreviewRecord[];
  counts: { products: number; warnings: number; errors: number };
};
type ImportResult = {
  runId: string;
  status: string;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  rollbackRemoved?: number;
};
type IssueRow = {
  id: string;
  sourceRowNumber: number;
  status: string;
  rawRow: Record<string, string>;
  normalizedRecord: PreviewRecord | null;
  errors: string[];
  warnings: string[];
};
type PreviewRow = PreviewRecord & { id: string; productName: string; warningText: string };
type IssueTableRow = IssueRow & { productName: string; sourceId: string; issueText: string };

const platformNames: Record<Platform, string> = { shopify: "Shopify", woocommerce: "WooCommerce" };
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white";
const secondaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800";

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export default function MigrationPage() {
  const { selectedProjectId } = useAdmin();
  const location = useLocation();
  const legacyPlatform = new URLSearchParams(location.search).get("platform");
  const [platform, setPlatform] = useState<Platform | null>(() =>
    legacyPlatform === "shopify" || legacyPlatform === "woocommerce" ? legacyPlatform : null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [issuePage, setIssuePage] = useState(1);
  const [issueTotal, setIssueTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [message, setMessage] = useState("");
  const operation = useRef(0);
  const lastProject = useRef<{ initialized: boolean; id: string | null }>({ initialized: false, id: null });

  useEffect(() => {
    if (!lastProject.current.initialized) {
      if (selectedProjectId) lastProject.current = { initialized: true, id: selectedProjectId };
      return;
    }
    if (lastProject.current.id === selectedProjectId) return;
    lastProject.current = { initialized: true, id: selectedProjectId };
    operation.current += 1;
    setPlatform(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setIssues([]);
    setIssuePage(1);
    setIssueTotal(0);
    setBusy(false);
    setLoadingIssues(false);
    setMessage("");
  }, [selectedProjectId]);

  const loadFailedRows = useCallback(async (runId: string, page: number, requestId: number) => {
    if (!selectedProjectId) return;
    setLoadingIssues(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        rowStatus: "failed",
        page: String(page),
        pageSize: "100",
      });
      const response = await apiFetch(`/api/admin/migration/${runId}?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load failed rows.");
      if (requestId === operation.current) {
        setIssues(data.rows ?? []);
        setIssueTotal(data.pagination?.total ?? 0);
      }
    } catch (error) {
      if (requestId === operation.current) setMessage(error instanceof Error ? error.message : "Could not load failed rows.");
    } finally {
      if (requestId === operation.current) setLoadingIssues(false);
    }
  }, [selectedProjectId]);

  const selectPlatform = (value: Platform) => {
    operation.current += 1;
    setPlatform(value);
    setFile(null);
    setPreview(null);
    setResult(null);
    setIssues([]);
    setMessage("");
  };

  const previewFile = async () => {
    if (!file || !selectedProjectId || !platform) return;
    const requestId = ++operation.current;
    setBusy(true);
    setMessage("");
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a CSV file.");
      if (file.size > 20 * 1024 * 1024) throw new Error("CSV files must be 20 MB or smaller.");
      const form = new FormData();
      form.append("file", file);
      const response = await apiFetch(
        `/api/admin/migration?projectId=${encodeURIComponent(selectedProjectId)}&platform=${platform}`,
        { method: "POST", body: form },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not read this CSV.");
      if (requestId === operation.current) setPreview(data as Preview);
    } catch (error) {
      if (requestId === operation.current) setMessage(error instanceof Error ? error.message : "Could not read this CSV.");
    } finally {
      if (requestId === operation.current) setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview || !selectedProjectId) return;
    const requestId = ++operation.current;
    setBusy(true);
    setMessage("");
    try {
      const response = await apiFetch(
        `/api/admin/migration?projectId=${encodeURIComponent(selectedProjectId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: preview.runId }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed.");
      if (requestId !== operation.current) return;
      const completed: ImportResult = {
        runId: preview.runId,
        status: data.status,
        imported: data.imported ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
      };
      setResult(completed);
      setPreview(null);
      setFile(null);
      setIssuePage(1);
      await loadFailedRows(completed.runId, 1, requestId);
    } catch (error) {
      if (requestId === operation.current) setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      if (requestId === operation.current) setBusy(false);
    }
  };

  const retryFailed = async () => {
    if (!result || !selectedProjectId || result.failed === 0) return;
    const requestId = ++operation.current;
    setBusy(true);
    setMessage("");
    try {
      if (result.status !== "preview") {
        const retry = await apiFetch(`/api/admin/migration/${result.runId}/retry?projectId=${encodeURIComponent(selectedProjectId)}`, { method: "POST" });
        const retryData = await retry.json();
        if (!retry.ok) throw new Error(retryData.error || "Could not retry failed rows.");
        if (requestId !== operation.current) return;
        // The API moves the run back to preview before processing its failed rows.
        // Preserve that state so a failed commit request can be resumed safely.
        setResult({ ...result, status: "preview" });
      }
      const response = await apiFetch(`/api/admin/migration?projectId=${encodeURIComponent(selectedProjectId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: result.runId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Retry failed.");
      if (requestId !== operation.current) return;
      const completed = { ...result, status: data.status, imported: data.imported ?? 0, updated: data.updated ?? 0, skipped: data.skipped ?? 0, failed: data.failed ?? 0 };
      setResult(completed);
      setIssuePage(1);
      await loadFailedRows(result.runId, 1, requestId);
    } catch (error) {
      if (requestId === operation.current) setMessage(error instanceof Error ? error.message : "Retry failed.");
    } finally {
      if (requestId === operation.current) setBusy(false);
    }
  };

  const rollback = async () => {
    if (!result || !selectedProjectId) return;
    if (!window.confirm("Remove products created by this import when they have no order, cart, inventory history, or other source references? Updates to existing products will remain.")) return;
    const requestId = ++operation.current;
    setBusy(true);
    setMessage("");
    try {
      const response = await apiFetch(`/api/admin/migration?projectId=${encodeURIComponent(selectedProjectId)}&runId=${result.runId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Rollback could not be completed.");
      if (requestId !== operation.current) return;
      setResult({ ...result, status: "rolled_back", rollbackRemoved: data.removed ?? 0 });
      setIssues([]);
      setIssueTotal(0);
    } catch (error) {
      if (requestId === operation.current) setMessage(error instanceof Error ? error.message : "Rollback could not be completed.");
    } finally {
      if (requestId === operation.current) setBusy(false);
    }
  };

  const startAnother = () => {
    operation.current += 1;
    setPlatform(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setIssues([]);
    setIssuePage(1);
    setIssueTotal(0);
    setMessage("");
  };

  const previewRows: PreviewRow[] = (preview?.records ?? []).map((record) => ({
    ...record,
    id: record.externalId,
    productName: record.product.name,
    warningText: asArray(record.warnings).join("; "),
  }));
  const previewColumns = useMemo<DataTableColumn<PreviewRow>[]>(() => [
    { header: "Product", accessor: "productName", render: (record) => <div><p className="font-medium text-neutral-900 dark:text-neutral-100">{record.productName}</p><p className="mt-1 text-xs text-neutral-500">SKU: {record.product.sku || "—"} · Source ID: {record.externalId}</p></div> },
    { header: "Variants", accessor: "variants", render: (record) => <span>{record.variants.length}</span> },
    { header: "Images", accessor: "media", render: (record) => <span>{record.media.length}</span> },
    { header: "Review", accessor: "warningText", render: (record) => record.warningText ? <span className="text-amber-700 dark:text-amber-300">{record.warningText}</span> : <span className="text-neutral-400">Ready</span> },
  ], []);
  const previewFilters: RecordFilter<PreviewRow>[] = [
    { key: "productName", label: "Product", placeholder: "Search products..." },
    { key: "externalId", label: "Source ID", placeholder: "Search source ID..." },
    { key: "warningText", label: "Review", placeholder: "Search warnings..." },
  ];
  const issueRows: IssueTableRow[] = issues.map((row) => ({
    ...row,
    productName: row.normalizedRecord?.product?.name ?? row.rawRow?.Name ?? row.rawRow?.Title ?? "Unknown product",
    sourceId: row.normalizedRecord?.externalId ?? "—",
    issueText: [...asArray(row.errors), ...asArray(row.warnings)].join("; "),
  }));
  const issueColumns: DataTableColumn<IssueTableRow>[] = [
    { header: "Source row", accessor: "sourceRowNumber" },
    { header: "Product", accessor: "productName" },
    { header: "Source ID", accessor: "sourceId" },
    { header: "Issue", accessor: "issueText", render: (row) => <span className="text-red-700 dark:text-red-300">{row.issueText || "Needs review"}</span> },
  ];

  return (
    <PageFrame
      title="Migrate a product catalog"
      description="Choose the platform you’re moving from, then preview and import its product catalog."
    >
      {!platform ? (
        <SectionCard title="Which platform are you moving from?" description="Choose the platform that produced your product export.">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["shopify", "woocommerce"] as const).map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => selectPlatform(source)}
                className="group flex min-h-24 items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"><Store className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">{platformNames[source]}</span>
                  <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">Import products from a {platformNames[source]} CSV export</span>
                </span>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </SectionCard>
      ) : result ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><StatusPill tone={result.status === "committed" ? "green" : result.status === "rolled_back" ? "neutral" : result.failed ? "red" : "amber"}>{result.status.replaceAll("_", " ")}</StatusPill><span className="text-sm text-neutral-500">{platformNames[platform]} import</span></div>
            <div className="flex flex-wrap gap-2">
              <Link to="/products" className={secondaryButtonClass}><Package className="h-4 w-4" /> View products</Link>
              {result.failed > 0 && <button type="button" disabled={busy} onClick={() => void retryFailed()} className={secondaryButtonClass}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}{result.status === "preview" ? "Resume retry" : "Retry failed rows"}</button>}
              {["committed", "partial"].includes(result.status) && <button type="button" disabled={busy} onClick={() => void rollback()} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"><RotateCcw className="h-4 w-4" /> Roll back created products</button>}
              <button type="button" disabled={busy} onClick={startAnother} className={buttonClass}>Start another import</button>
            </div>
          </div>
          <SectionCard title="Import results" description="The result is saved in migration history. Updates to products that existed before this run are not rolled back.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Imported", result.imported],
                ["Updated", result.updated],
                ["Skipped", result.skipped],
                ["Failed", result.failed],
              ].map(([label, count]) => (
                <StatCard
                  key={label}
                  label={String(label)}
                  value={String(count)}
                />
              ))}
            </div>
            {result.rollbackRemoved !== undefined && <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Removed {result.rollbackRemoved} product(s) created by this run.</p>}
          </SectionCard>
          {message && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}
          {(issueTotal > 0 || loadingIssues) && <RecordTable<IssueTableRow>
            contained
            title="Rows that need attention"
            description={`${issueTotal.toLocaleString()} failed source row(s). Correct the source or resolve the catalog conflict, then retry.`}
            data={issueRows}
            columns={issueColumns}
            loading={loadingIssues}
            aboveTable={issueTotal > 100 ? <div className="mb-3 flex items-center justify-end gap-3 text-xs text-neutral-500"><span>Page {issuePage} of {Math.ceil(issueTotal / 100)}</span><button type="button" disabled={issuePage <= 1 || loadingIssues} onClick={() => { const page = issuePage - 1; setIssuePage(page); void loadFailedRows(result.runId, page, operation.current); }} className="rounded border border-neutral-200 px-3 py-1.5 disabled:opacity-40 dark:border-neutral-700">Previous</button><button type="button" disabled={issuePage >= Math.ceil(issueTotal / 100) || loadingIssues} onClick={() => { const page = issuePage + 1; setIssuePage(page); void loadFailedRows(result.runId, page, operation.current); }} className="rounded border border-neutral-200 px-3 py-1.5 disabled:opacity-40 dark:border-neutral-700">Next</button></div> : undefined}
            emptyState={{ icon: Check, message: "No failed rows", description: "All source rows were processed successfully." }}
          />}
        </div>
      ) : (
        <div className="space-y-5">
          <button type="button" disabled={busy} onClick={startAnother} className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Choose a different platform</button>
          <div className="grid gap-5 xl:grid-cols-[minmax(280px,.75fr)_minmax(0,1.25fr)]">
            <SectionCard title={`Upload ${platformNames[platform]} export`} description={platform === "shopify" ? "Use Shopify’s product CSV export." : "Use WooCommerce’s Product CSV Importer export."}>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center transition-colors hover:border-neutral-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-600/30 dark:border-neutral-600 dark:bg-[#1e1e1f] dark:hover:border-neutral-500">
                <FileUp className="mb-3 h-8 w-8 text-cyan-700 dark:text-cyan-300" />
                <span className="text-sm text-neutral-900 dark:text-neutral-100">{file?.name || "Choose a CSV file"}</span>
                <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">CSV up to 20 MB, including quoted and multiline fields</span>
                <input type="file" accept=".csv,text/csv" disabled={busy || !selectedProjectId} className="sr-only" onChange={(event) => { operation.current += 1; setFile(event.target.files?.[0] ?? null); setPreview(null); setMessage(""); event.currentTarget.value = ""; }} />
              </label>
              <button type="button" disabled={!file || !selectedProjectId || busy} onClick={() => void previewFile()} className={`mt-4 w-full ${buttonClass}`}>
                {busy && !result ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Preview catalog
              </button>
              {!selectedProjectId && <p role="status" className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Select a project before uploading a catalog.</p>}
              {message && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}
              {preview && <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"><div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span>Review the detected records and warnings before committing.</span></div><button type="button" disabled={busy} onClick={() => void commit()} className={buttonClass}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Commit import</button></div>}
            </SectionCard>

            <div className="min-w-0 space-y-5">
              {!preview ? <SectionCard title="Preview before import" description="Your catalog is not changed until you commit."><div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center dark:border-neutral-700 dark:bg-[#1e1e1f]"><Package className="mb-3 h-7 w-7 text-neutral-400" /><p className="text-sm text-neutral-700 dark:text-neutral-300">Choose a CSV export to review products, variants, images, inventory, categories, and source metadata.</p></div></SectionCard> : <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Products", preview.counts.products],
                    ["Warnings", preview.counts.warnings],
                    ["Columns", preview.headers.length],
                  ].map(([label, count]) => (
                    <StatCard key={label} label={String(label)} value={String(count)} />
                  ))}
                </div>
                {preview.counts.warnings > 0 && <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Warnings are shown on each affected product. Invalid price, stock, or source identity values will fail safely during commit.</p>}
                <RecordTable<PreviewRow>
                  contained
                  title={`${platformNames[platform]} product preview`}
                  description={`Detected ${preview.profiles.join(", ")}. Review the complete product list before importing.`}
                  data={previewRows}
                  columns={previewColumns}
                  filters={previewFilters}
                  exportName={`${platform}-migration-preview`}
                  loading={busy}
                  emptyState={{ icon: Database, message: "No products found", description: "This export did not contain importable products." }}
                />
              </>}
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
