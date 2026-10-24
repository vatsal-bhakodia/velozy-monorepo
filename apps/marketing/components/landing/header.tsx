"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { adminUrl } from "@/lib/admin-url";
import logo from "../../public/logo.svg";

const useCases = [
  {
    label: "Founders",
    description: "Turn an idea into a product people can try.",
  },
  {
    label: "Website resellers",
    description: "Build and deliver client websites at higher margins.",
  },
  {
    label: "Startups",
    description: "Validate, build, and launch without a large team.",
  },
  {
    label: "Agencies",
    description: "Deliver more client sites without slowing down.",
  },
  {
    label: "Freelancers",
    description: "Turn briefs into polished client work faster.",
  },
  {
    label: "Students",
    description: "Build real projects while learning by doing.",
  },
  {
    label: "Enterprise",
    description: "Give every team speed with the control IT needs.",
  },
];

const featuredIndustries = [
  {
    label: "Beauty & salons",
    href: "/industries/salon-website-builder",
    description: "Present your services, treatments and appointment options.",
  },
  {
    label: "Cafes & bakeries",
    href: "/industries/cafe-website-builder",
    description: "Share your menu, opening hours and neighborhood address.",
  },
  {
    label: "Construction",
    href: "/industries/construction-website-builder",
    description: "Show your projects, areas served and how to request a quote.",
  },
  {
    label: "Education",
    href: "/industries/education-website-builder",
    description: "Introduce your courses, teachers and enrollment information.",
  },
  {
    label: "Fitness",
    href: "/industries/fitness-website-builder",
    description: "Present classes, training and the next step for new members.",
  },
  {
    label: "Healthcare",
    href: "/industries/healthcare-website-builder",
    description:
      "Help visitors find your care services, team and contact details.",
  },
  {
    label: "Hotels",
    href: "/industries/hotel-website-builder",
    description: "Show rooms, amenities and ways to enquire about a stay.",
  },
  {
    label: "Restaurants",
    href: "/industries/restaurant-website-builder",
    description:
      "Put your menu, opening hours and booking options within reach.",
  },
];

type SolutionItem = {
  label: string;
  description: string;
  href?: string;
};

