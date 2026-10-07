import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Globe, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";

type CustomDomain = {
  hostname: string;
  isVerified: boolean;
  isPrimary: boolean;
  recordName: string;
  recordValue: string | null;
};

export default function DomainsSettings() {
  const { selectedProjectId } = useAdmin();
  const [domain, setDomain] = useState<CustomDomain | null>(null);
  const [hostname, setHostname] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!selectedProjectId) { setDomain(null); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await apiFetch(`/api/admin/domains?projectId=${selectedProjectId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load domain settings");
      setIsPublished(data.isPublished === true);
      setDomain(data.domain ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load domain settings");
    } finally { setLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (path: string, method: string, body?: object) => {
    if (!selectedProjectId) return;
    setBusy(true);
    try {
      const response = await apiFetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update domain");
      setDomain(data.domain ?? null);
      if (method === "DELETE") setHostname("");
      toast.success(method === "POST" && path.endsWith("/verify") ? data.verified ? "Domain verified" : "DNS record not found yet" : method === "DELETE" ? "Custom domain removed" : "Domain added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update domain");
    } finally { setBusy(false); }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success("Copied to clipboard"); }
    catch { toast.error("Could not copy to clipboard"); }
  };

  if (loading) return <PageFrame title="Custom domain"><div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" /></PageFrame>;
  if (!selectedProjectId) return <PageFrame title="Custom domain"><div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" /><p className="text-sm text-neutral-600 dark:text-neutral-300">Select a business to configure its domain.</p></div></PageFrame>;

  return <PageFrame title="Custom domain">
    <div className="max-w-3xl space-y-5">
      <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
        <div className="flex items-start gap-3"><Globe className="mt-0.5 h-5 w-5 text-neutral-500" /><div><h2 className="text-base text-neutral-900 dark:text-neutral-100">Connect your domain</h2><p className="mt-1 text-sm text-neutral-500">Use a domain you own for your published site. Your Velozy subdomain will remain available as a fallback.</p></div></div>
        {!domain && <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void mutate("/api/admin/domains", "POST", { projectId: selectedProjectId, hostname }); }}>
          <Input aria-label="Custom domain" placeholder="example.com" value={hostname} onChange={(event) => setHostname(event.target.value)} className="flex-1" />
          <Button type="submit" disabled={busy || !hostname.trim() || !isPublished}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add domain"}</Button>
        </form>}
        {!domain && !isPublished && <p className="mt-3 text-xs text-neutral-500">Publish your site before connecting a custom domain.</p>}
        {domain && <div className="mt-5 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="break-all text-sm text-neutral-900 dark:text-neutral-100">{domain.hostname}</p><p className="mt-1 flex items-center gap-1.5 text-xs">{domain.isVerified ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Verified · primary domain</> : <><RefreshCw className="h-3.5 w-3.5 text-amber-600" />Waiting for DNS verification</>}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => void mutate("/api/admin/domains/verify", "POST", { projectId: selectedProjectId })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Verify DNS</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => void mutate(`/api/admin/domains?projectId=${selectedProjectId}`, "DELETE")}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove</Button></div></div>
          {!domain.isVerified && domain.recordValue && <div className="mt-4 rounded-md bg-neutral-50 p-4 dark:bg-neutral-800/60"><p className="text-sm text-neutral-800 dark:text-neutral-200">Add this TXT record at your DNS provider:</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="mb-1 text-xs text-neutral-500">Name / Host</p><div className="flex gap-2"><Input readOnly value={domain.recordName} /><Button type="button" variant="outline" size="icon" aria-label="Copy record name" onClick={() => void copy(domain.recordName)}><Copy className="h-4 w-4" /></Button></div></div><div><p className="mb-1 text-xs text-neutral-500">Value</p><div className="flex gap-2"><Input readOnly value={domain.recordValue} /><Button type="button" variant="outline" size="icon" aria-label="Copy record value" onClick={() => void copy(domain.recordValue!)}><Copy className="h-4 w-4" /></Button></div></div></div><p className="mt-3 text-xs text-neutral-500">DNS changes can take time to propagate. Verify again after the TXT record is visible. Traffic routing and HTTPS certificates must be enabled on the production proxy before the custom domain can serve your site.</p></div>}
        </div>}
      </section>
    </div>
  </PageFrame>;
}
