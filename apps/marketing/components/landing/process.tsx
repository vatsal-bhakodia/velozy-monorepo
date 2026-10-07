"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CircleCheck,
  Globe2,
  MousePointer2,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";

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

const bars = [28, 40, 34, 54, 46, 67, 58, 80, 72];

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Small helper: setTimeout that auto-registers itself for cleanup. */
function useTimeoutQueue() {
  const idsRef = useRef<number[]>([]);
  const set = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    idsRef.current.push(id);
    return id;
  };
  const clearAll = () => {
    idsRef.current.forEach((id) => window.clearTimeout(id));
    idsRef.current = [];
  };
  return { set, clearAll };
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-56 overflow-hidden rounded-2xl border border-white/[.12] bg-[#050505]/90 p-4 shadow-[inset_0_0_40px_rgba(37,99,235,.12),0_16px_40px_rgba(0,0,0,.25)] [mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(37,99,235,.12),transparent_36%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function Visual({ index }: { index: number }) {
  /* ---------------------------------------------------------------- */
  /* 01 — Describe                                                    */
  /* ---------------------------------------------------------------- */
  if (index === 0) return <ChatVisual />;

  /* ---------------------------------------------------------------- */
  /* 02 — Generate                                                    */
  /* ---------------------------------------------------------------- */
  if (index === 1) return <GenerateVisual />;

  /* ---------------------------------------------------------------- */
  /* 03 — Publish                                                     */
  /* ---------------------------------------------------------------- */
  if (index === 2) return <PublishVisual />;

  /* ---------------------------------------------------------------- */
  /* 04 — Get found                                                   */
  /* ---------------------------------------------------------------- */
  if (index === 3) return <GetFoundVisual />;

  /* ---------------------------------------------------------------- */
  /* 05 — Stay in touch                                               */
  /* ---------------------------------------------------------------- */
  if (index === 4) return <VisitorsVisual />;

  /* ---------------------------------------------------------------- */
  /* 06 — Improve growth                                              */
  /* ---------------------------------------------------------------- */
  return <GrowthVisual />;
}

/* ====================================================================== */
/* 02 — Describe (chat)                                                   */
/* ====================================================================== */