function SolutionGroup({
  title,
  items,
  onNavigate,
  allHref,
}: {
  title: string;
  items: SolutionItem[];
  onNavigate: () => void;
  allHref?: string;
}) {
  return (
    <section className="min-w-0">
      <h3 className="mb-5 border-b border-white/10 px-2 pb-3 text-sm font-medium uppercase tracking-[0.08em] text-white/50">
        {allHref ? (
          <Link
            href={allHref}
            aria-label={`View all ${title.toLowerCase()}`}
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 hover:text-cyan-300 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            {title} <span aria-hidden="true">↗</span>
          </Link>
        ) : (
          title
        )}
      </h3>
      <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-flow-col lg:grid-rows-4">
        {items.map((item) => {
          const body = (
            <>
              <span className="block text-base font-semibold leading-6 text-white transition-colors group-hover:text-cyan-300 lg:text-lg">
                {item.label}
              </span>
              <span className="mt-1 block text-sm leading-6 text-white/60 lg:text-base">
                {item.description}
              </span>
            </>
          );
          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className="group block rounded-lg px-2 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              {body}
            </Link>
          ) : (
            <div key={item.label} className="rounded-lg px-2 py-2.5">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SolutionsDirectory({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]">
      <SolutionGroup
        title="Use cases"
        items={useCases}
        onNavigate={onNavigate}
      />
      <SolutionGroup
        title="Industries"
        items={featuredIndustries}
        allHref="/industries"
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default function Header() {
  const isHome = usePathname() === "/";
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateScroll = () => setIsScrolled(window.scrollY > 16);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen && !solutionsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setSolutionsOpen(false);
      setMobileSolutionsOpen(false);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
        setSolutionsOpen(false);
        setMobileSolutionsOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [menuOpen, solutionsOpen]);

  const closeMenus = () => {
    setMenuOpen(false);
    setSolutionsOpen(false);
    setMobileSolutionsOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 w-full border-b text-white transition-colors duration-200 motion-reduce:transition-none ${isHome ? "-mb-[73px]" : ""} ${!isHome || isScrolled || menuOpen || solutionsOpen ? "border-white/10 bg-black" : "border-transparent bg-transparent"}`}
    >
      <div className="flex h-[72px] w-full items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-10">
          <Link
            href="/"
            aria-label="Velozy home"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2 text-xl font-bold"
          >
            <Image
              src={logo}
              alt="Velozy"
              width={140}
              height={35}
              priority
              className="h-9 w-auto brightness-0 invert"
            />
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-9 text-base lg:flex"
          >
            <button
              type="button"
              aria-expanded={solutionsOpen}
              aria-controls="solutions-mega-menu"
              onClick={() => setSolutionsOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 font-medium text-white hover:[text-shadow:0_0_0.45px_currentColor] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
              Solutions
              <ChevronDown
                className={`h-4 w-4 transition-transform ${solutionsOpen ? "rotate-180" : ""}`}
              />
            </button>
            <Link
              href="/pricing"
              onClick={closeMenus}
              className="font-medium text-white hover:[text-shadow:0_0_0.45px_currentColor] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
              Pricing
            </Link>
          </nav>
        </div>
        <div className="hidden items-center gap-6 text-sm lg:flex">
          <Link
            href={adminUrl("/signin")}
            className="text-white hover:[text-shadow:0_0_0.45px_currentColor] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            Log in
          </Link>
          <Link
            href={adminUrl("/onboard")}
            className="rounded-md bg-white px-5 py-3 font-medium text-neutral-950 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Start Building
          </Link>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="dark-theme-mobile-menu"
          onClick={() => {
            setMenuOpen((open) => !open);
            if (menuOpen) setMobileSolutionsOpen(false);
          }}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {solutionsOpen && (
        <div
          id="solutions-mega-menu"
          aria-label="Solutions"
          className="absolute inset-x-0 top-full z-50 hidden max-h-[calc(100svh-72px)] overflow-y-auto overscroll-contain border-y border-white/10 bg-black px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,.45)] lg:block lg:px-[4vw] lg:py-8"
        >
          <SolutionsDirectory onNavigate={closeMenus} />
        </div>
      )}
      <nav
        id="dark-theme-mobile-menu"
        aria-label="Mobile navigation"
        hidden={!menuOpen}
        className="max-h-[calc(100svh-73px)] overflow-y-auto border-t border-white/10 bg-black px-3 py-4 text-white lg:hidden"
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-expanded={mobileSolutionsOpen}
            aria-controls="mobile-solutions-directory"
            onClick={() => setMobileSolutionsOpen((open) => !open)}
            className="flex min-h-12 items-center justify-between rounded-lg px-3 py-3 text-left text-base text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Solutions
            <ChevronDown
              className={`h-4 w-4 transition-transform ${mobileSolutionsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {mobileSolutionsOpen && (
            <div
              id="mobile-solutions-directory"
              className="mx-2 mb-3 border-l border-white/10 py-3 pl-3"
            >
              <SolutionsDirectory onNavigate={closeMenus} />
            </div>
          )}
          <Link
            href="/pricing"
            onClick={closeMenus}
            className="rounded-lg px-3 py-3 text-base text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Pricing
          </Link>
          <div className="mt-2 flex items-center gap-4 border-t border-white/10 pt-4">
            <Link
              href={adminUrl("/signin")}
              onClick={closeMenus}
              className="px-3 py-3 text-sm text-white hover:[text-shadow:0_0_0.45px_currentColor] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              Log in
            </Link>
            <Link
              href={adminUrl("/onboard")}
              onClick={closeMenus}
              className="rounded-md bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Start Building
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
