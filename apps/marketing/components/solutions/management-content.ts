import type { BusinessManagementContent } from "./business-management";

/** The same illustrative dashboard story appears on every industry page. */
export function managementContent(
  name: string,
  business: string,
): BusinessManagementContent {
  const audience = name.toLowerCase();
  return {
    eyebrow: `Behind every ${audience} website`,
    headline: `Manage your ${audience} in one place.`,
    action: "Get started",
    note: "Dashboard screens are illustrative. Analytics needs connected sources. AI SEO and payment workflows depend on release status, plan access, and a configured provider.",
    items: [
      {
        key: "clients",
        title: "Client management",
        description:
          "Keep contact details together so you can follow up on enquiries from your website.",
      },
      {
        key: "analytics",
        title: "Data and analytics",
        description:
          "View website reports when you connect supported analytics sources.",
      },
      {
        key: "team",
        title: "Team management",
        description:
          "Invite teammates and give them roles suited to their responsibilities.",
      },
      {
        key: "seo",
        title: "Agentic SEO",
        description:
          "A planned workflow for research, content drafts, and owner review. Check availability before relying on it.",
      },
      {
        key: "payments",
        title: "Payments",
        description:
          "Payment views require an eligible plan, a supported provider, and an active transaction flow.",
      },
    ],
    preview: {
      business,
      clients: [
        { name: "Avery Morgan", email: "avery@example.com", initials: "AM" },
        { name: "Jordan Lee", email: "jordan@example.com", initials: "JL" },
        { name: "Riley Patel", email: "riley@example.com", initials: "RP" },
      ],
      team: [
        { name: "Alex Taylor", role: "Owner", initials: "AT" },
        { name: "Jamie Chen", role: "Admin", initials: "JC" },
        { name: "Sam Rivera", role: "Member", initials: "SR" },
      ],
      seo: {
        keyword: "Example search topic",
        article: "Example article draft",
      },
      payments: [],
    },
  };
}
