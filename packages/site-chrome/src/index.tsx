import type { ReactNode, Ref } from "react";

export type SiteNavigationItem = {
  id: string;
  label: string;
  url: string;
  parentId?: string;
  openNewTab?: boolean;
};

export type SiteNavigation = {
  menus: Array<{ id: string; name: string; items: SiteNavigationItem[] }>;
  locations?: { header?: string; footer?: string };
  logo?: {
    mode?: "image" | "text";
    text?: string;
    imageUrl?: string;
    imageAlt?: string;
  };
};

export const DEFAULT_SITE_NAVIGATION: SiteNavigation = {
  menus: [
    { id: "header", name: "Header", items: [] },
    { id: "footer", name: "Footer", items: [] },
  ],
  locations: { header: "header", footer: "footer" },
  logo: { mode: "text", text: "Your brand" },
};

export type SiteChromeConfig = {
  version: 1;
  navbar: {
    wrapperClassName: string;
    innerClassName: string;
    brandClassName: string;
    linksClassName: string;
    linkClassName: string;
    mobileClassName: string;
    mobileToggleClassName: string;
  };
  footer: {
    wrapperClassName: string;
    innerClassName: string;
    brandClassName: string;
    description: string;
    linksClassName: string;
    linkClassName: string;
    copyright: string;
  };
};

export const DEFAULT_SITE_CHROME: SiteChromeConfig = {
  version: 1,
  navbar: {
    wrapperClassName: "relative z-20 w-full border-b border-border bg-background text-foreground",
    innerClassName: "mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-5 py-3",
    brandClassName: "shrink-0 text-lg font-semibold tracking-tight",
    linksClassName: "hidden items-center justify-center gap-1 md:flex",
    linkClassName: "rounded-full px-3 py-2 text-sm font-medium transition hover:bg-muted hover:text-primary",
    mobileClassName: "relative md:hidden",
    mobileToggleClassName: "list-none cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium marker:content-none",
  },
  footer: {
    wrapperClassName: "border-t border-border bg-background text-foreground",
    innerClassName: "mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1.2fr_1fr] md:items-end",
    brandClassName: "text-xl font-semibold tracking-tight",
    description: "",
    linksClassName: "flex flex-wrap gap-x-5 gap-y-3 md:justify-end",
    linkClassName: "text-sm text-muted-foreground transition hover:text-foreground",
    copyright: "",
  },
};

export const SITE_CHROME_TAILWIND_CLASSES = [
  ...Object.values(DEFAULT_SITE_CHROME.navbar),
  ...Object.values(DEFAULT_SITE_CHROME.footer),
  "shrink-0 max-h-10 max-w-40 object-contain group relative hidden min-w-44 flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-xl group-hover:flex group-focus-within:flex md:absolute md:left-0 md:top-full absolute right-0 top-full z-30 mt-2 flex min-w-52 flex-col gap-1 rounded-xl border border-border bg-background p-3 shadow-xl space-y-3 max-w-xl text-sm leading-6 text-muted-foreground text-xs md:justify-end",
].join(" ");

function selectedMenu(navigation: SiteNavigation, location: "header" | "footer") {
  const id = navigation.locations?.[location];
  return navigation.menus.find((menu) => menu.id === id) ??
    (location === "header" ? navigation.menus[0] : undefined);
}

function Brand({
  navigation,
  projectLogo,
  className,
}: {
  navigation: SiteNavigation;
  projectLogo?: string;
  className: string;
}) {
  const logo = navigation.logo;
  const image = logo?.imageUrl || projectLogo;
  const showImage = logo?.mode === "image" ||
    (!logo?.imageUrl && !!projectLogo && (!logo?.text || logo.text === "Your brand"));
  if (image && showImage) {
    return (
      <img
        src={image}
        alt={logo?.imageAlt || `${logo?.text || "Brand"} logo`}
        className={`${className} max-h-10 max-w-40 object-contain`}
      />
    );
  }
  return <span className={className}>{logo?.text || "Your brand"}</span>;
}

