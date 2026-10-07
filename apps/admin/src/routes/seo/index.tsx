import { PageFrame } from "@/components/admin/frontend/page-frame";
import {
  SeoAuditPage,
  SeoOverviewPage,
  SeoKeywordPage,
  SeoCompetitorPage,
  SeoAiPage,
  useSeoData,
} from "@/components/admin/frontend/seo-page";
import { PageTabs } from "@/components/admin/frontend/page-frame";
import { useLocation } from "react-router-dom";

const tabs = [
  { label: "Overview", view: "overview" },
  { label: "Site Audit", view: "audit" },
  { label: "Keywords & SERPs", view: "keywords" },
  { label: "Competitors", view: "competitors" },
  { label: "AI Optimizer", view: "ai" },
] as const;

export default function SeoWorkspacePage() {
  const data = useSeoData();
  const location = useLocation();
  const requestedView = new URLSearchParams(location.search).get("view");
  const view = tabs.some((tab) => tab.view === requestedView)
    ? requestedView!
    : "overview";

  return (
    <PageFrame
      title="SEO Workspace"
      description="Review metadata coverage, run technical audits, and manage SEO across your site content."
    >
      <div className="space-y-5">
        <PageTabs
          items={tabs.map((tab) => ({
            label: tab.label,
            href: `/seo?view=${tab.view}`,
            active: view === tab.view,
          }))}
        />
        {view === "overview" && <SeoOverviewPage data={data} />}
        {view === "audit" && <SeoAuditPage data={data} />}
        {view === "keywords" && <SeoKeywordPage data={data} />}
        {view === "competitors" && <SeoCompetitorPage data={data} />}
        {view === "ai" && <SeoAiPage data={data} />}
      </div>
    </PageFrame>
  );
}
