"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNode } from "@craftjs/core";
import ToolBar from "@/components/builder/toolbar";
import { ChevronDown, Menu, X } from "lucide-react";
import { NavbarNavigation, NavbarVariant } from "./types";
import { NavbarSettings } from "./settings";

type NavbarProps = {
  variant?: NavbarVariant;
  projectId?: string;
  showButton?: boolean;
  buttonText?: string;
  sticky?: boolean;
  className?: string;
};

const fallbackNavigation: NavbarNavigation = {
  menus: [
    {
      id: "primary",
      name: "Primary menu",
      items: [
        { id: "home", label: "Home", url: "/" },
        { id: "about", label: "About", url: "/about" },
        { id: "services", label: "Services", url: "/services" },
        { id: "contact", label: "Contact", url: "/contact" },
      ],
    },
  ],
  logo: { mode: "text", text: "Your brand" },
};

export function Navbar({
  variant = "classic",
  projectId = "",
  showButton = true,
  buttonText = "Get started",
  sticky = false,
  className = "",
}: NavbarProps) {
  const {
    connectors: { connect },
  } = useNode();
  const rootRef = useRef<HTMLElement | null>(null);
  const [navigation, setNavigation] =
    useState<NavbarNavigation>(fallbackNavigation);
  const [projectLogo, setProjectLogo] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let pid = projectId;
      if (!pid && typeof window !== "undefined")
        pid = sessionStorage.getItem("projectId") || "";
      if (!pid) {
        const projectsResponse = await fetch("/api/admin/projects");
        const projectsData = await projectsResponse.json();
        pid = projectsData.projects?.[0]?.id || "";
      }
      if (!pid) return;
      const projectResponse = await fetch(
        `/api/admin/projects?projectId=${pid}`,
      );
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        if (active) setProjectLogo(projectData.project?.logo || "");
      }
      const response = await fetch(`/api/admin/navigation?projectId=${pid}`);
      const data = await response.json();
      if (active && data.navigation?.menus?.length)
        setNavigation(data.navigation);
    };
    load().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (rootRef.current) connect(rootRef.current);
  }, [connect]);

  const menu = useMemo(() => {
    const headerId = navigation.locations?.header;
    return (
      navigation.menus?.find((entry) => entry.id === headerId) ||
      navigation.menus?.[0]
    );
  }, [navigation]);
  const items = menu?.items || [];
  const topLevel = items.filter((item) => !item.parentId);
  const childrenOf = (id: string) =>
    items.filter((item) => item.parentId === id);
  const logo = navigation.logo || fallbackNavigation.logo!;
  const logoImage = logo.imageUrl || projectLogo;
  const css = {
    "--nav-primary": "var(--site-primary, #0f766e)",
    "--nav-secondary": "var(--site-secondary, #164e63)",
    "--nav-background": "var(--site-background, #ffffff)",
    "--nav-foreground": "var(--site-foreground, #0f172a)",
    "--nav-border": "var(--site-border, rgba(15, 23, 42, .12))",
    "--nav-muted": "var(--site-muted, rgba(15, 23, 42, .06))",
  } as React.CSSProperties;
  const surface =
    variant === "floating"
      ? "rounded-2xl border shadow-lg mx-3 my-3"
      : variant === "glass"
        ? "border shadow-sm backdrop-blur-xl"
        : variant === "minimal"
          ? ""
          : "border-b";
  const logoNode =
    logoImage && (logo.mode === "image" || projectLogo) ? (
      <img
        src={logoImage}
        alt={logo.imageAlt || "Brand logo"}
        className="max-h-9 max-w-[150px] object-contain"
      />
    ) : (
      <span className="text-lg font-bold tracking-tight">
        {logo.text || "Your brand"}
      </span>
    );
  const link = (item: (typeof items)[number], child = false) => (
    <a
      key={item.id}
      href={item.url}
      target={item.openNewTab ? "_blank" : undefined}
      rel={item.openNewTab ? "noreferrer" : undefined}
      onClick={(event) => event.preventDefault()}
      className={`${child ? "block px-4 py-2.5 text-sm" : "px-3 py-2 text-sm"} rounded-lg font-medium transition hover:bg-[var(--nav-muted)] hover:text-[var(--nav-primary)]`}
    >
      {item.label}
    </a>
  );

  return (
    <header
      ref={(element) => {
        rootRef.current = element;
      }}
      style={css}
      className={`${sticky ? "sticky top-0" : "relative"} z-10 w-full bg-[var(--nav-background)] text-[var(--nav-foreground)] ${surface} ${className}`}
    >
      <div
        className={`mx-auto flex min-h-[68px] max-w-7xl items-center gap-6 px-5 ${variant === "centered" ? "justify-center" : "justify-between"}`}
      >
        {variant === "centered" && (
          <div className="absolute left-5 hidden md:block">{logoNode}</div>
        )}
        {variant !== "centered" && (
          <a
            href="/"
            onClick={(event) => event.preventDefault()}
            className="shrink-0"
          >
            {logoNode}
          </a>
        )}
        <nav
          className={`${mobileOpen ? "absolute left-0 right-0 top-full flex flex-col border-b bg-[var(--nav-background)] p-3 shadow-xl" : "hidden"} md:static md:flex md:flex-1 md:items-center md:justify-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          aria-label="Main navigation"
        >
          {topLevel.map((item) => {
            const children = childrenOf(item.id);
            return (
              <div key={item.id} className="group relative">
                {link(item)}
                {children.length > 0 && (
                  <>
                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--nav-foreground)] opacity-50 md:right-[-3px]" />
                    <div className="hidden min-w-48 rounded-xl border border-[var(--nav-border)] bg-[var(--nav-background)] p-2 shadow-xl md:group-hover:block md:absolute md:left-0 md:top-full md:mt-2">
                      {children.map((child) => link(child, true))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {showButton && (
            <a
              href="#contact"
              onClick={(event) => event.preventDefault()}
              className="hidden rounded-full bg-[var(--nav-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90 sm:inline-flex"
            >
              {buttonText}
            </a>
          )}
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-2 hover:bg-[var(--nav-muted)] md:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {variant === "centered" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 md:hidden">
          {logoNode}
        </div>
      )}
    </header>
  );
}

Navbar.craft = {
  displayName: "Navbar",
  props: {
    variant: "classic" as NavbarVariant,
    projectId: "",
    showButton: true,
    buttonText: "Get started",
    sticky: false,
  },
  rules: { canDrag: () => false },
  related: { toolbar: ToolBar },
  toolbarSections: ["spacing", "dimensions"],
  customToolbarSections: [
    {
      key: "navbarSettings",
      label: "Navbar design",
      icon: "Menu",
      component: <NavbarSettings />,
      priority: 1,
    },
  ],
};
