"use client";

import Link from "@/components/router-link";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  DollarSign,
  Edit3,
  Eye,
  ExternalLink,
  FileText,
  ImageIcon,
  Plus,
  Search,
  ShoppingBag,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import {
  StatCard,
  type StatCardItem,
} from "@/components/admin/frontend/page-frame";
import { Button } from "@/components/ui/button";
import { useAdmin, type Project } from "@/src/admin-context";
import { apiRequest } from "@/src/lib/api";
import { useAdminQuery } from "@/src/lib/query";
import { useQuery } from "@tanstack/react-query";

type DashboardPage = {
  id: string;
  slug: string;
  title: string;
  status: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
};
type DashboardBlog = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
type DashboardMedia = {
  id: string;
  name: string;
  createdAt: string;
};
type DashboardSeoRecord = {
  id: string;
  type: string;
  title: string;
  slug: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
};
type ContentResponse<T> = { pages?: T[]; blogs?: T[]; media?: T[] };
type AnalyticsResponse = {
  summary?: { visitors: number; pageViews: number };
  daily?: Array<{ date: string; visitors: number; pageViews: number }>;
};
type RevenueResponse = {
  revenue: Array<{ currency: string; amount: string; orders: number }>;
};
type SeoResponse = { records?: DashboardSeoRecord[] };
type SiteHealthResponse = {
  configured: boolean;
  fieldData: {
    available: boolean;
    record?: {
      metrics?: Record<string, { percentiles?: { p75?: number } }>;
    };
  } | null;
};
type ConnectionResponse = {
  connections?: Array<{ provider: string; status: string }>;
};
type HealthCheck = {
  label: string;
  value: string;
  result: boolean | null;
  icon: React.ComponentType<{ className?: string }>;
};
type ActivityItem = {
  id: string;
  label: string;
  type: string;
  at: string;
  icon: React.ComponentType<{ className?: string }>;
};

const quickActions = [
  {
    label: "New page",
    description: "Create a site page",
    href: "/pages",
    icon: Plus,
  },
  {
    label: "Upload media",
    description: "Add a brand asset",
    href: "/media",
    icon: Upload,
  },
  {
    label: "Write a post",
    description: "Start a blog draft",
    href: "/blogs",
    icon: Edit3,
  },
];

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthRanges(now = new Date()) {
  const currentStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const previousStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const previousEnd = new Date(currentStart.getTime() - 86_400_000);
  return {
    current: { from: isoDay(currentStart), to: isoDay(now) },
    previous: { from: isoDay(previousStart), to: isoDay(previousEnd) },
  };
}

function lastThirtyDays(now = new Date()) {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: isoDay(from), to: isoDay(now) };
}

function analyticsPath(projectId: string, range: { from: string; to: string }) {
  return `/api/admin/growth/analytics?projectId=${encodeURIComponent(projectId)}&source=first_party&from=${range.from}&to=${range.to}`;
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1_000) / 10;
}

function formatPercentChange(change: number) {
  const value = Math.abs(change).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
  return `${change > 0 ? "+" : change < 0 ? "−" : ""}${value}%`;
}

function changeNote(current: number, previous: number) {
  const change = percentChange(current, previous);
  if (change === null) return "—";
  return formatPercentChange(change);
}

function changeTone(
  current: number,
  previous: number,
): StatCardItem["noteTone"] {
  if (previous <= 0) return "neutral";
  if (current === previous) return "neutral";
  return current < previous ? "negative" : "positive";
}

