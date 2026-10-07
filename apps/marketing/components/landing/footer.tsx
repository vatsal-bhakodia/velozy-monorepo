"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { adminUrl } from "@/lib/admin-url";
import {
  Github,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Zap,
} from "lucide-react";

export default function Footer() {
  const logoRef = useRef<HTMLDivElement>(null);
  const [isLogoVisible, setIsLogoVisible] = useState(false);

  useEffect(() => {
    const logo = logoRef.current;
    if (!logo) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsLogoVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );

    observer.observe(logo);
    return () => observer.disconnect();
  }, []);

  const groups = [
    {
      title: "Get started",
      links: [
        ["Features", "#product"],
        ["How it works", "#process"],
        ["Start building", adminUrl("/onboard")],
        ["Showcase", "#showcase"],
        ["Pricing", "#pricing"],
      ],
    },
    {
      title: "Professionals",
      links: [
        ["For agencies", "#agencies"],
        ["For creators", "#creators"],
        ["For developers", "#developers"],
        ["Customer support", "#support"],
        ["Sign in", adminUrl("/signin")],
      ],
    },
    {
      title: "Resources",
      links: [
        ["FAQ", "#faq"],
        ["Case studies", "#showcase"],
        ["Blog", "#blog"],
        ["Help center", "#help"],
        ["Contact us", "#contact"],
      ],
    },
    {
      title: "Company",
      links: [
        ["About", "#about"],
        ["Careers", "#careers"],
        ["Trust center", "#trust"],
        ["Become an affiliate", "#affiliate"],
        ["What's new", "#updates"],
      ],
    },
  ];
  const socials = [
    ["YouTube", "https://youtube.com", Youtube],
    ["Instagram", "https://instagram.com", Instagram],
    ["X", "https://x.com", Twitter],
    ["LinkedIn", "https://linkedin.com", Linkedin],
    ["GitHub", "https://github.com", Github],
  ] as const;

  return (
    <footer className="relative overflow-hidden bg-black text-white">
      <div className="relative z-10 mx-auto max-w-[1440px] px-6 pb-20 pt-10 sm:px-10 lg:px-14">
        <nav
          aria-label="Footer navigation"
          className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4"
        >
          {groups.map((group) => (
            <div key={group.title}>
              <div className="mb-4 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.links.map(([label, href]) => (
                  <Link
                    key={label}
                    className="block w-fit py-0.5 text-[14px] leading-5 text-gray-300 transition-colors hover:text-white"
                    href={href}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-7 text-[12px] sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-500">
          <span>© 2026 Velozy</span>
          <Link className="transition-colors hover:text-white" href="#terms">
            Terms
          </Link>
          <Link className="transition-colors hover:text-white" href="#privacy">
            Privacy
          </Link>
          <Link className="transition-colors hover:text-white" href="#controls">
            Data controls
          </Link>
        </div>
        <div
          className="flex items-center gap-5 text-gray-500"
          aria-label="Social links"
        >
          {socials.map(([label, href, Icon]) => (
            <a
              key={label}
              aria-label={label}
              className="transition-colors hover:text-cyan-300"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={2.2} />
            </a>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="relative z-10 mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-14">
          <div
            ref={logoRef}
            className={`footer-logo flex w-full select-none items-center justify-center pb-10 text-[clamp(3.8rem,17.5vw,18.5rem)] leading-none ${isLogoVisible ? "is-visible" : ""}`}
          >
            <Zap
              aria-hidden="true"
              className="footer-zap h-[1.08em] w-[1.08em] shrink-0"
              fill="url(#footer-zap-gradient)"
              stroke="url(#footer-zap-gradient)"
              strokeWidth={1.6}
            >
              <defs>
                <linearGradient
                  id="footer-zap-gradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="50%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
              </defs>
            </Zap>
            <span className="shrink-0 whitespace-nowrap bg-gradient-to-b from-slate-50 via-slate-400 to-slate-700 bg-clip-text pb-10 px-5 font-black tracking-[-0.061em] text-transparent">
              Velozy
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
