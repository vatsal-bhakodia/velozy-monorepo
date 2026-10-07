"use client";

import { useState, useEffect, useRef } from "react";
import Link from "@/components/router-link";
import {
  PanelLeftClose,
  X,
  ChevronDown,
  Crown,
  Building2,
  Folder,
  Plus,
  Settings,
  LogOut,
} from "lucide-react";
import { usePathname } from "@/src/lib/navigation";
import { useLocation } from "react-router-dom";
import { signOut } from "@/src/lib/auth";

type SidebarSubItem = {
  slug: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  searchGroup?: string;
  searchLabel?: string;
  searchDescription?: string;
};

type SidebarItem = {
  slug: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: SidebarSubItem[];
};

type SidebarProps = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarItems: SidebarItem[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
  projects?: Array<{
    id: string;
    name: string;
    access?: {
      type: "project" | "organization";
      roleName: string;
      isOwner: boolean;
    };
  }>;
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
};

export type { SidebarItem, SidebarSubItem };

const getAdminHref = (slug: string, href?: string) => href || `/${slug}`;

export function Sidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarItems,
  activeSection,
  setActiveSection,
  isMobile = false,
  onMobileClose,
  projects = [],
  selectedProjectId,
  onProjectChange,
}: SidebarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const location = useLocation();
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );
  const AccessIcon =
    selectedProject?.access?.type === "organization"
      ? Building2
      : selectedProject?.access?.isOwner
        ? Crown
        : Folder;
  const accessLabel = selectedProject?.access
    ? `${selectedProject.access.roleName} · ${selectedProject.access.type} access`
    : "Project access";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const activeChild = sidebarItems
    .flatMap((item) => item.children || [])
    .filter((child) => {
      const href = getAdminHref(child.slug, child.href);
      const path = href.split(/[?#]/, 1)[0];
      const search = href.includes("?")
        ? `?${href.split("?")[1].split("#")[0]}`
        : "";
      return (
        (pathname === path || pathname.startsWith(`${path}/`)) &&
        (!search || location.search === search)
      );
    })
    .sort(
      (left, right) =>
        getAdminHref(right.slug, right.href).length -
        getAdminHref(left.slug, left.href).length,
    )[0];
  const isChildActive = (child: SidebarSubItem) =>
    activeChild?.slug === child.slug;

  useEffect(() => {
    if (sidebarCollapsed && !isMobile) return;
    const currentParent = sidebarItems.find((item) =>
      item.children?.some(isChildActive),
    );
    setOpenDropdown(currentParent?.slug ?? null);
  }, [pathname, location.search, sidebarCollapsed, isMobile]);

  // Close open menus when their sidebar is hidden.
  useEffect(() => {
    if (sidebarCollapsed && !isMobile) {
      setOpenDropdown(null);
    }
  }, [sidebarCollapsed, isMobile]);

  const isItemActive = (item: SidebarItem) => {
    if (activeSection === item.slug) return true;
    if (item.children) {
      return item.children.some(isChildActive);
    }
    return false;
  };

  const handleDropdownToggle = (slug: string) => {
    setOpenDropdown((current) => (current === slug ? null : slug));
  };

  return (
    <div
      className={`
        ${sidebarCollapsed ? "w-14" : "w-60"} 
        h-full
        bg-white dark:bg-neutral-900 
        backdrop-blur-lg backdrop-saturate-150
        border-r border-neutral-200/50 dark:border-neutral-700/50
        transition-all duration-300 ease-in-out
        shadow-sm shadow-neutral-900/5 dark:shadow-black/10
        flex flex-col p-2
        ${isMobile ? "absolute top-0 left-0" : ""}
        overflow-visible
      `}
    >
      <div
        className="relative flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200/50 px-2 dark:border-neutral-700/50"
        ref={projectDropdownRef}
      >
        <img
          src="/brand/logo.png"
          alt=""
          width="28"
          height="28"
          className="shrink-0 rounded-md"
        />
        {!sidebarCollapsed && (
          <>
            <button
              type="button"
              onClick={() => setProjectDropdownOpen((open) => !open)}
              aria-label={`Business menu: ${selectedProject?.name ?? "Select business"}`}
              aria-expanded={projectDropdownOpen}
              className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-2 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {selectedProject?.name ?? "Select project"}
              </span>
              <ChevronDown
                className={`h-3 w-3 shrink-0 transition-transform ${projectDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            <Link
              href="/pricing"
              aria-label={`Upgrade plan · ${accessLabel}`}
              title={`Upgrade plan · ${accessLabel}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-500/50 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
            >
              <AccessIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/onboard"
              aria-label="Add new project"
              title="Add new project"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </>
        )}
        {sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setProjectDropdownOpen((open) => !open)}
            aria-label="Open project menu"
            aria-expanded={projectDropdownOpen}
            className="absolute inset-0 opacity-0"
          />
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="ml-auto rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close mobile menu"
          >
            <X className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          </button>
        )}
        {projectDropdownOpen && (
          <div className="absolute left-2 top-full z-[60] mt-1 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            {selectedProject && (
              <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 dark:border-neutral-700 dark:text-white">
                <span className="truncate">{selectedProject.name}</span>
              </div>
            )}
            {projects
              .filter((project) => project.id !== selectedProjectId)
              .map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    onProjectChange?.(project.id);
                    setProjectDropdownOpen(false);
                  }}
                  className="w-full truncate px-4 py-2.5 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {project.name}
                </button>
              ))}
            <Link
              href="/onboard"
              onClick={() => setProjectDropdownOpen(false)}
              className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Plus className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
              Add new project
            </Link>
            <Link
              href="/settings"
              onClick={() => setProjectDropdownOpen(false)}
              className="flex items-center gap-3 px-4 pt-3 pb-2.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Settings className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 px-4 pb-3 pt-2.5 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <LogOut className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const active = isItemActive(item);

            // Item WITHOUT children — simple link
            if (!hasChildren) {
              return (
                <Link
                  href={getAdminHref(item.slug, item.href)}
                  key={item.slug}
                  onClick={() => setActiveSection(item.slug)}
                  className={
                    "w-full flex items-center gap-3 py-2 text-left text-sm rounded-md transition-all duration-300 ease-in-out " +
                    (sidebarCollapsed ? "px-2 " : "px-3 ") +
                    (isMobile ? "py-4 " : "") +
                    (active
                      ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white")
                  }
                >
                  <item.icon
                    className={`${
                      isMobile ? "w-5 h-5" : "w-4 h-4"
                    } flex-shrink-0`}
                  />
                  <span
                    className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap ${
                      sidebarCollapsed
                        ? "w-0 opacity-0 scale-0"
                        : "w-auto opacity-100 scale-100"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            // Item WITH children — inline dropdown
            const dropdownOpen = openDropdown === item.slug;

            return (
              <div key={item.slug}>
                {/* Parent button */}
                <button
                  onClick={() => handleDropdownToggle(item.slug)}
                  aria-expanded={dropdownOpen}
                  className={
                    "w-full flex items-center gap-3 py-2 text-left text-sm rounded-md transition-all duration-300 ease-in-out " +
                    (sidebarCollapsed ? "px-2 " : "px-3 ") +
                    (isMobile ? "py-4 " : "") +
                    (active
                      ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white")
                  }
                >
                  <item.icon
                    className={`${
                      isMobile ? "w-5 h-5" : "w-4 h-4"
                    } flex-shrink-0`}
                  />
                  <span
                    className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap flex-1 ${
                      sidebarCollapsed
                        ? "w-0 opacity-0 scale-0"
                        : "w-auto opacity-100 scale-100"
                    }`}
                  >
                    {item.label}
                  </span>
                  {!sidebarCollapsed && (
                    <ChevronDown
                      className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Inline submenu — slides open below the parent */}
                <div
                  className={`transition-all duration-200 ease-in-out overflow-hidden ${
                    dropdownOpen && !sidebarCollapsed
                      ? "max-h-80 opacity-100 overflow-y-auto"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-5 mt-1 pl-2">
                    {item.children!.map((child, index) => {
                      const childActive = isChildActive(child);
                      const lastChild = index === item.children!.length - 1;
                      return (
                        <div key={child.slug} className="relative">
                          <span
                            aria-hidden="true"
                            className={`absolute -left-2 top-0 w-px ${lastChild ? "h-1/2" : "h-full"} bg-neutral-300 dark:bg-neutral-700`}
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -left-2 top-1/2 h-px w-4 bg-neutral-300 dark:bg-neutral-700"
                          />
                          <Link
                            href={getAdminHref(child.slug, child.href)}
                            onClick={() => {
                              setActiveSection(child.slug);
                              if (isMobile) setOpenDropdown(null);
                            }}
                            className={
                              "relative flex items-center rounded-md py-1.5 pl-5 pr-3 text-sm transition-colors duration-150 " +
                              (isMobile ? "py-3 " : "") +
                              (childActive
                                ? "font-medium text-neutral-900 dark:text-white"
                                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white")
                            }
                          >
                            {child.label}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* collapse button - Only show on desktop */}
      {!isMobile && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
        >
          <PanelLeftClose
            className={`w-4 h-4 text-neutral-600 dark:text-neutral-400 transition-transform duration-300 ease-in-out ${
              sidebarCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}
