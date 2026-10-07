"use client";

import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Eye,
  Globe2,
  KeyRound,
  LockKeyhole,
  Monitor,
  MousePointerClick,
  ShieldCheck,
  Smartphone,
  Tablet,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/admin/frontend/page-frame";

type Range = "7 days" | "30 days" | "90 days";

const statCards = [
  { label: "Views", source: "Google Analytics", icon: Eye, iconColor: "text-blue-600 dark:text-blue-400" },
  { label: "Visitors", source: "Google Analytics", icon: Users, iconColor: "text-violet-600 dark:text-violet-400" },
  { label: "Search clicks", source: "Search Console", icon: MousePointerClick, iconColor: "text-green-600 dark:text-green-400" },
  { label: "Avg. position", source: "Search Console", icon: TrendingUp, iconColor: "text-amber-600 dark:text-amber-400" },
];

const surfaceClass =
  "rounded-lg border border-neutral-200 bg-white dark:border-[#303034] dark:bg-[#151517]";
const panelHeadingClass =
  "text-base font-normal text-neutral-950 dark:text-neutral-50";

function ConnectionStatus() {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Not connected
    </span>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-5 py-8 text-center dark:border-neutral-700 dark:bg-[#1e1e1f]"
      aria-label={`${label} unavailable until a source is connected`}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-[#151517] dark:text-neutral-400">
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Connect a source to view this report
      </p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        {label} will appear here once the account is connected.
      </p>
    </div>
  );
}

function ConnectLink({
  source,
  onConnect,
}: {
  source: string;
  onConnect: (source: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onConnect(source)}
      className="rounded-sm text-xs text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-blue-400 dark:hover:text-blue-300"
    >
      Connect now
    </button>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30 days");

  const showConnectToast = (source: string) => {
    toast(`${source} is not connected`, {
      description: "Connect the platform to start collecting live data.",
    });
  };

  return (
    <section className="-m-4 min-h-[calc(100vh-48px)] bg-white text-neutral-900 dark:bg-[#111111] dark:text-[#f0f0f0]">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 pb-8 pt-5 sm:px-8 lg:px-12">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-lg font-medium leading-6">Analytics</h1>
              <ConnectionStatus />
            </div>
            <p className="mt-1.5 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
              Monitor site traffic and search performance from one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Reporting range</span>
              <select
                value={range}
                onChange={(event) => setRange(event.target.value as Range)}
                className="h-9 appearance-none rounded-md border border-neutral-200 bg-white py-2 pl-3 pr-9 text-xs text-neutral-700 outline-none transition hover:border-neutral-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-cyan-500/25 dark:border-neutral-700 dark:bg-[#151517] dark:text-neutral-200 dark:hover:border-neutral-600"
              >
                <option>7 days</option>
                <option>30 days</option>
                <option>90 days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
            </label>
            <button
              type="button"
              onClick={() => showConnectToast("Google Analytics")}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-3.5 text-xs font-medium text-white transition hover:bg-cyan-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:ring-offset-2 dark:border-neutral-200 dark:bg-white dark:text-neutral-900 dark:hover:bg-cyan-400 dark:hover:text-neutral-950 dark:focus-visible:ring-offset-[#111111]"
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              Connect source
            </button>
          </div>
        </header>

        <section
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
          aria-label="Analytics summary"
        >
          {statCards.map(({ label, source, icon, iconColor }) => (
            <StatCard
              key={label}
              label={label}
              value="—"
              note={source}
              icon={icon}
              iconColor={iconColor}
            />
          ))}
        </section>

        <section
          className="grid gap-4 xl:grid-cols-2"
          aria-label="Performance reports"
        >
          <article className={`${surfaceClass} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={panelHeadingClass}>Traffic trend</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Views and visitors over the last {range}
                </p>
              </div>
              <ConnectionStatus />
            </div>
            <EmptyChart label="Traffic data" />
          </article>

          <article className={`${surfaceClass} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={panelHeadingClass}>Search performance</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Clicks and impressions from Search Console
                </p>
              </div>
              <ConnectionStatus />
            </div>
            <EmptyChart label="Search performance" />
          </article>
        </section>

        <section
          className="grid gap-4 xl:grid-cols-2"
          aria-label="Content reports"
        >
          <article className={`${surfaceClass} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound
                  className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
                  aria-hidden="true"
                />
                <h2 className={panelHeadingClass}>Trending keywords</h2>
              </div>
              <ConnectLink
                source="Search Console"
                onConnect={showConnectToast}
              />
            </div>
            <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
              <div className="grid grid-cols-[1fr_72px_92px] gap-3 bg-neutral-50 px-3 py-2.5 text-[11px] font-medium text-neutral-500 dark:bg-[#1e1e1f] dark:text-neutral-400">
                <span>Top search queries</span>
                <span className="text-right">Clicks</span>
                <span className="text-right">Position</span>
              </div>
              <div className="border-t border-neutral-200 px-3 py-4 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                Data will appear after Search Console is connected.
              </div>
            </div>
          </article>

          <article className={`${surfaceClass} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe2
                  className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
                  aria-hidden="true"
                />
                <h2 className={panelHeadingClass}>Top pages</h2>
              </div>
              <ConnectLink
                source="Google Analytics"
                onConnect={showConnectToast}
              />
            </div>
            <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {[
                "Most viewed pages",
                "Engagement rate",
                "Average session duration",
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">
                    {label}
                  </span>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    Not available
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section
          className="grid gap-4 xl:grid-cols-3"
          aria-label="Audience reports"
        >
          <article className={`${surfaceClass} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <Activity
                className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              />
              <h2 className={panelHeadingClass}>Acquisition channels</h2>
            </div>
            <div className="space-y-4">
              {["Organic search", "Direct", "Referral", "Social"].map(
                (channel) => (
                  <div key={channel} className="flex items-center gap-3">
                    <span className="flex-1 text-xs text-neutral-600 dark:text-neutral-300">
                      {channel}
                    </span>
                    <span className="w-5 text-right text-xs text-neutral-400">
                      —
                    </span>
                  </div>
                ),
              )}
            </div>
            <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400">
              Traffic sources unavailable
            </p>
          </article>

          <article className={`${surfaceClass} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <Smartphone
                className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              />
              <h2 className={panelHeadingClass}>Audience devices</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { device: "Desktop", icon: Monitor },
                { device: "Mobile", icon: Smartphone },
                { device: "Tablet", icon: Tablet },
              ].map(({ device, icon: Icon }) => (
                <div
                  key={device}
                  className="rounded-md border border-neutral-200 px-2 py-3 text-center dark:border-neutral-700"
                >
                  <Icon
                    className="mx-auto h-4 w-4 text-neutral-500 dark:text-neutral-400"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                    {device}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">—</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400">
              Device data unavailable
            </p>
          </article>

          <article className={`${surfaceClass} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <Target
                className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              />
              <h2 className={panelHeadingClass}>Conversion goals</h2>
            </div>
            <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {["Contact form submissions", "CTA clicks", "Purchases"].map(
                (goal) => (
                  <div
                    key={goal}
                    className="flex items-center justify-between gap-3 px-3 py-3"
                  >
                    <span className="text-xs text-neutral-600 dark:text-neutral-300">
                      {goal}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      —
                    </span>
                  </div>
                ),
              )}
            </div>
            <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400">
              Goals unavailable
            </p>
          </article>
        </section>

        <aside
          className={`${surfaceClass} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Your data stays private
              </h2>
              <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                Connections use read-only access and are scoped to this project.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              showConnectToast("Google Analytics and Search Console")
            }
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-700 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:border-neutral-700 dark:bg-[#151517] dark:text-neutral-300 dark:hover:bg-[#202022] sm:self-auto"
          >
            View connection options{" "}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </aside>

        <footer className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Connect Google Analytics or Search Console to populate these
            reports.
          </span>
        </footer>
      </div>
    </section>
  );
}
