import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/src/lib/navigation";
import {
  User,
  Bell,
  LogOut,
  ChevronRight,
  Settings,
  Search,
  Sparkles,
  CreditCard,
  LifeBuoy,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { signOut } from "@/src/lib/auth";
import { useTheme } from "@/src/lib/theme";
import { Separator } from "@/components/ui/separator";
import Link from "@/components/router-link";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import type { SidebarItem } from "@/components/admin/sidebar";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";

type UserInfo = {
  initials: string;
  name: string;
};

type HeaderProps = {
  userInfo: UserInfo;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  sidebarCollapsed: boolean;
  sidebarItems: SidebarItem[];
};

const supportUrl = `${(import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3000").replace(/\/$/, "")}/#support`;

export function Header({
  userInfo,
  mobileSidebarOpen,
  toggleMobileSidebar,
  sidebarCollapsed,
  sidebarItems,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();

  const navigationItems = [
    ...sidebarItems.flatMap((section) => {
      if (section.children?.length) {
        return section.children.map((child) => {
          const label = child.searchLabel ?? child.label;
          return {
            group: child.searchGroup ?? section.label,
            label,
            description:
              child.searchDescription ?? `Open ${child.label.toLowerCase()}`,
            href: child.href ?? `/${child.slug}`,
            icon: child.icon ?? section.icon,
            keywords: `${section.label} ${child.label} ${child.slug}`,
          };
        });
      }

      const label = section.slug === "dashboard" ? "Home" : section.label;
      return [
        {
          group: "",
          label,
          description:
            section.slug === "dashboard"
              ? "Dashboard overview"
              : `Open ${label}`,
          href:
            section.href ??
            (section.slug === "dashboard" ? "/" : `/${section.slug}`),
          icon: section.icon,
          keywords: `${section.label} ${section.slug}`,
        },
      ];
    }),
    ...[
      {
        group: "Settings",
        label: "Settings",
        description: "Manage account and business preferences",
        href: "/settings",
        icon: Settings,
        keywords: "settings preferences",
      },
      {
        group: "Settings",
        label: "Account",
        description: "Manage your profile and password",
        href: "/settings/account",
        icon: User,
        keywords: "account profile password",
      },
      {
        group: "Settings",
        label: "Business",
        description: "Update your business details",
        href: "/settings/business",
        icon: Settings,
        keywords: "business project industry",
      },
      {
        group: "Settings",
        label: "Branding & Appearance",
        description: "Manage logo and site theme",
        href: "/settings/appearance",
        icon: Settings,
        keywords: "branding logo theme appearance",
      },
      {
        group: "Settings",
        label: "Navigation",
        description: "Configure menus and header",
        href: "/settings/navigation",
        icon: Settings,
        keywords: "navigation menu header",
      },
      {
        group: "Settings",
        label: "Checkout",
        description: "Set purchase options and currency",
        href: "/settings/checkout",
        icon: Settings,
        keywords: "checkout purchase mode currency",
      },
      {
        group: "Settings",
        label: "Payment Providers",
        description: "Connect and manage payment gateways",
        href: "/settings/payments",
        icon: CreditCard,
        keywords: "payments providers gateways stripe razorpay dodo",
      },
      {
        group: "Settings",
        label: "Revenue Recovery",
        description: "Cart recovery, dunning and payment retries",
        href: "/settings/recovery",
        icon: LifeBuoy,
        keywords:
          "revenue recovery abandoned cart dunning payment retries subscriptions",
      },
      {
        group: "Settings",
        label: "Shipping & Taxes",
        description: "Review shipping and tax settings",
        href: "/settings/shipping-tax",
        icon: Settings,
        keywords: "shipping taxes",
      },
      {
        group: "Settings",
        label: "Delivery Providers",
        description: "Connect carriers for rates, labels, and tracking",
        href: "/settings/delivery",
        icon: Settings,
        keywords: "delivery providers shiprocket shippo easypost",
      },
      {
        group: "Settings",
        label: "Notifications",
        description: "Configure customer notifications",
        href: "/settings/notifications",
        icon: Bell,
        keywords: "notifications commerce",
      },
    ],
  ];
  const searchExamples = [
    "Customers",
    "Payments",
    "Categories",
    "Technical Audit",
  ];
  const [searchExampleIndex, setSearchExampleIndex] = useState(0);

  useEffect(() => {
    if (!searchOpen || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setSearchExampleIndex((current) => (current + 1) % searchExamples.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [searchOpen, prefersReducedMotion]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      )
        return;
      event.preventDefault();
      setSearchOpen(true);
    };
    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  const navigateFromSearch = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut({ callbackUrl: "/signin" });
  };

  return (
    <header
      className={`relative z-50 flex h-14 items-center justify-between bg-neutral-50 py-2 transition-[margin] duration-200 ease-in-out dark:bg-[#111111] ${sidebarCollapsed ? "md:ml-14" : "md:ml-60"}`}
    >
      <div className="admin-editor mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-cyan-400/40 md:hidden"
            aria-label={
              mobileSidebarOpen ? "Close navigation" : "Open navigation"
            }
            aria-expanded={mobileSidebarOpen}
          >
            {mobileSidebarOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-cyan-400/40 md:w-60 md:max-w-[45vw] md:justify-start md:gap-2 md:border md:border-neutral-200/70 md:bg-white/40 md:px-3 md:text-left md:text-neutral-400 md:hover:bg-neutral-100/70 md:dark:border-neutral-700/70 md:dark:bg-neutral-900/30 md:dark:hover:bg-neutral-800/70"
            aria-label="Open search"
          >
            <Search className="h-[18px] w-[18px] shrink-0" />
            <span className="hidden min-w-0 flex-1 text-sm md:block">
              Search
            </span>
            <kbd className="hidden rounded border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 md:block">
              /
            </kbd>
          </button>
          <CommandDialog
            open={searchOpen}
            onOpenChange={setSearchOpen}
            className="top-[50%] max-h-[80vh] max-w-2xl"
          >
            <CommandInput placeholder="Start typing to search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Quick Navigation">
                {navigationItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.group} ${item.label} ${item.description} ${item.keywords}`}
                    onSelect={() => navigateFromSearch(item.href)}
                    className="h-[62px] gap-3 px-3 py-2"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="flex items-center gap-1 text-sm">
                        {item.group && (
                          <>
                            <span>{item.group}</span>
                            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                          </>
                        )}
                        <span>{item.label}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <CommandShortcut className="rounded bg-neutral-100 px-2 py-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      Page
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-muted/30 px-4 py-3 text-xs text-muted-foreground dark:border-neutral-800">
              <span className="flex min-w-0 items-center gap-2">
                <span>Try searching:</span>
                <span className="h-4 w-32 shrink-0 overflow-hidden">
                  <span
                    className={`block ${prefersReducedMotion ? "" : "transition-transform duration-300 ease-in-out"}`}
                    style={{
                      transform: `translateY(-${searchExampleIndex * 16}px)`,
                    }}
                  >
                    {searchExamples.map((example) => (
                      <span
                        key={example}
                        className="flex h-4 items-center truncate whitespace-nowrap"
                      >
                        {example}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span>
                  <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 dark:border-neutral-800">
                    ↑↓
                  </kbd>{" "}
                  to navigate
                </span>
                <span>
                  <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 dark:border-neutral-800">
                    ↵
                  </kbd>{" "}
                  to select
                </span>
                <span>
                  <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 dark:border-neutral-800">
                    esc
                  </kbd>{" "}
                  to close
                </span>
              </div>
            </div>
          </CommandDialog>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AnimatedThemeToggler
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            onThemeChange={setTheme}
            variant="circle"
            duration={450}
            aria-label="Toggle theme"
            className="hidden h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 md:flex [&_svg]:h-4 [&_svg]:w-4"
          />
          <a
            href={supportUrl}
            aria-label="Support"
            title="Support"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-cyan-400/40 md:hidden"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
          </a>
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-cyan-400/40"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-cyan-400/40"
              aria-label="User menu"
            >
              <User className="h-4 w-4" />
            </button>
            {dropdownOpen && (
              <div
                className={`absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border shadow-xl
              ${
                resolvedTheme === "light"
                  ? "border-neutral-200 bg-white text-neutral-900"
                  : "border-neutral-700 bg-neutral-900 text-neutral-100"
              }
            `}
              >
                <div
                  className={`border-b px-4 py-3 ${
                    resolvedTheme === "light"
                      ? "border-neutral-200"
                      : "border-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      {userInfo.name}
                    </p>
                  </div>
                </div>
                <Link
                  href="/settings/account"
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600/40 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:ring-cyan-400/40"
                >
                  <Settings className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  Account Settings
                </Link>
                <Separator className="bg-neutral-200 dark:bg-neutral-700" />
                <Link
                  href="/pricing"
                  onClick={() => setDropdownOpen(false)}
                  className="mx-3 my-2 flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:bg-white dark:text-neutral-900 dark:hover:bg-cyan-400 dark:focus-visible:ring-cyan-400/40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade to Pro
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-xs text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500/40 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