function ChatVisual() {
  const [typed, setTyped] = useState("");
  const [chatCycle, setChatCycle] = useState(0);
  const [chatPhase, setChatPhase] = useState<
    "bot" | "typing" | "sending" | "sent"
  >("bot");
  const prompt = "Build a warm, modern studio website";
  const { set, clearAll } = useTimeoutQueue();

  useEffect(() => {
    if (reducedMotion()) {
      setTyped(prompt);
      setChatPhase("sent");
      return;
    }

    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => set(() => resolve(), ms));

    async function loop() {
      while (!cancelled) {
        setTyped("");
        setChatCycle((cycle) => cycle + 1);
        setChatPhase("bot");
        await wait(900);
        if (cancelled) return;

        setChatPhase("typing");
        await wait(450);

        // Reset position fresh on every pass through the loop.
        for (let position = 1; position <= prompt.length; position += 1) {
          if (cancelled) return;
          setTyped(prompt.slice(0, position));
          await wait(58);
        }
        if (cancelled) return;
        await wait(300);

        setChatPhase("sending");
        await wait(700);
        if (cancelled) return;

        setChatPhase("sent");
        await wait(2800);
      }
    }

    loop();
    return () => {
      cancelled = true;
      clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Frame>
      <div className="flex h-full flex-col text-[10px] leading-4">
        <div className="min-h-0 flex-1">
          <motion.div
            key={`bot-message-${chatCycle}`}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[82%] rounded-xl rounded-bl-sm border border-gray-700/60 bg-white/[.06] px-3 py-2 text-white/65"
          >
            What kind of website would you like to build?
          </motion.div>
          <AnimatePresence>
            {chatPhase === "sent" && (
              <motion.div
                key="user-message"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mt-3 ml-auto max-w-[88%] rounded-xl rounded-br-sm border border-cyan-300/20 bg-cyan-300/[.08] px-3 py-2 text-white/80"
              >
                {prompt}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative mt-3 flex w-full shrink-0 items-center gap-2 rounded-xl border border-gray-700/70 bg-white/[.06] p-1.5 shadow-[0_0_20px_rgba(34,211,238,.06)]">
          <div className="min-w-0 flex-1 px-2 py-2 text-white/75">
            {typed}
            <span className="text-cyan-300">
              {chatPhase === "typing" ? "|" : ""}
            </span>
          </div>
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700/80 text-gray-200">
            <Send className="h-3.5 w-3.5" />
            {chatPhase === "sending" && (
              <motion.div
                initial={{ x: -22, y: 18, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                style={{
                  left: "50%",
                  top: "50%",
                  marginLeft: -10,
                  marginTop: -10,
                }}
                className="absolute"
              >
                <MousePointer2 className="h-5 w-5 fill-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,.7)]" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ====================================================================== */
/* 03 — Generate                                                          */
/* ====================================================================== */

const pageTree = [
  ["Home", ["Hero", "About", "Services", "Contact"]],
  ["About", ["Story", "Values", "Team"]],
  ["Services", ["Overview", "Process", "FAQ"]],
  ["Contact", ["Enquiry form", "Location", "Footer"]],
] as const;

function GenerateVisual() {
  const [activeNav, setActiveNav] = useState(0);
  const [building, setBuilding] = useState(true);
  const { set, clearAll } = useTimeoutQueue();

  useEffect(() => {
    if (reducedMotion()) {
      setBuilding(false);
      return;
    }
    set(() => setBuilding(false), 1000);
    const interval = window.setInterval(() => {
      setActiveNav((current) => (current + 1) % pageTree.length);
    }, 1500);
    return () => {
      clearAll();
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Frame>
      <div className="mb-2 flex items-center gap-1.5 text-[9px] text-cyan-200/80">
        <Wand2 className={`h-3 w-3 ${building ? "animate-pulse" : ""}`} />
        {building ? "Generating layout…" : "Layout ready"}
      </div>
      <div className="grid grid-cols-[1fr_1.5fr] gap-2">
        <div className="space-y-2">
          {pageTree.map(([page, sections], i) => (
            <div key={page} className="space-y-1">
              <div
                className={`rounded border px-2 py-1.5 text-[9px] transition-all duration-500 ${
                  i === activeNav
                    ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                    : "border-gray-700/60 text-gray-500"
                }`}
              >
                {page}
              </div>
              <div className="ml-2 space-y-1 border-l border-gray-700/60 pl-2">
                {sections.map((section) => (
                  <div
                    key={section}
                    className="flex items-center gap-1.5 text-[8px] text-gray-600"
                  >
                    <span className="h-1 w-1 rounded-full bg-gray-700" />
                    {section}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded border border-gray-700/60 bg-white/[.03] p-3">
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-600/80" />
          <div className="mt-3 h-2 w-full animate-pulse rounded bg-gray-700" />
          <div className="mt-2 h-2 w-4/5 animate-pulse rounded bg-gray-700/70" />
          <div className="mt-5 h-8 animate-pulse rounded bg-gray-700/70" />
        </div>
      </div>
    </Frame>
  );
}

/* ====================================================================== */
/* 05 — Publish                                                           */
/* ====================================================================== */

const checklist = ["Mobile ready", "SEO ready", "Domain connected"];

function PublishVisual() {
  const [doneCount, setDoneCount] = useState(0);
  const { set, clearAll } = useTimeoutQueue();

  useEffect(() => {
    if (reducedMotion()) {
      setDoneCount(checklist.length);
      return;
    }
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => set(() => resolve(), ms));

    async function loop() {
      while (!cancelled) {
        setDoneCount(0);
        await wait(700);
        for (let i = 1; i <= checklist.length; i += 1) {
          if (cancelled) return;
          setDoneCount(i);
          await wait(500);
        }
        if (cancelled) return;
        await wait(2200);
      }
    }
    loop();
    return () => {
      cancelled = true;
      clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDone = doneCount === checklist.length;

  return (
    <Frame>
      <div
        className={`flex items-center gap-3 rounded border p-3 transition-colors duration-500 ${
          allDone
            ? "border-cyan-300/50 bg-cyan-300/[.06]"
            : "border-gray-700/60 bg-white/[.03]"
        }`}
      >
        <Globe2
          className={`h-7 w-7 transition-colors duration-500 ${
            allDone ? "text-cyan-300" : "text-gray-500"
          }`}
        />
        <div className="flex-1">
          <div className="text-[10px] text-white/75">yourbrand.com</div>
          <div className="mt-1 text-[9px] text-gray-500">
            {allDone ? "Preview looks good" : "Checking readiness…"}
          </div>
        </div>
        <Check
          className={`h-4 w-4 transition-all duration-500 ${
            allDone
              ? "scale-100 text-cyan-300 opacity-100"
              : "scale-50 opacity-0"
          }`}
        />
      </div>
      <div className="mt-3 space-y-1.5">
        {checklist.map((item, i) => (
          <div
            key={item}
            className="flex items-center justify-between text-[9px] text-gray-500"
          >
            <span>{item}</span>
            <CircleCheck
              className={`h-3 w-3 transition-all duration-300 ${
                i < doneCount
                  ? "scale-100 text-cyan-300 opacity-100"
                  : "scale-75 text-gray-700 opacity-60"
              }`}
            />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ====================================================================== */
/* 06 — Get found                                                         */
/* ====================================================================== */

function GetFoundVisual() {
  return (
    <Frame>
      <div className="space-y-2">
        {[
          ["/icons/google-analytics.svg", "Google Analytics"],
          ["/icons/google.svg", "Search Console"],
        ].map(([icon, name]) => (
          <div
            key={name}
            className="flex items-center gap-2 rounded-lg border border-gray-700/60 bg-white/[.04] px-2.5 py-2"
          >
            <Image
              src={icon}
              alt=""
              width={18}
              height={18}
              className="h-4 w-4"
            />
            <span className="flex-1 text-[10px] text-white/75">{name}</span>
            <span className="relative h-4 w-7 rounded-full bg-cyan-300/80">
              <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow" />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-gray-700/60 bg-white/[.03] text-[8px]">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] border-b border-gray-700/60 px-2 py-1.5 text-gray-500">
          <span>SEO opportunities</span>
          <span>Type</span>
          <span>Plan</span>
        </div>
        {[
          ["service near me", "Keyword", "Create page"],
          ["local services", "Content", "Brief ready"],
          ["website design tips", "Keyword", "Add article"],
          ["small business website", "Content", "Draft campaign"],
        ].map(([keyword, type, plan]) => (
          <div
            key={keyword}
            className="grid grid-cols-[1.5fr_1fr_1fr] px-2 py-1.5 text-gray-400"
          >
            <span className="truncate">{keyword}</span>
            <span>{type}</span>
            <span className="text-cyan-300">{plan}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ====================================================================== */
/* 07 — Customer contact                                                   */
/* ====================================================================== */

function VisitorsVisual() {
  return (
    <Frame>
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-gray-400">Customer messages</span>
        <span className="rounded bg-cyan-300/[.08] px-2 py-1 text-cyan-300">
          3 automations active
        </span>
      </div>
      <div className="mt-3 space-y-2 text-[9px]">
        <div className="rounded border border-gray-700/60 bg-white/[.03] px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80">Cart recovery</span>
            <span className="text-emerald-300">Sent</span>
          </div>
          <p className="mt-1 text-gray-500">
            “Still thinking it over? Your cart is waiting.”
          </p>
        </div>
        <div className="rounded border border-gray-700/60 bg-white/[.03] px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80">Back-in-stock</span>
            <span className="text-cyan-300">Ready</span>
          </div>
          <p className="mt-1 text-gray-500">
            Notify customers when their item is available.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded border border-gray-700/60 bg-white/[.03] px-2 py-1.5 text-[8px]">
        <span className="text-gray-500">Send via</span>
        <Image
          src="/icons/whatsapp.svg"
          alt="WhatsApp"
          width={14}
          height={14}
          className="h-3.5 w-3.5"
        />
        <Image
          src="/icons/gmail-2026.svg"
          alt="Email"
          width={14}
          height={14}
          className="h-3.5 w-3.5"
        />
        <span className="ml-auto text-gray-400">
          Contact & enquiry forms included
        </span>
      </div>
    </Frame>
  );
}

/* ====================================================================== */
/* 08 — Improve growth                                                    */
/* ====================================================================== */

function GrowthVisual() {
  const [score, setScore] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const target = 82;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (reducedMotion()) {
      setScore(target);
      setShowTip(true);
      return;
    }
    let raf: number;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setScore(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setShowTip(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const offset = circumference - (score / 100) * circumference;

  return (
    <Frame>
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90">
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,.08)"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="url(#growthGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-sm font-medium text-white">
            {score}
          </span>
        </div>
        <div>
          <div className="text-xs text-white/75">Growth health</div>
          <div className="mt-1 text-[9px] text-gray-500">
            One improvement ready
          </div>
        </div>
      </div>
      <div
        className={`mt-4 rounded border border-cyan-300/20 bg-cyan-300/[.05] p-2 text-[9px] text-cyan-100 transition-all duration-500 ${
          showTip ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        <Sparkles className="mr-1 inline h-3 w-3" /> Improve Services page CTA
      </div>
    </Frame>
  );
}

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const section = sectionRef.current,
      track = trackRef.current;
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
      className="relative isolate overflow-hidden bg-black py-20 text-white sm:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[52rem] bg-[radial-gradient(ellipse_at_50%_28%,rgba(34,211,238,.16),transparent_42%),radial-gradient(ellipse_at_12%_72%,rgba(37,99,235,.22),transparent_36%)] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-10 xl:px-0">
        <div className="max-w-2xl">
          <span className="mb-6 inline-flex rounded-full border border-white/15 bg-[#050505]/70 px-4 py-2">
            <AnimatedShinyText className="text-xs font-medium uppercase tracking-[.16em] text-white/80">
              One platform, full growth loop
            </AnimatedShinyText>
          </span>
          <h2 className="text-[clamp(2.4rem,6vw,5.2rem)] font-medium leading-[.94] tracking-[-.07em]">
            From first idea
            <br />
            <span className="bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent">
              to visible growth.
            </span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/50">
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
            className="group relative w-[min(82vw,390px)] shrink-0 overflow-hidden rounded-[24px] border border-white/[.12] bg-[#050505]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,.35)] transition duration-500 hover:-translate-y-1 hover:border-cyan-300/35 hover:shadow-[0_28px_90px_rgba(8,145,178,.16)] sm:w-[390px]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,.07),transparent_30%),linear-gradient(135deg,rgba(255,255,255,.025),transparent_42%)] opacity-80 transition duration-500 group-hover:opacity-100"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent"
            />
            <div className="relative">
              <Visual index={index} />
              <p className="mt-8 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[.08] px-3 py-1.5 text-[10px] uppercase tracking-[.18em] text-cyan-300">
                {`Phase ${number}`}
              </p>
              <h3 className="mt-4 text-3xl font-medium tracking-[-.06em] text-white">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/50">{copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
