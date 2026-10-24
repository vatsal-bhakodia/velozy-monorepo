import type { ReactNode } from "react";
import logo from "../../marketing/public/logo.svg";

const marketingUrl = (
  import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const authGradient =
  "radial-gradient(ellipse 112% 136% at 50% 114%, #010204 0%, #010204 35%, #030914 46%, #071d42 63%, #104d86 80%, #26aec7 90%, #d8fbff 97%, transparent 100%), linear-gradient(180deg, #010204 0%, #010204 100%)";

export function AuthGradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{ backgroundImage: authGradient }}
      />
      <div
        className="absolute inset-0 opacity-[0.09] mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,.45) .65px, transparent .8px)",
          backgroundSize: "4px 4px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-2 lg:overflow-hidden">
      <div className="hidden min-h-0 p-6 lg:block">
        <div className="relative flex h-full items-end justify-center overflow-hidden rounded-2xl bg-[#03060b] lg:px-10 lg:pb-6">
          <AuthGradientBackground />
          <div className="relative z-10 max-w-lg text-left">
            <blockquote>
              <p className="text-4xl font-normal leading-[1.12] tracking-[-0.04em] text-white sm:text-5xl">
                “Think big, think fast, think ahead. Ideas are no one&apos;s
                monopoly.”
              </p>
              <footer className="mt-5 text-sm font-medium tracking-[-0.01em] text-white/70">
                Dhirubhai Ambani
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
      <section className="flex min-h-screen flex-col lg:min-h-0">
        <header className="flex h-24 shrink-0 items-center justify-center px-5 sm:px-8">
          <a
            href={marketingUrl}
            aria-label="Velozy home"
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <img
              src={logo}
              alt="Velozy"
              width="140"
              height="35"
              className="h-8 w-auto brightness-0 invert"
            />
          </a>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:min-h-0 lg:px-12">
          <section className="w-full max-w-md text-white">
            <div className="space-y-2 pb-8 text-center">
              <h2 className="text-3xl font-medium tracking-[-.05em]">
                {title}
              </h2>
              <p className="text-sm text-white/55">{subtitle}</p>
            </div>
            <div className="space-y-4">{children}</div>
          </section>
        </main>
        {footer && (
          <footer className="shrink-0 px-5 pb-12 text-center text-sm sm:px-8">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}
