"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  Globe2,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Pill } from "@/components/magicui/pill";
gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "Research your market",
    description:
      "Discover relevant competitors in your market. Choose who to research and uncover gaps worth exploring.",
  },
  {
    title: "Find opportunities",
    description:
      "Turn keyword research into a clear plan, with the right search intent mapped to the right page.",
  },
  {
    title: "Create useful content",
    description:
      "Create content drafts, improve existing pages, and schedule blogs. You set the publishing boundaries.",
  },
];

const surface =
  "rounded-xl border border-white/15 bg-[#090e16] shadow-[0_14px_32px_#0003]";
const miniLabel = "text-[10px] text-slate-400";

function ResearchPreview() {
  return (
    <div className="relative px-5 pt-6 sm:px-6">
      <div
        className={`${surface} flex items-center gap-3 px-4 py-3.5 text-[11px] text-cyan-100`}
      >
        <Search size={15} className="shrink-0 text-cyan-300" />
        <span>Bridal jewellery in Delhi</span>
      </div>
      <div className={`${surface} relative ml-4 mt-4 p-4`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-[11px] text-white/90">
            Your competitive landscape
          </span>
          <Globe2 size={14} className="text-slate-400" />
        </div>
        {[
          ["Local bridal boutique", "Same market · Direct competitor"],
          ["Jewellery specialist", "Shared topic · Search competitor"],
          ["Wedding publication", "Editorial · Search competitor"],
        ].map(([name, detail], index) => (
          <div
            key={name}
            className={`flex items-center gap-3 border-t border-white/[.07] py-3`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] text-slate-400">
              <Globe2 size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-200">{name}</p>
              <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
            </div>
            {index === 0 && (
              <Check size={14} className="shrink-0 text-cyan-300" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunityPreview() {
  return (
    <div className="relative px-5 pt-6 sm:px-6">
      <div className={`${surface} p-5`}>
        <div className="flex items-center gap-2 text-[11px] text-cyan-200">
          <Sparkles size={14} /> Opportunity found
        </div>
        <p className="mt-5 text-[23px] font-medium leading-tight tracking-[-.05em] text-white">
          Bridal jewellery
          <br />
          <span className="text-cyan-200">Delhi</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-slate-300">
          <span className="rounded-full border border-white/10 px-2.5 py-1">
            Local intent
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1">
            Existing page
          </span>
        </div>
        <div className="mt-5 border-t border-white/10 pt-3">
          <p className={miniLabel}>Recommended next step</p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-200">
            Expand your bridal collection page.
          </p>
        </div>
      </div>
      <div
        className={`${surface} relative -mt-2 ml-7 flex items-center gap-3 px-4 py-3.5 text-[10px] text-cyan-100`}
      >
        <Link2 size={14} className="shrink-0 text-cyan-300" />
        <span>/bridal-jewellery</span>
        <ArrowUpRight size={14} className="ml-auto" />
      </div>
    </div>
  );
}

function ContentPreview() {
  return (
    <div className="relative px-5 pt-6 sm:px-6">
      <div className={`${surface} mr-5 overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-[10px] text-slate-400">
          <FileText size={13} /> Content workspace
          <span className="ml-auto text-cyan-200">Draft</span>
        </div>
        <div className="p-5">
          <p className="text-[9px] uppercase tracking-[.12em] text-slate-400">
            The bridal collection
          </p>
          <p className="mt-3 text-[23px] font-medium leading-tight tracking-[-.05em] text-white">
            Made for your
            <br />
            forever moments.
          </p>
          <div className="mt-5 space-y-2.5">
            {["w-full", "w-[90%]", "w-[96%]", "w-3/4"].map((width) => (
              <div
                key={width}
                className={`h-1.5 rounded-full bg-slate-400/20 ${width}`}
              />
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 text-[10px] text-cyan-200">
            <Check size={12} /> Ready for your review
          </div>
        </div>
      </div>
      <div
        className={`${surface} relative -mt-2 ml-7 flex items-center gap-3 px-4 py-3.5`}
      >
        <ShieldCheck size={17} className="shrink-0 text-cyan-300" />
        <div>
          <p className="text-[11px] text-white">Publish on your terms</p>
          <p className="mt-1 text-[9px] text-slate-400">
            Approved pages · Scheduled blogs
          </p>
        </div>
      </div>
    </div>
  );
}

function WorkflowLine({
  d,
  viewBox,
  className,
}: {
  d: string;
  viewBox: string;
  className: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      preserveAspectRatio="none"
      fill="none"
      className={className}
    >
      <path
        data-flow-line
        d={d}
        pathLength="100"
        strokeDasharray="100 100"
        strokeDashoffset="100"
        stroke="#67e8f9"
        strokeOpacity=".7"
        vectorEffect="non-scaling-stroke"
        className="motion-reduce:[stroke-dashoffset:0]"
      />
    </svg>
  );
}

export default function AgenticSeo() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const media = gsap.matchMedia();
    media.add(
      {
        desktop: "(min-width: 1024px)",
        mobile: "(max-width: 1023px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (context.conditions?.reduce) return;
        const stages = Array.from(
          section.querySelectorAll<HTMLElement>("[data-stage]"),
        );
        const reveal = (
          timeline: gsap.core.Timeline,
          element: Element,
          position?: gsap.Position,
        ) => {
          timeline.fromTo(
            element,
            { opacity: 0, y: 32 },
            { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
            position,
          );
        };
        const draw = (timeline: gsap.core.Timeline, parent: Element) => {
          const lines = parent.querySelectorAll("[data-flow-line]");
          if (lines.length)
            timeline.fromTo(
              lines,
              { strokeDasharray: "100 100", strokeDashoffset: 100 },
              { strokeDashoffset: 0, duration: 0.45, ease: "none" },
            );
        };
        const animateStage = (
          timeline: gsap.core.Timeline,
          stage: HTMLElement,
        ) => {
          const card = stage.querySelector("[data-card]")!;
          reveal(timeline, card);
          timeline.fromTo(
            card.querySelector("[data-stage-light]"),
            { opacity: 0.2 },
            { opacity: 1, duration: 0.15 },
            "<.3",
          );
          timeline.fromTo(
            card.querySelector("[data-card-glow]"),
            { opacity: 0.2 },
            { opacity: 1, duration: 0.35 },
            "<",
          );
        };
        const animateBusiness = (timeline: gsap.core.Timeline) => {
          const business = section.querySelector("[data-business]")!;
          const connector = section.querySelector(
            "[data-business-connector]",
          )!;
          reveal(timeline, business);
          timeline.fromTo(
            connector,
            { scaleY: 0, transformOrigin: "top" },
            { scaleY: 1, duration: 0.3, ease: "none" },
          );
        };
        const business = section.querySelector("[data-business]")!;
        const businessTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: business,
            start: "top 130%",
            end: "bottom 70%",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });
        animateBusiness(businessTimeline);
        if (context.conditions?.desktop) {
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section.querySelector("[data-stage-grid]"),
              start: "top 65%",
              end: "center 45%",
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          });
          stages.forEach((stage) => {
            animateStage(timeline, stage);
            draw(timeline, stage);
          });
        } else {
          stages.forEach((stage) => {
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: stage,
                start: "top 65%",
                end: "top 35%",
                scrub: 0.5,
                invalidateOnRefresh: true,
              },
            });
            animateStage(timeline, stage);
            const connector = stage.querySelector("[data-stage-connector]");
            if (connector) {
              const connection = gsap.timeline({
                scrollTrigger: {
                  trigger: connector,
                  start: "top 90%",
                  end: "bottom 65%",
                  scrub: 0.4,
                },
              });
              draw(connection, connector);
            }
          });
        }
        const approval = section.querySelector("[data-approval]")!;
        const approvalTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: section.querySelector("[data-approval-connector]"),
            start: "top 88%",
            endTrigger: approval,
            end: "top 55%",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        draw(
          approvalTimeline,
          section.querySelector("[data-approval-connector]")!,
        );
        reveal(approvalTimeline, approval);
        const outputs = section.querySelector("[data-outputs]")!;
        const outputTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: section.querySelector("[data-output-connector]"),
            start: "top 85%",
            endTrigger: outputs,
            end: "top 62%",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        draw(outputTimeline, section.querySelector("[data-output-connector]")!);
        Array.from(outputs.children).forEach((output, index) =>
          reveal(outputTimeline, output, index === 0 ? undefined : "<.12"),
        );
      },
      section,
    );
    return () => media.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="agentic-seo"
      aria-labelledby="agentic-seo-heading"
      className="relative isolate py-20 font-montserrat text-white sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-20 h-[64rem] bg-[radial-gradient(ellipse_at_58%_34%,rgba(34,211,238,.08),transparent_62%),radial-gradient(ellipse_at_12%_70%,rgba(37,99,235,.1),transparent_58%)] blur-[80px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_10%,rgba(34,211,238,.025),transparent_55%)]"
      />
      <div className="mx-auto w-full px-[4.65vw] min-[1800px]:max-w-[1700px] max-[639px]:px-5">
        <Pill>YOUR AI SEO SPECIALIST</Pill>
        <h2
          id="agentic-seo-heading"
          className="mt-8 max-w-[1100px] text-[clamp(2.4rem,4.5vw,5rem)] font-medium leading-[1.08] tracking-[-.06em]"
        >
          A website worth finding.
          <br />
          <span className="bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent">
            An agent with a plan.
          </span>
        </h2>
        <p className="mt-[26px] max-w-[680px] text-[17px] leading-[1.8] text-[#a1a1aa] max-[639px]:text-[15px]">
          Meet your agentic SEO specialist. Research your market, find the right
          opportunities, and turn them into useful content for your website.
        </p>
        <div className="relative pt-8">
          <div className="lg:w-[calc((100%_-_8rem)/3)]">
            <div
              data-business
              className="mx-auto flex w-fit max-w-full translate-y-4 items-center gap-3 rounded-full border border-white/[.12] bg-[#050505]/95 py-2 pl-2 pr-5 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
            >
              <Image
                src="/logo-icon.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
              <div>
                <p className="text-xs font-medium text-white">
                  Your business, understood
                </p>
                <p className="mt-0.5 text-[11px] text-white/50">
                  Bridal jewellery · Delhi
                </p>
              </div>
              <Check
                size={14}
                className="ml-2 shrink-0 text-cyan-200"
                aria-hidden="true"
              />
            </div>
            <div
              aria-hidden="true"
              data-business-connector
              className="mx-auto h-10 w-px origin-top scale-y-0 bg-cyan-200/25 motion-reduce:scale-y-100"
            />
          </div>
          <ol
            data-stage-grid
            className="grid list-none grid-cols-1 gap-16 p-0 lg:grid-cols-3"
          >
            {features.map((feature, index) => (
              <li data-stage key={feature.title} className="relative min-w-0">
                <article
                  data-card
                  className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/[.12] bg-[#050505]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,.35)] transition-[border-color,box-shadow] duration-500 hover:border-cyan-300/35 hover:shadow-[0_28px_90px_rgba(8,145,178,.16)] motion-reduce:transition-none xl:p-7"
                >
                  <div
                    data-card-glow
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,.07),transparent_30%),linear-gradient(135deg,rgba(255,255,255,.025),transparent_42%)]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
                  />
                  <div className="relative mb-5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-xs text-white/70">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/[.08] text-[10px] font-medium text-cyan-300">
                        0{index + 1}
                      </span>
                      {["Research", "Strategy", "Create content"][index]}
                    </span>
                    <span
                      data-stage-light
                      className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,.4)]"
                      aria-hidden="true"
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="relative h-[300px] shrink-0 overflow-hidden rounded-2xl border border-white/[.12] bg-[#050505]/90 shadow-[inset_0_0_40px_rgba(37,99,235,.12),0_16px_40px_rgba(0,0,0,.25)] [mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)]"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(37,99,235,.12),transparent_36%)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
                    {index === 0 ? (
                      <ResearchPreview />
                    ) : index === 1 ? (
                      <OpportunityPreview />
                    ) : (
                      <ContentPreview />
                    )}
                  </div>
                  <h3 className="relative mt-6 text-[clamp(1.5rem,1.8vw,1.875rem)] font-medium leading-[1.15] tracking-[-.05em] min-[1024px]:max-[1279px]:min-h-[2.3em]">
                    {feature.title}
                  </h3>
                  <p className="relative mb-5 mt-3 text-sm leading-6 text-white/50">
                    {feature.description}
                  </p>
                  <div className="relative mt-auto flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-cyan-100/80">
                    <Check size={12} aria-hidden="true" />
                    {
                      [
                        "Confirmed competitors",
                        "Prioritized roadmap",
                        "Drafts ready for review",
                      ][index]
                    }
                  </div>
                </article>
                {index < 2 && (
                  <div
                    data-stage-connector
                    className="pointer-events-none absolute -bottom-16 left-1/2 h-16 w-8 -translate-x-1/2 lg:-right-16 lg:bottom-auto lg:left-auto lg:top-[198px] xl:top-[206px] lg:h-8 lg:w-16 lg:translate-x-0"
                  >
                    <WorkflowLine
                      className="h-full w-full lg:hidden"
                      viewBox="0 0 32 64"
                      d="M16 0V64m-4-8 4 4 4-4"
                    />
                    <WorkflowLine
                      className="hidden h-full w-full lg:block"
                      viewBox="0 0 64 32"
                      d="M0 16H64m-8-4 4 4-4 4"
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div data-approval-connector className="relative h-24 lg:h-28">
            <WorkflowLine
              className="ml-[50%] hidden h-full w-[calc((100%_+_4rem)/3)] overflow-visible lg:block"
              viewBox="0 0 400 128"
              d="M400 0V32Q400 56 376 56H24Q0 56 0 80V128"
            />
            <WorkflowLine
              className="mx-auto h-full w-8 lg:hidden"
              viewBox="0 0 32 128"
              d="M16 0V128"
            />
            <span className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#050505] px-3 py-1 text-[11px] text-white/60 lg:left-[65%] lg:top-9">
              Within your approved scope
            </span>
          </div>
          <div
            data-approval
            className="relative mx-auto flex max-w-[440px] items-center gap-4 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#050505]/95 p-5 shadow-[0_0_40px_rgba(34,211,238,.06)] sm:p-6"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
            />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.08] text-cyan-200">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-medium tracking-[-.03em]">
                Your publishing rules
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                Approve the direction. Pause at any time.
              </p>
            </div>
          </div>
          <div className="mx-auto max-w-[760px]">
            <div
              data-output-connector
              className="mx-auto h-16 w-[calc(50%_+_0.5rem)] sm:w-[calc(50%_+_1rem)]"
            >
              <WorkflowLine
                className="h-full w-full overflow-visible"
                viewBox="0 0 400 64"
                d="M200 0V12Q200 32 180 32H20Q0 32 0 52V64M200 12Q200 32 220 32H380Q400 32 400 52V64"
              />
            </div>
            <div data-outputs className="grid grid-cols-2 gap-4 sm:gap-8">
              {[
                {
                  icon: Globe2,
                  title: "Page improvements",
                  description: "Publish authorized updates",
                },
                {
                  icon: CalendarDays,
                  title: "Scheduled blogs",
                  description: "Content on your cadence",
                },
              ].map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-white/[.12] bg-[#050505]/95 p-4 text-center shadow-[0_16px_40px_rgba(0,0,0,.25)] sm:flex-row sm:gap-4 sm:p-5 sm:text-left"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent"
                  />
                  <Icon
                    size={19}
                    className="shrink-0 text-cyan-200"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="text-xs font-medium text-white sm:text-sm">
                      {title}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/50 sm:text-xs">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
