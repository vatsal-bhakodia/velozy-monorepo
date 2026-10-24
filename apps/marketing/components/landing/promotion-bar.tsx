"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, X } from "lucide-react";

export default function PromotionBar() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <aside
      aria-label="Promotion"
      className="relative flex min-h-10 items-center justify-center border-b border-neutral-200 bg-white px-12 py-2 text-neutral-950"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm">
        <span className="font-semibold">30% off all plans</span>
        <span className="text-neutral-600">Code</span>
        <span className="rounded-sm bg-[#19282e] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
          EARLY30
        </span>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 font-semibold text-neutral-950 underline underline-offset-2"
        >
          View plans
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss promotion"
        onClick={() => setOpen(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-neutral-500 transition-colors hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </aside>
  );
}
