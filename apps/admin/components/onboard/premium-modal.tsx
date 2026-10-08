import React from "react";
import {
  ArrowUpRight,
  Check,
  Crown,
  Globe2,
  Layers3,
  Sparkles,
  X,
} from "lucide-react";

const marketingUrl = (
  import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal = ({ isOpen, onClose }: PremiumModalProps) => {
  if (!isOpen) return null;
  const benefits = [
    {
      icon: Sparkles,
      iconClass: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300",
      title: "AI logo concepts",
      description: "Create a polished starting point for your brand.",
    },
    {
      icon: Layers3,
      iconClass: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
      title: "Room to explore",
      description: "Compare visual directions and choose the one that fits.",
    },
    {
      icon: Globe2,
      iconClass: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
      title: "Built for your website",
      description: "Keep your brand mark with your project as you build.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-modal-title"
        className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-2xl animate-modalSlideIn dark:border-[#3a3a3d] dark:bg-[#1e1e1f]"
      >
        <div className="relative flex items-start gap-4 border-b border-neutral-200 p-5 dark:border-[#3a3a3d] sm:p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close premium information"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-[#36363a] dark:bg-[#252527] dark:text-neutral-400 dark:hover:bg-[#353538] dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gradient text-white">
            <Crown className="h-6 w-6" />
          </div>
          <div className="min-w-0 pr-8">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Premium feature
            </p>
            <h2 id="premium-modal-title" className="text-xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              Give your brand a stronger start
            </h2>
            <p className="mt-2 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
              Create a logo direction that feels at home on your new site.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-3">
            {benefits.map(({ icon: Icon, iconClass, title, description }) => (
              <article
                key={title}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-[#36363a] dark:bg-[#252527]"
              >
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                  {description}
                </p>
              </article>
            ))}
          </div>

          <section className="rounded-lg border border-neutral-200 p-4 dark:border-[#36363a]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Studio plan
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  More room to build and grow your sites.
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-600 dark:bg-[#252527] dark:text-neutral-300">
                Popular
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-neutral-600 dark:text-neutral-300 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                10 published websites
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                Unlimited AI website generations
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                Custom domains
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                Shared brand assets
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
          <a
            href={`${marketingUrl}/pricing`}
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus-visible:ring-offset-[#1e1e1f]"
          >
            Compare plans
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-full rounded-md text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:text-neutral-400 dark:hover:bg-[#252527] dark:hover:text-neutral-100"
          >
            Maybe later
          </button>
        </div>

        <style>{`
          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-modalSlideIn {
            animation: modalSlideIn 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
};
