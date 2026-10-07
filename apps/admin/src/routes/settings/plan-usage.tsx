import { useAdmin } from "@/src/admin-context";
import { apiRequest } from "@/src/lib/api";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CircleHelp, FileText } from "lucide-react";
import { PageFrame } from "@/components/admin/frontend/page-frame";

type Usage = {
  period: { from: string; to: string };
  pageViews: string;
  daily: Array<{ periodStart: string; pageViews: string }>;
  billing: "not_configured";
};
const card =
  "rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

export default function PlanUsage() {
  const { selectedProjectId } = useAdmin();
  const query = useQuery({
    queryKey: ["plan-usage", selectedProjectId],
    queryFn: () =>
      apiRequest<Usage>(
        `/api/admin/growth/usage?projectId=${selectedProjectId}`,
      ),
    enabled: Boolean(selectedProjectId),
    staleTime: 60_000,
  });
  const total = Number(query.data?.pageViews || 0);
  const rows = query.data?.daily || [];
  const max = Math.max(1, ...rows.map((row) => Number(row.pageViews || 0)));
  return (
    <PageFrame
      title="Plan & usage"
      eyebrow="Settings"
      description="Review published page views recorded for the current UTC billing period."
    >
      {!selectedProjectId ? (
        <div className={`${card} p-8 text-center text-sm text-neutral-500`}>
          Select a project to view usage.
        </div>
      ) : query.isLoading ? (
        <div className="py-12 text-sm text-neutral-500">Loading usage…</div>
      ) : query.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          Usage could not be loaded. {query.error.message}
        </div>
      ) : (
        <div className="space-y-5">
          <section
            className={`${card} grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-end`}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Published HTML page views
              </p>
              <p className="mt-2 text-4xl font-medium tracking-tight text-neutral-950 dark:text-neutral-50">
                {total.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {query.data?.period.from} – {query.data?.period.to} · UTC
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
              <BarChart3 className="h-4 w-4" /> Project and day totals only
            </div>
          </section>
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-medium">Daily usage</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Totals are deduplicated per published request and stored without
              visitor identifiers.
            </p>
            {rows.length ? (
              <div className="mt-5 overflow-x-auto">
                <div className="flex min-w-[620px] items-end gap-1 border-b border-neutral-200 pt-5 dark:border-neutral-800">
                  {rows.map((row) => (
                    <div
                      key={row.periodStart}
                      title={`${row.periodStart.slice(0, 10)}: ${Number(row.pageViews).toLocaleString()}`}
                      className="flex min-w-2 flex-1 items-end"
                    >
                      <div
                        className="w-full rounded-t-sm bg-neutral-800 dark:bg-neutral-200"
                        style={{
                          height: `${Math.max(2, (Number(row.pageViews) / max) * 130)}px`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-2 text-[10px] text-neutral-500">
                  <span>{rows[0].periodStart.slice(0, 10)}</span>
                  <span>{rows[rows.length - 1].periodStart.slice(0, 10)}</span>
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-neutral-500">
                No published page views have been recorded for this period.
              </p>
            )}
          </section>
          <section className={`${card} p-5`}>
            <div className="flex items-start gap-3">
              <CircleHelp className="mt-0.5 h-4 w-4 text-neutral-500" />
              <div>
                <h2 className="text-sm font-medium">Billing status</h2>
                <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  Billing is not configured yet. This page is informational
                  only; it does not show pricing or create subscriptions,
                  invoices, or charges.
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  The product team plans a soft usage limit with overage billing
                  after a billing provider is selected.
                </p>
              </div>
            </div>
          </section>
          <p className="flex items-center gap-2 text-xs text-neutral-500">
            <FileText className="h-3.5 w-3.5" /> Daily totals are retained for
            25 months. Automated requests and static assets are excluded.
          </p>
        </div>
      )}
    </PageFrame>
  );
}