function formatMoney(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatRevenue(
  rows: RevenueResponse["revenue"],
  fallbackCurrency?: string,
) {
  if (!rows.length)
    return fallbackCurrency ? formatMoney("0", fallbackCurrency) : "—";
  return rows
    .filter((row) => Number(row.amount) !== 0 || rows.length === 1)
    .map((row) => formatMoney(row.amount, row.currency))
    .join(" · ");
}

function revenueChange(
  current: RevenueResponse["revenue"],
  previous: RevenueResponse["revenue"],
) {
  const currentByCurrency = new Map(
    current.map((row) => [row.currency, Number(row.amount)]),
  );
  const previousByCurrency = new Map(
    previous.map((row) => [row.currency, Number(row.amount)]),
  );
  const currencies = new Set([
    ...currentByCurrency.keys(),
    ...previousByCurrency.keys(),
  ]);
  if (!currencies.size) return { note: "—", tone: "neutral" as const };
  const changes = [...currencies].flatMap((currency) => {
    const value = currentByCurrency.get(currency) ?? 0;
    const prior = previousByCurrency.get(currency) ?? 0;
    if (prior <= 0) return [];
    const change = Math.round(((value - prior) / prior) * 1_000) / 10;
    return [
      {
        currency,
        change,
        label: formatPercentChange(change),
      },
    ];
  });
  if (!changes.length) return { note: "—", tone: "neutral" as const };
  const note =
    changes.length === 1
      ? changes[0].label
      : changes
          .map(({ currency, label }) => `${currency} ${label}`)
          .join(" · ");
  const hasIncrease = changes.some(({ change }) => change > 0);
  const hasDecrease = changes.some(({ change }) => change < 0);
  const tone =
    hasIncrease && hasDecrease
      ? ("review" as const)
      : hasDecrease
        ? ("negative" as const)
        : hasIncrease
          ? ("positive" as const)
          : ("neutral" as const);
  return { note, tone };
}

function activityType(kind: string, createdAt: string, updatedAt: string) {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  return `${kind} ${Number.isFinite(created) && Number.isFinite(updated) && updated > created + 1_000 ? "updated" : "created"}`;
}

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Date unavailable";
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    timestamp,
  );
}

function navigationItems(project: Project) {
  const preference = project.designPreference;
  if (!preference || typeof preference !== "object") return [];
  const navigation = preference.navigation as
    { menus?: Array<{ items?: unknown[] }> } | undefined;
  return navigation?.menus?.flatMap((menu) => menu.items ?? []) ?? [];
}

function CoreWebVitals({ data }: { data?: SiteHealthResponse }) {
  const metrics = data?.fieldData?.record?.metrics;
  const lcp = metrics?.largest_contentful_paint?.percentiles?.p75;
  const inp = metrics?.interaction_to_next_paint?.percentiles?.p75;
  const cls = metrics?.cumulative_layout_shift?.percentiles?.p75;
  const available = data?.configured && data.fieldData?.available;
  const complete = lcp != null && inp != null && cls != null;
  return {
    available: Boolean(available),
    complete,
    passed: complete && lcp! <= 2_500_000 && inp! <= 200_000 && cls! <= 0.1,
  };
}