function MenuItems({
  items,
  className,
  disableNavigation = false,
}: {
  items: SiteNavigationItem[];
  className: string;
  disableNavigation?: boolean;
}) {
  const topLevel = items.filter((item) => !item.parentId);
  const childrenOf = (id: string) => items.filter((item) => item.parentId === id);
  return <>
    {topLevel.map((item) => {
      const children = childrenOf(item.id);
      const anchor = (entry: SiteNavigationItem) => (
        <a
          key={entry.id}
          href={entry.url}
          onClick={disableNavigation ? (event) => event.preventDefault() : undefined}
          target={entry.openNewTab ? "_blank" : undefined}
          rel={entry.openNewTab ? "noreferrer" : undefined}
          className={className}
        >
          {entry.label}
        </a>
      );
      return (
        <div key={item.id} className="group relative">
          {anchor(item)}
          {children.length > 0 && (
            <div className="hidden min-w-44 flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-xl group-hover:flex group-focus-within:flex md:absolute md:left-0 md:top-full">
              {children.map(anchor)}
            </div>
          )}
        </div>
      );
    })}
  </>;
}

export function SiteNavbarView({
  navigation,
  chrome = DEFAULT_SITE_CHROME,
  projectLogo,
  className = "",
  rootRef,
  disableNavigation = false,
}: {
  navigation: SiteNavigation;
  chrome?: SiteChromeConfig;
  projectLogo?: string;
  className?: string;
  rootRef?: Ref<HTMLElement>;
  disableNavigation?: boolean;
}) {
  const menu = selectedMenu(navigation, "header");
  const items = menu?.items || [];
  const style = chrome.navbar;
  return (
    <header ref={rootRef} className={`${style.wrapperClassName} ${className}`}>
      <div className={style.innerClassName}>
        <a href="/" onClick={disableNavigation ? (event) => event.preventDefault() : undefined} className="shrink-0" aria-label="Home">
          <Brand navigation={navigation} projectLogo={projectLogo} className={style.brandClassName} />
        </a>
        <nav className={style.linksClassName} aria-label="Main navigation">
          <MenuItems items={items} className={style.linkClassName} disableNavigation={disableNavigation} />
        </nav>
        <details className={style.mobileClassName}>
          <summary className={style.mobileToggleClassName}>Menu</summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute right-0 top-full z-30 mt-2 flex min-w-52 flex-col gap-1 rounded-xl border border-border bg-background p-3 shadow-xl"
          >
            <MenuItems items={items} className={style.linkClassName} disableNavigation={disableNavigation} />
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooterView({
  navigation,
  chrome = DEFAULT_SITE_CHROME,
  projectLogo,
  children,
  rootRef,
  disableNavigation = false,
}: {
  navigation: SiteNavigation;
  chrome?: SiteChromeConfig;
  projectLogo?: string;
  children?: ReactNode;
  rootRef?: Ref<HTMLElement>;
  disableNavigation?: boolean;
}) {
  const menu = selectedMenu(navigation, "footer");
  const style = chrome.footer;
  const brandName = navigation.logo?.text || "Your brand";
  return (
    <footer ref={rootRef} className={style.wrapperClassName}>
      <div className={style.innerClassName}>
        <div className="space-y-3">
          <Brand navigation={navigation} projectLogo={projectLogo} className={style.brandClassName} />
          {style.description && <p className="max-w-xl text-sm leading-6 text-muted-foreground">{style.description}</p>}
          {style.copyright && <p className="text-xs text-muted-foreground">{style.copyright.replaceAll("{{brand}}", brandName)}</p>}
        </div>
        {menu && menu.items.length > 0 && (
          <nav aria-label="Footer navigation" className={style.linksClassName}>
            {menu.items.filter((item) => !item.parentId).map((item) => (
              <a key={item.id} href={item.url} onClick={disableNavigation ? (event) => event.preventDefault() : undefined} className={style.linkClassName} target={item.openNewTab ? "_blank" : undefined} rel={item.openNewTab ? "noreferrer" : undefined}>{item.label}</a>
            ))}
          </nav>
        )}
        {children}
      </div>
    </footer>
  );
}

export function isValidSiteChrome(value: unknown): value is SiteChromeConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, any>;
  if (candidate.version !== 1 || !candidate.navbar || !candidate.footer) return false;
  const navbarKeys = ["wrapperClassName", "innerClassName", "brandClassName", "linksClassName", "linkClassName", "mobileClassName", "mobileToggleClassName"];
  const footerKeys = ["wrapperClassName", "innerClassName", "brandClassName", "linksClassName", "linkClassName"];
  const classNames = [
    ...navbarKeys.map((key) => candidate.navbar[key]),
    ...footerKeys.map((key) => candidate.footer[key]),
  ];
  return classNames.every((classes) =>
    typeof classes === "string" && classes.length > 0 && classes.length <= 600 && /^[A-Za-z0-9\s:/._%#[\](),!\-]+$/.test(classes),
  ) && typeof candidate.footer.description === "string" && candidate.footer.description.length <= 300 && typeof candidate.footer.copyright === "string" && candidate.footer.copyright.length <= 160;
}

function isSafeNavigationUrl(value: string) {
  return !/[\\\s<>"'\u0000-\u001f]/.test(value) &&
    ((value.startsWith("/") && !value.startsWith("//")) ||
      value.startsWith("#") || value.startsWith("?") ||
      /^(?:https?:|mailto:|tel:)/i.test(value));
}

export function isValidSiteNavigation(value: unknown): value is SiteNavigation {
  if (!value || typeof value !== "object") return false;
  const navigation = value as SiteNavigation;
  if (!Array.isArray(navigation.menus) || navigation.menus.length !== 2 ||
    navigation.locations?.header !== "header" || navigation.locations?.footer !== "footer") return false;
  const menuIds = new Set<string>();
  const itemIds = new Set<string>();
  for (const menu of navigation.menus) {
    if (!menu || !["header", "footer"].includes(menu.id) || menuIds.has(menu.id) ||
      typeof menu.name !== "string" || !Array.isArray(menu.items) || menu.items.length > 12) return false;
    menuIds.add(menu.id);
    for (const item of menu.items) {
      if (!item || typeof item.id !== "string" || !/^[a-z0-9-]{1,80}$/i.test(item.id) || itemIds.has(item.id) ||
        typeof item.label !== "string" || !item.label.trim() || item.label.length > 60 ||
        typeof item.url !== "string" || !isSafeNavigationUrl(item.url) ||
        (item.openNewTab !== undefined && typeof item.openNewTab !== "boolean")) return false;
      itemIds.add(item.id);
    }
    for (const item of menu.items) {
      if (item.parentId && !menu.items.some((parent) => parent.id === item.parentId && !parent.parentId)) return false;
    }
  }
  return menuIds.size === 2;
}

export function resolveSiteNavigation(value: unknown): SiteNavigation {
  if (!value || typeof value !== "object") return DEFAULT_SITE_NAVIGATION;
  const source = value as Record<string, any>;
  const menus = Array.isArray(source.menus)
    ? source.menus.flatMap((menu: any) => {
        if (!menu || typeof menu.id !== "string" || typeof menu.name !== "string" || !Array.isArray(menu.items)) return [];
        const items = menu.items.flatMap((item: any) => {
          if (!item || typeof item.id !== "string" || typeof item.label !== "string" || typeof item.url !== "string") return [];
          const url = item.url.trim();
          if (!url || !isSafeNavigationUrl(url)) return [];
          return [{
            id: item.id,
            label: item.label.slice(0, 255),
            url: url.slice(0, 1000),
            ...(typeof item.parentId === "string" ? { parentId: item.parentId } : {}),
            ...(item.openNewTab === true ? { openNewTab: true } : {}),
          }];
        });
        return [{ id: menu.id, name: menu.name.slice(0, 100), items }];
      })
    : [];
  const safeMenus = menus.length ? menus : DEFAULT_SITE_NAVIGATION.menus;
  const location = (key: "header" | "footer") => {
    const id = source.locations?.[key];
    return typeof id === "string" && safeMenus.some((menu) => menu.id === id)
      ? id
      : key === "header" ? safeMenus[0]?.id : undefined;
  };
  const logoSource = source.logo && typeof source.logo === "object" ? source.logo : {};
  return {
    menus: safeMenus,
    locations: { header: location("header"), footer: location("footer") },
    logo: {
      mode: logoSource.mode === "image" ? "image" : "text",
      text: typeof logoSource.text === "string" ? logoSource.text.slice(0, 255) : "Your brand",
      imageUrl: typeof logoSource.imageUrl === "string" ? logoSource.imageUrl.slice(0, 1000) : undefined,
      imageAlt: typeof logoSource.imageAlt === "string" ? logoSource.imageAlt.slice(0, 255) : undefined,
    },
  };
}
