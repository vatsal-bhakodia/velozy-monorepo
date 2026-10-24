import { BarChart3, FileText, Search, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";

export type BusinessPreviewContent = {
  business: string;
  clients: { name: string; email: string; initials: string }[];
  team: { name: string; role: string; initials: string }[];
  seo: { keyword: string; article: string };
  payments: {
    reference: string;
    customer: string;
    amount: string;
    status: string;
  }[];
};

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-[var(--business-light)] px-2 py-1 text-[10px] font-medium text-[var(--business-ink)]">
      {children}
    </span>
  );
}

function PreviewHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="text-xl font-semibold tracking-tight">{title}</h4>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function ClientsPreview({
  content,
}: {
  content: BusinessPreviewContent;
}) {
  return (
    <>
      <PreviewHeading
        title="Clients"
        description="The people behind your business."
      >
        <Badge>All clients</Badge>
      </PreviewHeading>
      <div className="mb-4 flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2.5 text-xs text-slate-500">
        <Search size={14} aria-hidden="true" />
        Search clients
      </div>
      <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {content.clients.map((client) => (
          <div key={client.email} className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--business-light)] text-xs font-semibold text-[var(--business-ink)]">
              {client.initials}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{client.name}</p>
              <p className="break-all text-xs leading-5 text-slate-500">
                {client.email}
              </p>
            </div>
            <Users
              size={15}
              className="ml-auto shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Contact details, together in one place.
      </p>
    </>
  );
}

export function AnalyticsPreview() {
  return (
    <>
      <PreviewHeading
        title="Analytics"
        description="Get to know your website audience."
      >
        <Badge>Overview</Badge>
      </PreviewHeading>
      <div className="grid grid-cols-3 gap-2">
        {["Views", "Visitors", "Search clicks"].map((label) => (
          <div key={label} className="rounded-md border border-slate-200 p-3">
            <p className="text-[10px] text-slate-500">{label}</p>
            <p className="mt-3 text-2xl text-slate-400">—</p>
          </div>
        ))}
      </div>
      <div className="my-4 flex min-h-36 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <BarChart3
          size={28}
          className="mb-3 text-[var(--business-ink)]"
          aria-hidden="true"
        />
        <p className="text-sm font-medium">Your audience starts here</p>
        <p className="mt-2 max-w-64 text-xs leading-5 text-slate-500">
          Connect a source to see your website reports.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>Google Analytics · Not connected</Badge>
        <Badge>Search Console · Not connected</Badge>
      </div>
    </>
  );
}

export function TeamPreview({ content }: { content: BusinessPreviewContent }) {
  return (
    <>
      <PreviewHeading
        title="Team"
        description="A shared workspace. Clear responsibilities."
      >
        <Badge>Members & roles</Badge>
      </PreviewHeading>
      <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {content.team.map((member) => (
          <div
            key={member.name}
            className="flex flex-wrap items-center gap-3 p-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--business-light)] text-xs font-semibold text-[var(--business-ink)]">
              {member.initials}
            </span>
            <p className="flex-1 text-sm font-medium">{member.name}</p>
            <Badge>{member.role}</Badge>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-md bg-slate-50 p-4">
        <ShieldCheck
          size={20}
          className="shrink-0 text-[var(--business-ink)]"
          aria-hidden="true"
        />
        <p className="text-xs leading-5 text-slate-600">
          Give your team access with roles that fit their responsibilities.
        </p>
      </div>
    </>
  );
}

export function SeoPreview() {
  return (
    <>
      <PreviewHeading
        title="Agentic SEO"
        description="A planned research and content workflow."
      >
        <Badge>Planned module</Badge>
      </PreviewHeading>
      <div className="my-4 flex flex-wrap gap-2">
        {["Research", "Keyword strategy", "Content draft"].map((label) => (
          <Badge key={label}>{label}</Badge>
        ))}
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-5">
        <FileText
          size={22}
          className="mb-3 text-[var(--business-ink)]"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold leading-6">
          Review before publishing
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          This workflow is illustrative and is not currently available as a
          public feature.
        </p>
      </div>
    </>
  );
}

export function PaymentsPreview({
  content,
}: {
  content: BusinessPreviewContent;
}) {
  return (
    <>
      <PreviewHeading
        title="Payments"
        description="Payment activity depends on your setup."
      >
        <Badge>Provider required</Badge>
      </PreviewHeading>
      {content.payments.length ? (
        <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {content.payments.map((payment) => (
            <div
              key={payment.reference}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{payment.customer}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {payment.reference}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="mb-1 text-sm font-semibold">{payment.amount}</p>
                <Badge>{payment.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No payment activity in this illustration.
        </div>
      )}
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Payment availability depends on an eligible plan, supported transaction
        flow, and connected provider.
      </p>
    </>
  );
}