function MiniChart({
  daily,
}: {
  daily: NonNullable<AnalyticsResponse["daily"]>;
}) {
  const byDay = new Map(daily.map((row) => [row.date, Number(row.pageViews)]));
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 29);
  const data = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    const key = isoDay(day);
    return {
      day: new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(day),
      views: byDay.get(key) ?? 0,
    };
  });
  const max = Math.max(1, ...data.map((item) => item.views));
  const chartConfig = {
    views: { label: "Views", color: "#0891b2" },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="h-48 w-full !aspect-auto"
      aria-label="Site views over the last 30 days"
    >
      <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient
            id="dashboard-activity-area"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#0891b2" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#0891b2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="currentColor"
          strokeOpacity={0.08}
        />
        <XAxis dataKey="day" hide />
        <YAxis
          width={52}
          domain={[0, max]}
          tickFormatter={formatCount}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={{
            stroke: "#0891b2",
            strokeDasharray: "3 3",
            strokeOpacity: 0.45,
          }}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-4 text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-600" />
                    Views
                  </span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatCount(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="views"
          stroke="#0891b2"
          strokeWidth={2.5}
          fill="url(#dashboard-activity-area)"
          activeDot={{ r: 4, stroke: "white", strokeWidth: 2, fill: "#0891b2" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export default function Dashboard() {
  const { projects, projectsLoading, selectedProjectId } = useAdmin();
  const project = projects.find((item) => item.id === selectedProjectId);
  const dates = monthRanges();
  const chartRange = lastThirtyDays();
  const enabled = Boolean(selectedProjectId);
  const pagesQuery = useAdminQuery<ContentResponse<DashboardPage>>(
    ["admin", "dashboard-pages", selectedProjectId],
    `/api/admin/pages?projectId=${selectedProjectId}`,
    enabled,
  );
  const blogsQuery = useAdminQuery<ContentResponse<DashboardBlog>>(
    ["admin", "dashboard-blogs", selectedProjectId],
    `/api/admin/blogs?projectId=${selectedProjectId}`,
    enabled,
  );
  const mediaQuery = useAdminQuery<ContentResponse<DashboardMedia>>(
    ["admin", "dashboard-media", selectedProjectId],
    `/api/admin/media?projectId=${selectedProjectId}`,
    enabled,
  );
  const seoQuery = useAdminQuery<SeoResponse>(
    ["admin", "dashboard-seo", selectedProjectId],
    `/api/admin/seo/records?projectId=${selectedProjectId}`,
    enabled,
  );
  const siteHealthQuery = useAdminQuery<SiteHealthResponse>(
    ["admin", "dashboard-site-health", selectedProjectId],
    `/api/admin/seo/site-health?projectId=${selectedProjectId}`,
    enabled,
  );
  const connectionsQuery = useAdminQuery<ConnectionResponse>(
    ["admin", "dashboard-growth-connections", selectedProjectId],
    `/api/admin/growth/connections?projectId=${selectedProjectId}`,
    enabled,
  );
  const thisMonthAnalytics = useAdminQuery<AnalyticsResponse>(
    [
      "admin",
      "dashboard-analytics",
      selectedProjectId,
      dates.current.from,
      dates.current.to,
    ],
    analyticsPath(selectedProjectId ?? "", dates.current),
    enabled,
  );
  const lastMonthAnalytics = useAdminQuery<AnalyticsResponse>(
    [
      "admin",
      "dashboard-analytics",
      selectedProjectId,
      dates.previous.from,
      dates.previous.to,
    ],
    analyticsPath(selectedProjectId ?? "", dates.previous),
    enabled,
  );
  const chartAnalytics = useAdminQuery<AnalyticsResponse>(
    [
      "admin",
      "dashboard-analytics",
      selectedProjectId,
      chartRange.from,
      chartRange.to,
    ],
    analyticsPath(selectedProjectId ?? "", chartRange),
    enabled,
  );
  const revenueEnabled = enabled && project?.storeType === "ecommerce";
  const thisMonthRevenue = useAdminQuery<RevenueResponse>(
    [
      "admin",
      "dashboard-revenue",
      selectedProjectId,
      dates.current.from,
      dates.current.to,
    ],
    `/api/admin/commerce/revenue-summary?projectId=${selectedProjectId}&from=${dates.current.from}&to=${dates.current.to}`,
    revenueEnabled,
  );
  const lastMonthRevenue = useAdminQuery<RevenueResponse>(
    [
      "admin",
      "dashboard-revenue",
      selectedProjectId,
      dates.previous.from,
      dates.previous.to,
    ],
    `/api/admin/commerce/revenue-summary?projectId=${selectedProjectId}&from=${dates.previous.from}&to=${dates.previous.to}`,
    revenueEnabled,
  );
  const tlsQuery = useQuery({
    queryKey: ["dashboard-site-tls", selectedProjectId, project?.publicUrl],
    enabled: Boolean(project?.publicUrl?.startsWith("https://")),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const response = await fetch(project!.publicUrl!, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      return response.type === "opaque" || response.ok;
    },
  });

  const pages = pagesQuery.data?.pages ?? [];
  const blogs = blogsQuery.data?.blogs ?? [];
  const media = mediaQuery.data?.media ?? [];
  const seoRecords = seoQuery.data?.records ?? [];
  const publishedPages = pages.filter((page) => page.status === "published");
  const drafts = pages.filter((page) => page.status === "draft");
  const currentAnalytics = thisMonthAnalytics.data?.summary;
  const previousAnalytics = lastMonthAnalytics.data?.summary;
  const views = Number(currentAnalytics?.pageViews ?? 0);
  const visitors = Number(currentAnalytics?.visitors ?? 0);
  const previousViews = Number(previousAnalytics?.pageViews ?? 0);
  const previousVisitors = Number(previousAnalytics?.visitors ?? 0);
  const currentOrders = (thisMonthRevenue.data?.revenue ?? []).reduce(
    (total, row) => total + row.orders,
    0,
  );
  const previousOrders = (lastMonthRevenue.data?.revenue ?? []).reduce(
    (total, row) => total + row.orders,
    0,
  );
  const publishedBlogs = blogs.filter(
    (blog) => blog.status === "published",
  ).length;
  const cwv = CoreWebVitals({ data: siteHealthQuery.data });
  const homePage = pages.find((page) => page.slug === "home");
  const metadataRecords = seoRecords.filter(
    (record) => record.status === "published",
  );
  const metadataComplete = metadataRecords.filter((record) =>
    Boolean(record.metaTitle?.trim() && record.metaDescription?.trim()),
  ).length;
  const vitals = siteHealthQuery.data?.fieldData?.record?.metrics;
  const performanceMeasured = Boolean(
    siteHealthQuery.data?.configured &&
    siteHealthQuery.data.fieldData?.available &&
    vitals?.largest_contentful_paint?.percentiles?.p75 != null &&
    vitals?.interaction_to_next_paint?.percentiles?.p75 != null &&
    vitals?.cumulative_layout_shift?.percentiles?.p75 != null,
  );
  const healthChecks: HealthCheck[] = [
    {
      label: "Pages published",
      value:
        pagesQuery.isLoading || pagesQuery.isError
          ? "—"
          : `${publishedPages.length} / ${pages.length}`,
      result:
        pagesQuery.isLoading || pagesQuery.isError
          ? null
          : pages.length > 0 && publishedPages.length === pages.length,
      icon: FileText,
    },
    {
      label: "SSL certificate",
      value: !project?.publicUrl
        ? "Not published"
        : tlsQuery.isLoading
          ? "Checking"
          : tlsQuery.isError
            ? "Could not verify"
            : tlsQuery.data
              ? "Active"
              : "Unavailable",
      result: !project?.publicUrl
        ? false
        : tlsQuery.isLoading
          ? null
          : tlsQuery.isError
            ? false
            : Boolean(tlsQuery.data),
      icon: ShieldCheck,
    },
    {
      label: "Search preview",
      value: pagesQuery.isLoading
        ? "Checking"
        : pagesQuery.isError
          ? "Unavailable"
          : !homePage
            ? "Home page missing"
            : homePage.metaTitle?.trim() && homePage.metaDescription?.trim()
              ? "Ready"
              : "Metadata missing",
      result:
        pagesQuery.isLoading || pagesQuery.isError
          ? null
          : Boolean(
              homePage?.status === "published" &&
              homePage.metaTitle?.trim() &&
              homePage.metaDescription?.trim(),
            ),
      icon: Search,
    },
    {
      label: "Mobile preview",
      value: siteHealthQuery.isLoading
        ? "Checking"
        : siteHealthQuery.isError
          ? "Unavailable"
          : !cwv.available
            ? "No field data"
            : "Phone field data available",
      result:
        siteHealthQuery.isLoading || siteHealthQuery.isError || !cwv.available
          ? null
          : true,
      icon: ImageIcon,
    },
    {
      label: "Page metadata",
      value:
        seoQuery.isLoading || seoQuery.isError
          ? "—"
          : `${metadataComplete} / ${metadataRecords.length} complete`,
      result:
        seoQuery.isLoading || seoQuery.isError
          ? null
          : metadataRecords.length > 0 &&
            metadataComplete === metadataRecords.length,
      icon: FileText,
    },
    {
      label: "Performance",
      value: siteHealthQuery.isLoading
        ? "Checking"
        : performanceMeasured
          ? cwv.passed
            ? "Good"
            : "Needs work"
          : "No field data",
      result: performanceMeasured ? cwv.passed : null,
      icon: BarChart3,
    },
  ];
  const measuredChecks = healthChecks.filter((check) => check.result !== null);
  const healthScore = measuredChecks.length
    ? Math.round(
        (measuredChecks.filter((check) => check.result).length /
          measuredChecks.length) *
          100,
      )
    : null;
  const healthColor =
    healthScore === null
      ? "neutral"
      : healthScore >= 80
        ? "green"
        : healthScore >= 50
          ? "amber"
          : "red";
  const healthColorClass = {
    neutral: "bg-neutral-400 dark:bg-neutral-600",
    green: "bg-green-600 dark:bg-green-500",
    amber: "bg-amber-500 dark:bg-amber-400",
    red: "bg-red-600 dark:bg-red-500",
  }[healthColor];
  const healthTextClass = {
    neutral: "text-neutral-500 dark:text-neutral-400",
    green: "text-green-700 dark:text-green-400",
    amber: "text-amber-700 dark:text-amber-400",
    red: "text-red-700 dark:text-red-400",
  }[healthColor];
  const revenueMovement = revenueChange(
    thisMonthRevenue.data?.revenue ?? [],
    lastMonthRevenue.data?.revenue ?? [],
  );

  const stats: StatCardItem[] = [
    {
      label: "Users",
      value: thisMonthAnalytics.isLoading
        ? "…"
        : thisMonthAnalytics.isError
          ? "—"
          : formatCount(visitors),
      note: thisMonthAnalytics.isError
        ? "Analytics unavailable"
        : changeNote(visitors, previousVisitors),
      noteTone: changeTone(visitors, previousVisitors),
      icon: Users,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Views",
      value: thisMonthAnalytics.isLoading
        ? "…"
        : thisMonthAnalytics.isError
          ? "—"
          : formatCount(views),
      note: thisMonthAnalytics.isError
        ? "Analytics unavailable"
        : changeNote(views, previousViews),
      noteTone: changeTone(views, previousViews),
      icon: Eye,
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    project?.storeType === "ecommerce"
      ? {
          label: "Orders",
          value: thisMonthRevenue.isLoading
            ? "…"
            : thisMonthRevenue.isError
              ? "—"
              : formatCount(currentOrders),
          note:
            thisMonthRevenue.isLoading ||
            thisMonthRevenue.isError ||
            lastMonthRevenue.isLoading ||
            lastMonthRevenue.isError
              ? "—"
              : changeNote(currentOrders, previousOrders),
          noteTone: changeTone(currentOrders, previousOrders),
          icon: ShoppingBag,
          iconColor: "text-amber-600 dark:text-amber-400",
        }
      : {
          label: "Published blog posts",
          value: blogsQuery.isLoading
            ? "…"
            : blogsQuery.isError
              ? "—"
              : formatCount(publishedBlogs),
          note: blogsQuery.isError ? "Content unavailable" : "In this project",
          noteTone: "neutral",
          icon: FileText,
          iconColor: "text-cyan-600 dark:text-cyan-400",
        },
    ...(project?.storeType === "ecommerce"
      ? [
          {
            label: "Revenue",
            value: thisMonthRevenue.isLoading
              ? "…"
              : thisMonthRevenue.isError
                ? "—"
                : formatRevenue(
                    thisMonthRevenue.data?.revenue ?? [],
                    project.currency,
                  ),
            note:
              thisMonthRevenue.isLoading ||
              thisMonthRevenue.isError ||
              lastMonthRevenue.isLoading ||
              lastMonthRevenue.isError
                ? "—"
                : revenueMovement.note,
            noteTone:
              thisMonthRevenue.isLoading ||
              thisMonthRevenue.isError ||
              lastMonthRevenue.isLoading ||
              lastMonthRevenue.isError
                ? "neutral"
                : revenueMovement.tone,
            icon: DollarSign,
            iconColor: "text-emerald-600 dark:text-emerald-400",
          },
        ]
      : []),
  ];

  const attention: Array<{ title: string; detail: string; href: string }> = [];
  if (project && !project.publicUrl)
    attention.push({
      title: "Publish your site",
      detail: "Your site is not published yet",
      href: "/pages",
    });
  if (drafts.length)
    attention.push({
      title: "Finish draft pages",
      detail: `${drafts.length} ${drafts.length === 1 ? "page is" : "pages are"} not published`,
      href: "/pages",
    });
  if (project && !project.logo)
    attention.push({
      title: "Complete branding",
      detail: "Add a project logo",
      href: "/settings",
    });
  if (project && navigationItems(project).length === 0)
    attention.push({
      title: "Finish navigation",
      detail: "Add links to your site menu",
      href: "/navigation",
    });
  if (
    connectionsQuery.isSuccess &&
    !connectionsQuery.data.connections?.some(
      (connection) => connection.status === "connected",
    )
  )
    attention.push({
      title: "Connect Google Analytics",
      detail: "Link an analytics property for Google traffic data",
      href: "/growth?view=connections",
    });
  if (!attention.length && (pagesQuery.isLoading || connectionsQuery.isLoading))
    attention.push({
      title: "Checking project setup",
      detail: "Project checks are still loading",
      href: "/settings",
    });

  const activity: ActivityItem[] = [
    ...pages.map((page) => ({
      id: `page-${page.id}`,
      label: page.title,
      type: activityType("Page", page.createdAt, page.updatedAt),
      at: page.updatedAt,
      icon: FileText,
    })),
    ...blogs.map((blog) => ({
      id: `blog-${blog.id}`,
      label: blog.title,
      type: activityType("Blog post", blog.createdAt, blog.updatedAt),
      at: blog.updatedAt,
      icon: Edit3,
    })),
    ...media.map((item) => ({
      id: `media-${item.id}`,
      label: item.name,
      type: "Media uploaded",
      at: item.createdAt,
      icon: Upload,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);
  const contentLoading =
    pagesQuery.isLoading || blogsQuery.isLoading || mediaQuery.isLoading;
  const contentError =
    pagesQuery.isError || blogsQuery.isError || mediaQuery.isError;
  const liveSiteUrl = project?.publicUrl;

  return (
    <div className="-mx-4 -mt-4">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 pb-12 pt-5 sm:px-8 lg:px-12">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
              Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-normal ${liveSiteUrl ? (tlsQuery.isError || tlsQuery.data === false ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300" : "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300") : "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"}`}
              role="status"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${liveSiteUrl ? (tlsQuery.isError || tlsQuery.data === false ? "bg-red-500" : "bg-green-500") : "bg-neutral-400"}`}
              />
              {projectsLoading
                ? "Loading site status"
                : !project
                  ? "Select a project"
                  : !liveSiteUrl
                    ? "Your site is not published"
                    : tlsQuery.isLoading
                      ? "Checking site connection"
                      : tlsQuery.isError || tlsQuery.data === false
                        ? "Could not verify site connection"
                        : "Your site is live"}
            </div>
            {liveSiteUrl && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs font-normal"
              >
                <a
                  href={liveSiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Visit website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        </header>

        {!selectedProjectId ? (
          <div
            role="status"
            className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          >
            Select a project to view its dashboard.
          </div>
        ) : (
          <>
            {contentError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                Some project content could not be loaded.
              </div>
            )}
            <section
              className={`grid grid-cols-2 gap-3 ${stats.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
            >
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
                  Quick Actions
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="group flex items-center gap-3 rounded-lg bg-neutral-50 p-3 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:bg-[#1e1e1f] dark:hover:bg-[#252527]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                        <Icon className="h-4 w-4 text-neutral-500 transition-colors group-hover:text-cyan-600 dark:text-neutral-400 dark:group-hover:text-cyan-400" />
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-normal text-neutral-900 dark:text-white">
                          {action.label}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
                      Site Activity
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Recorded page views over the last 30 days
                    </p>
                  </div>
                  <Link
                    href="/growth?view=analytics"
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:text-neutral-400 dark:hover:text-blue-400"
                  >
                    View analytics <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {chartAnalytics.isError ? (
                  <p
                    role="alert"
                    className="py-12 text-center text-sm text-red-700"
                  >
                    Site activity could not be loaded.
                  </p>
                ) : chartAnalytics.isLoading ? (
                  <div className="h-48 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                ) : chartAnalytics.data?.daily?.length ? (
                  <MiniChart daily={chartAnalytics.data.daily} />
                ) : (
                  <p className="flex h-48 items-center justify-center text-sm text-neutral-500">
                    No page views recorded in this period.
                  </p>
                )}
                <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                  <span>{chartRange.from}</span>
                  <span>{chartRange.to}</span>
                </div>
              </article>

              <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
                      Site Health
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Based on checks with available project data
                    </p>
                  </div>
                  <span className={`text-2xl font-normal ${healthTextClass}`}>
                    {healthScore === null ? "—" : `${healthScore}%`}
                  </span>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-900 dark:text-white">
                    Health Score
                  </p>
                  <span className="text-xs font-normal text-neutral-600 dark:text-neutral-300">
                    {measuredChecks.length
                      ? `${measuredChecks.length} measured`
                      : "No measured checks"}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Site health score"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={healthScore ?? undefined}
                  className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                >
                  <div
                    className={`h-full rounded-full transition-[width] ${healthColorClass}`}
                    style={{ width: `${healthScore ?? 0}%` }}
                  />
                </div>
                <div className="mt-5 space-y-3">
                  {healthChecks.map((check) => {
                    const Icon = check.icon;
                    return (
                      <div
                        key={check.label}
                        className="flex items-center gap-3"
                      >
                        <Icon className="h-4 w-4 text-neutral-400" />
                        <span className="flex-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {check.label}
                        </span>
                        <span className="text-right text-xs font-normal text-neutral-900 dark:text-white">
                          {check.value}
                        </span>
                        {check.result === true ? (
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <CircleAlert
                            className={`h-3.5 w-3.5 ${check.result === false ? "text-amber-500 dark:text-amber-400" : "text-neutral-300 dark:text-neutral-600"}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <Link
                  href="/seo?view=audit"
                  className="mt-5 inline-flex items-center gap-1 text-xs font-normal text-neutral-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:text-neutral-400 dark:hover:text-blue-400"
                >
                  Review site checks <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
              <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
                      Needs Attention
                    </h2>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                    <CircleAlert className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  </span>
                </div>
                <div className="space-y-2">
                  {attention.length ? (
                    attention.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="group flex items-center gap-3 rounded-lg bg-neutral-50 p-3 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:bg-[#1e1e1f] dark:hover:bg-[#252527]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                          <CircleAlert className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-normal text-neutral-900 dark:text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                            {item.detail}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-lg bg-neutral-50 p-4 text-xs text-neutral-500 dark:bg-[#1e1e1f] dark:text-neutral-400">
                      No outstanding project setup items.
                    </p>
                  )}
                </div>
              </article>

              <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
                      Recent Activity
                    </h2>
                  </div>
                  <Link
                    href="/pages"
                    className="text-xs font-normal text-neutral-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:text-neutral-400 dark:hover:text-blue-400"
                  >
                    View content
                  </Link>
                </div>
                {contentLoading ? (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    Loading project activity…
                  </p>
                ) : activity.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activity.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-[#1e1e1f]"
                        >
                          <Icon className="mt-0.5 h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-normal text-neutral-900 dark:text-white">
                              {item.label}
                            </p>
                            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                              {item.type} · {timeAgo(item.at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    No recent pages, posts, or uploads.
                  </p>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
