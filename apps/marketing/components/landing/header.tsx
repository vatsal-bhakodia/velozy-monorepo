"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { adminUrl } from "@/lib/admin-url";
import { PrimaryLink } from "./primary-link";

const links = [
  { name: "Home", href: "/" },
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "/pricing" },
  { name: "Support", href: "#support" },
];

export default function Header({ showNav = true }: { showNav?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signIn = adminUrl("/signin");
  return (
    <header
      className={`fixed left-0 right-0 top-4 z-50 mx-auto max-w-7xl rounded-2xl py-3 transition-colors ${scrolled ? "bg-black shadow-lg shadow-gray-700/20" : "bg-transparent"}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-bold text-white"
        >
          <Image
            src="/brand/logo.png"
            alt=""
            width={32}
            height={32}
            className="rounded-md shadow-lg"
          />
          <span>Velozy</span>
        </Link>
        {showNav && (
          <nav
            className="hidden items-center gap-8 md:flex"
            aria-label="Main navigation"
          >
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-base text-gray-300 transition-colors hover:text-white"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        )}
        <div className="hidden md:block">
          <PrimaryLink
            href={signIn}
            icon={
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            }
          >
            Sign In
          </PrimaryLink>
        </div>
        {showNav && (
          <button
            type="button"
            className="text-white md:hidden"
            aria-label="Toggle menu"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <span className="text-2xl">{expanded ? "×" : "☰"}</span>
          </button>
        )}
      </div>
      {expanded && showNav && (
        <nav
          className="mx-4 mt-4 flex flex-col gap-2 rounded-2xl border border-gray-700/30 bg-neutral-950/95 p-4 text-white md:hidden"
          aria-label="Mobile navigation"
        >
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setExpanded(false)}
              className="rounded-lg px-3 py-2 hover:bg-white/5"
            >
              {link.name}
            </Link>
          ))}
          <PrimaryLink href={signIn}>Sign In</PrimaryLink>
        </nav>
      )}
    </header>
  );
}
