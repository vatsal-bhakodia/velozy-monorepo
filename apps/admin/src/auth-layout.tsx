import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

const marketingUrl = (import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function AuthLayout({ eyebrow, headline, mutedHeadline, description, title, subtitle, children }: {
  eyebrow: string;
  headline: string;
  mutedHeadline: string;
  description: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return <div className="min-h-screen bg-black text-white">
    <header className="absolute left-0 right-0 top-4 z-20 mx-auto max-w-7xl rounded-2xl py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6">
        <a href={marketingUrl} className="flex items-center gap-3 text-xl font-bold text-white">
          <img src="/brand/logo.png" alt="" width="32" height="32" className="rounded-md shadow-lg" />
          <span>Velozy</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <a href={marketingUrl} className="text-base text-gray-300 hover:text-white">Home</a>
          <a href={`${marketingUrl}/#features`} className="text-base text-gray-300 hover:text-white">Features</a>
          <a href={`${marketingUrl}/pricing`} className="text-base text-gray-300 hover:text-white">Pricing</a>
          <a href={`${marketingUrl}/#support`} className="text-base text-gray-300 hover:text-white">Support</a>
        </nav>
        <a href="/signin" className="bg-gradient hidden items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white md:inline-flex">Sign In <ArrowUpRight className="h-4 w-4" /></a>
      </div>
    </header>
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-32 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_15%_75%,rgba(37,99,235,0.18),transparent_30%)]" />
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-16 lg:grid-cols-[1fr_420px]">
        <div className="hidden max-w-lg lg:block">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>
          <h1 className="text-6xl font-medium leading-[.95] tracking-[-.07em]">{headline}<br /><span className="text-white/45">{mutedHeadline}</span></h1>
          <p className="mt-7 max-w-md text-base leading-7 text-white/50">{description}</p>
        </div>
        <section className="relative mt-10 w-full max-w-md rounded-xl border border-white/10 bg-[#090d13]/90 text-white shadow-[0_30px_100px_rgba(0,0,0,.45)]">
          <div className="space-y-2 px-6 pb-4 pt-6 text-center">
            <h2 className="text-3xl font-medium tracking-[-.05em]">{title}</h2>
            <p className="text-sm text-white/50">{subtitle}</p>
          </div>
          <div className="space-y-4 px-6 pb-6">{children}</div>
        </section>
      </div>
    </main>
    <footer className="border-t border-white/10 px-6 py-7 text-sm text-white/50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><span>© {new Date().getFullYear()} Velozy</span><a href={marketingUrl} className="hover:text-white">Back to Velozy <ArrowUpRight className="inline h-4 w-4" /></a></div>
    </footer>
  </div>;
}
