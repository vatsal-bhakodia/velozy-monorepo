import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getIndustryDirectory } from "@/src/content/solutions";

export const metadata: Metadata = {
  title: "Industry Website Builders | Velozy",
  description:
    "Explore practical website plans for salons, cafés, hotels, restaurants, service businesses, and more. Find the pages and details your visitors need.",
  alternates: { canonical: "/industries" },
};

export default function IndustriesPage() {
  const industries = getIndustryDirectory();

  return (
    <main className="min-h-screen overflow-x-clip bg-black font-[var(--font-montserrat)] text-white">
      <section className="relative isolate overflow-hidden bg-black px-4 pb-8 pt-20 text-white sm:px-8 sm:pb-10 sm:pt-20 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-32 -z-20 h-[42rem] bg-[radial-gradient(ellipse_at_50%_45%,rgba(34,211,238,0.16),transparent_38%),radial-gradient(ellipse_at_18%_74%,rgba(37,99,235,0.25),transparent_36%),radial-gradient(ellipse_at_84%_74%,rgba(99,102,241,0.2),transparent_35%)] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(100,180,220,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(100,180,220,0.06)_1px,transparent_1px)] bg-[size:54px_54px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
        />

        <div className="relative z-10 mx-auto max-w-[1280px] text-center">
          <h1 className="mx-auto text-[2.8rem] font-medium leading-[.92] tracking-[-.07em] text-white sm:text-6xl lg:text-[5.25rem]">
            Website ideas,
            <span className="mx-auto block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pr-[.08em] pb-[.1em] text-transparent">
              for every industry.
            </span>
          </h1>
        </div>
      </section>

      <section
        id="industry-directory"
        aria-labelledby="industry-directory-title"
        className="px-4 pb-20 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-[1280px]">
          <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
            <h2
              id="industry-directory-title"
              className="text-lg font-medium tracking-[-.02em] sm:text-xl"
            >
              Choose an industry
            </h2>
            <p className="shrink-0 text-xs text-white/45">
              {industries.length} industry guides
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {industries.map((industry) => (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="group flex min-h-[390px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e0f] transition duration-200 hover:-translate-y-1 hover:border-cyan-200/35 hover:bg-[#101516] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                <span className="relative block aspect-[3/2] w-full shrink-0 overflow-hidden bg-[radial-gradient(ellipse_at_70%_20%,rgba(8,145,178,0.22),transparent_60%),#111719]">
                  {industry.image && (
                    <Image
                      src={industry.image}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 416px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035] motion-reduce:transition-none"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10"
                  />
                  <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm transition-colors group-hover:border-cyan-200/60 group-hover:bg-black/55">
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                  <span className="text-lg font-medium tracking-[-.025em]">
                    {industry.name}
                  </span>
                  <span className="text-sm leading-6 text-white/55">
                    {industry.description}
                  </span>
                  <span className="mt-auto flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-[.12em] text-cyan-200/90">
                    Explore guide
                    <ArrowUpRight
                      className="transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
                      size={15}
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
