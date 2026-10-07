"use client";

import {
  Eye,
  FileText,
  Image,
  Layers3,
  Monitor,
  Smartphone,
  Tablet,
  WandSparkles,
} from "lucide-react";
import { PageFrame, SectionCard, StatStrip, StatusPill } from "./page-frame";

export default function StorefrontPage() {
  return (
    <PageFrame
      title="Storefront Builder"
      description="Shape a conversion-ready storefront with visual editing and AI assistance."
      action="Open builder"
    >
      <StatStrip
        items={[
          { label: "Published pages", value: "12", note: "+2 this month" },
          { label: "Draft revisions", value: "4", note: "2 need review" },
          { label: "Site health", value: "96%", note: "Excellent" },
          {
            label: "Last published",
            value: "2h ago",
            note: "Homepage revision 18",
          },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <SectionCard
          title="Page workspace"
          description="Choose a device preview and continue shaping your storefront"
        >
          <div className="mb-5 flex gap-2 rounded-lg bg-neutral-900/60 p-1">
            <button className="flex-1 rounded-md bg-neutral-700 px-3 py-2 text-xs font-medium text-white">
              <Monitor className="mr-2 inline h-3.5 w-3.5" />
              Desktop
            </button>
            <button className="flex-1 rounded-md px-3 py-2 text-xs text-neutral-500 hover:text-neutral-200">
              <Tablet className="mr-2 inline h-3.5 w-3.5" />
              Tablet
            </button>
            <button className="flex-1 rounded-md px-3 py-2 text-xs text-neutral-500 hover:text-neutral-200">
              <Smartphone className="mr-2 inline h-3.5 w-3.5" />
              Mobile
            </button>
          </div>
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-neutral-600 bg-neutral-900/70">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-cyan-300">
                <WandSparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-neutral-200">
                Your visual canvas is ready
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Open the builder to edit sections, layers and responsive states.
              </p>
              <button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-600">
                <Eye className="h-3.5 w-3.5" />
                Preview homepage
              </button>
            </div>
          </div>
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="Recent revisions">
            <div className="space-y-3">
              {[
                ["Homepage hero", "2 hours ago", "Published"],
                ["Collection grid", "Yesterday", "Draft"],
                ["About page", "Aug 12", "Published"],
              ].map(([title, time, status]) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900/50 p-3"
                >
                  <div className="rounded-lg bg-cyan-950/50 p-2 text-cyan-300">
                    <Layers3 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-neutral-200">{title}</p>
                    <p className="mt-1 text-xs text-neutral-500">{time}</p>
                  </div>
                  <StatusPill
                    tone={status === "Published" ? "green" : "neutral"}
                  >
                    {status}
                  </StatusPill>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Brand library">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-4 text-center">
                <Image className="mx-auto h-5 w-5 text-cyan-300" />
                <p className="mt-2 text-xs text-neutral-400">86 assets</p>
              </div>
              <div className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-4 text-center">
                <FileText className="mx-auto h-5 w-5 text-cyan-300" />
                <p className="mt-2 text-xs text-neutral-400">12 pages</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageFrame>
  );
}
