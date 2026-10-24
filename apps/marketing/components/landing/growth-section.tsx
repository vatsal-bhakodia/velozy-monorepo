"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, CircleCheck, Globe2, Send, Sparkles } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  [
    "01",
    "Describe",
    "Tell AI what you do, who it is for, and what you want your business to achieve.",
  ],
  [
    "02",
    "Generate",
    "AI shapes pages, content, visual direction, and a responsive site around your brief.",
  ],
  [
    "03",
    "Publish",
    "Preview safely, connect your domain, and put a useful website in the world.",
  ],
  [
    "04",
    "Get found",
    "Build SEO foundations with metadata, structured content, and pages search engines can understand.",
  ],
  [
    "05",
    "Stay in touch",
    "Recover carts, share back-in-stock updates, and follow up on contact and enquiry forms through WhatsApp and email.",
  ],
  [
    "06",
    "Improve growth",
    "See what works across pages, enquiries, and search, then act on clear recommendations.",
  ],
] as const;

const cardColors = [
  "bg-[#1c3f5b]",
  "bg-[#ff8b4e]",
  "bg-[#dceaff]",
  "bg-[#aebaff]",
  "bg-[#c0bdff]",
  "bg-[#263547]",
] as const;

const accentColors = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-blue-500",
] as const;

const accentTextColors = [
  "text-sky-700",
  "text-violet-700",
  "text-amber-700",
  "text-rose-700",
  "text-emerald-700",
  "text-blue-700",
] as const;

const previewHeaderColors = [
  "bg-sky-50 border-sky-100",
  "bg-violet-50 border-violet-100",
  "bg-amber-50 border-amber-100",
  "bg-rose-50 border-rose-100",
  "bg-emerald-50 border-emerald-100",
  "bg-blue-50 border-blue-100",
] as const;

const phaseColors = [
  "border-white/25 bg-white/10 text-white",
  "border-black/10 bg-black/5 text-neutral-900",
  "border-black/10 bg-black/5 text-neutral-900",
  "border-black/10 bg-black/5 text-neutral-900",
  "border-black/10 bg-black/5 text-neutral-900",
  "border-white/25 bg-white/10 text-white",
] as const;

const titleColors = [
  "text-white",
  "text-[#382313]",
  "text-[#1c3f5b]",
  "text-[#29366e]",
  "text-[#44348d]",
  "text-[#f3e99b]",
] as const;

const descriptionColors = [
  "text-white/75",
  "text-neutral-800",
  "text-neutral-700",
  "text-neutral-800",
  "text-neutral-800",
  "text-white/75",
] as const;

function StepPreview({ index }: { index: number }) {
  const labels = [
    "AI website brief",
    "Your site structure",
    "Ready to publish",
    "Search opportunities",
    "Customer messages",
    "Growth overview",
  ];

  return (
    <div className="relative h-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div
        className={`-mx-4 -mt-4 mb-4 flex items-center gap-2 border-b px-4 py-3 ${previewHeaderColors[index]}`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${accentColors[index]}`} />
        <span className={`text-[10px] font-medium ${accentTextColors[index]}`}>
          {labels[index]}
        </span>
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-300" />
      </div>

      {index === 0 && (
        <div className="space-y-3 text-[10px]">
          <div className="max-w-[84%] rounded-xl rounded-bl-sm bg-neutral-100 px-3 py-2 text-neutral-600">
            What kind of website would you like to build?
          </div>
          <div className="ml-auto max-w-[88%] rounded-xl rounded-br-sm bg-sky-50 px-3 py-2 text-neutral-700">
            <span className="text-sky-800">A warm, modern studio website</span>
          </div>
          <div className="flex items-center rounded-lg border border-neutral-200 px-3 py-2 text-neutral-400">
            Describe your business
            <Send className="ml-auto h-3.5 w-3.5 text-sky-600" />
          </div>
        </div>
      )}

      {index === 1 && (
        <div className="grid grid-cols-[.8fr_1.2fr] gap-3 text-[9px]">
          <div className="space-y-2">
            {["Home", "About", "Services", "Contact"].map((item, itemIndex) => (
              <div
                key={item}
                className={`rounded-md px-2 py-1.5 ${itemIndex === 0 ? "bg-violet-50 text-violet-800" : "text-neutral-500"}`}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-neutral-200 p-3">
            <div className="h-2.5 w-3/4 rounded bg-neutral-200" />
            <div className="mt-3 h-2 w-full rounded bg-neutral-100" />
            <div className="mt-2 h-2 w-4/5 rounded bg-neutral-100" />
            <div className="mt-4 h-6 w-1/2 rounded bg-violet-100" />
          </div>
        </div>
      )}

      {index === 2 && (
        <div className="space-y-3 text-[10px]">
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
            <Globe2 className="h-5 w-5 text-neutral-500" />
            <div className="flex-1">
              <div className="text-neutral-700">yourbrand.com</div>
              <div className="mt-1 text-amber-700">Preview looks good</div>
            </div>
            <Check className="h-4 w-4 text-amber-600" />
          </div>
          {["Mobile ready", "SEO ready", "Domain connected"].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between text-neutral-500"
            >
              {item}
              <CircleCheck className="h-3.5 w-3.5 text-amber-600" />
            </div>
          ))}
        </div>
      )}

      {index === 3 && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 text-[9px]">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] border-b border-neutral-100 bg-neutral-50 px-2 py-2 text-neutral-500">
            <span>Search term</span>
            <span>Type</span>
            <span>Next step</span>
          </div>
          {[
            ["service near me", "Keyword", "Create page"],
            ["local services", "Content", "Brief ready"],
            ["design tips", "Keyword", "Add article"],
          ].map(([term, type, action]) => (
            <div
              key={term}
              className="grid grid-cols-[1.5fr_1fr_1fr] px-2 py-2 text-neutral-600"
            >
              <span className="truncate">{term}</span>
              <span>{type}</span>
              <span className="text-rose-700">{action}</span>
            </div>
          ))}
        </div>
      )}

      {index === 4 && (
        <div className="space-y-2 text-[9px]">
          <div className="flex items-center justify-between text-neutral-500">
            <span>Recent updates</span>
            <span className="text-emerald-700">2 active</span>
          </div>
          {[
            ["Cart recovery", "Message sent"],
            ["Back in stock", "Ready to send"],
          ].map(([title, status]) => (
            <div
              key={title}
              className="rounded-lg border border-neutral-200 p-2.5"
            >
              <div className="flex items-center justify-between text-neutral-700">
                {title}
                <span className="text-emerald-700">{status}</span>
              </div>
              <div className="mt-1 text-neutral-400">
                Keep customers up to date.
              </div>
            </div>
          ))}
        </div>
      )}

      {index === 5 && (
        <div className="flex items-center gap-3 pt-1">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[5px] border-blue-100 border-t-blue-500 text-sm font-medium text-neutral-700">
            82
          </div>
          <div>
            <div className="text-[10px] text-blue-800">Growth health</div>
            <div className="mt-1 text-[9px] text-neutral-400">
              One improvement ready
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[8px] text-neutral-400">
        <Sparkles className="h-3 w-3" /> Velozy
      </div>
    </div>
  );
}

export default function GrowthSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const distance = () =>
        Math.max(0, track.scrollWidth - window.innerWidth + 48);
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          end: () => `+=${distance() + window.innerHeight * 0.65}`,
        },
      });
    }, section);
    return () => context.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative isolate overflow-hidden bg-white py-20 text-neutral-950 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[48rem] bg-[radial-gradient(ellipse_at_50%_20%,rgba(152,217,242,.34),transparent_48%),radial-gradient(ellipse_at_88%_75%,rgba(111,176,235,.16),transparent_38%)] blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-10 xl:px-0">
        <div className="max-w-2xl">
          <span className="mb-6 inline-flex rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[.16em] text-neutral-600 shadow-sm">
            One platform, full growth loop
          </span>
          <h2 className="text-[clamp(2.4rem,6vw,5.2rem)] font-medium leading-[.94] tracking-[-.07em]">
            From first idea
            <br />
            <span className="text-black">to visible growth.</span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-neutral-600">
            Build the site. Bring in visitors. Understand what is working. Keep
            improving without stitching together five different tools.
          </p>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative z-10 mt-14 flex w-max gap-6 pl-5 sm:pl-10 lg:pl-[max(4rem,calc((100vw-1280px)/2))]"
      >
        {steps.map(([number, title, copy], index) => (
          <article
            key={number}
            className={`group relative w-[min(82vw,390px)] shrink-0 overflow-hidden rounded-[24px] p-7 shadow-[0_20px_60px_rgba(15,23,42,.12)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(56,139,190,.22)] sm:w-[390px] ${cardColors[index]}`}
          >
            <div className="relative">
              <StepPreview index={index} />
              <p
                className={`mt-8 inline-flex rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.18em] ${phaseColors[index]}`}
              >
                {`Phase ${number}`}
              </p>
              <h3
                className={`mt-4 text-3xl font-medium tracking-[-.06em] ${titleColors[index]}`}
              >
                {title}
              </h3>
              <p
                className={`mt-3 text-sm leading-6 ${descriptionColors[index]}`}
              >
                {copy}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
