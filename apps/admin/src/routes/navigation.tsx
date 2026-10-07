"use client";

import { apiFetch } from "@/src/lib/api";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { MediaPicker } from "@/components/admin/media-picker";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Link2,
  MoreHorizontal,
  Plus,
  Settings2,
  Trash2,
  Type,
  X,
} from "lucide-react";

type TargetType = "page" | "blog-category" | "product-category" | "custom";
type CategorySettings = {
  showSubcategories: boolean;
  subcategoryLimit: number;
  subcategoryOrder: "default" | "random";
};
type NavItem = {
  id: string;
  label: string;
  url: string;
  type: TargetType;
  targetId?: string;
  parentId?: string;
  openNewTab?: boolean;
  categorySettings?: CategorySettings;
};
type NavMenu = { id: string; name: string; items: NavItem[] };
type LogoSettings = {
  mode: "image" | "text";
  text: string;
  imageUrl: string;
  imageAlt: string;
};
type Navigation = {
  menus: NavMenu[];
  locations: { header: string; footer: string };
  logo: LogoSettings;
};
type Option = { id: string; name: string; slug: string; title?: string };

const defaultCategorySettings: CategorySettings = {
  showSubcategories: false,
  subcategoryLimit: 5,
  subcategoryOrder: "default",
};
const starterItems: NavItem[] = [
  { id: "home", label: "Home", url: "/", type: "page" },
  { id: "about", label: "About", url: "/about", type: "page" },
  { id: "services", label: "Services", url: "/services", type: "page" },
  { id: "contact", label: "Contact", url: "/contact", type: "page" },
];
const defaultLogo: LogoSettings = {
  mode: "text",
  text: "",
  imageUrl: "",
  imageAlt: "",
};
const emptyNavigation: Navigation = {
  menus: [{ id: "primary", name: "Primary menu", items: starterItems }],
  locations: { header: "primary", footer: "" },
  logo: defaultLogo,
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function optionLabel(option: Option) {
  return option.title || option.name;
}
function typeLabel(type: TargetType) {
  return type === "blog-category"
    ? "Blog category"
    : type === "product-category"
      ? "Collection"
      : type === "page"
        ? "Page"
        : "Custom URL";
}

export default function NavigationPage() {
  const { selectedProjectId } = useAdmin();
  const [navigation, setNavigation] = useState<Navigation>(emptyNavigation);
  const [activeMenuId, setActiveMenuId] = useState("primary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    nested: boolean;
  } | null>(null);
  const [pages, setPages] = useState<Option[]>([]);
  const [blogCategories, setBlogCategories] = useState<Option[]>([]);
  const [productCategories, setProductCategories] = useState<Option[]>([]);
  const [projectLogo, setProjectLogo] = useState("");
  const [projectName, setProjectName] = useState("");
  const [form, setForm] = useState({
    label: "",
    url: "",
    type: "custom" as TargetType,
    targetId: "",
    parentId: "",
    openNewTab: false,
    categorySettings: defaultCategorySettings,
  });

  const activeMenu =
    navigation.menus.find((menu) => menu.id === activeMenuId) ||
    navigation.menus[0];
  const allItems = activeMenu?.items || [];
  const topLevel = useMemo(
    () => allItems.filter((item) => !item.parentId),
    [allItems],
  );
  const optionsForType =
    form.type === "page"
      ? pages
      : form.type === "blog-category"
        ? blogCategories
        : productCategories;

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/admin/navigation?projectId=${selectedProjectId}`).then(
        (res) => res.json(),
      ),
      apiFetch(`/api/admin/pages?projectId=${selectedProjectId}`).then((res) =>
        res.json(),
      ),
      apiFetch(
        `/api/admin/blog-categories?projectId=${selectedProjectId}`,
      ).then((res) => res.json()),
      apiFetch(
        `/api/admin/product-categories?projectId=${selectedProjectId}`,
      ).then((res) => res.json()),
      apiFetch(`/api/admin/projects?projectId=${selectedProjectId}`).then(
        (res) => res.json(),
      ),
    ])
      .then(([navData, pageData, blogData, productData, projectData]) => {
        const stored = navData.navigation;
        const currentProject = projectData.project;
        const currentProjectLogo = currentProject?.logo || "";
        const savedLogo = stored?.logo || {};
        const hasDefaultLogoText =
          !savedLogo.text || savedLogo.text === "Your brand";
        const value: Navigation = {
          ...emptyNavigation,
          ...(stored?.menus?.length ? stored : {}),
          logo: {
            ...defaultLogo,
            ...savedLogo,
            mode:
              currentProjectLogo &&
              (!savedLogo.mode ||
                (savedLogo.mode === "text" && hasDefaultLogoText))
                ? "image"
                : savedLogo.mode || "text",
            text: hasDefaultLogoText
              ? currentProject?.name || "Your brand"
              : savedLogo.text,
            imageUrl: savedLogo.imageUrl || currentProjectLogo,
            imageAlt: savedLogo.imageAlt || currentProject?.name || "",
          },
        };
        setNavigation(value);
        setActiveMenuId(value.menus[0].id);
        setProjectName(currentProject?.name || "");
        setPages(
          (pageData.pages || []).map((item: Option) => ({
            id: item.id,
            name: item.title || item.name,
            slug: item.slug,
          })),
        );
        setBlogCategories(
          (blogData.categories || []).map((item: Option) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
          })),
        );
        setProductCategories(
          (productData.categories || []).map((item: Option) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
          })),
        );
        setProjectLogo(currentProjectLogo);
      })
      .catch(() => toast.error("Could not load navigation data"))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const updateMenu = (items: NavItem[]) =>
    setNavigation((current) => ({
      ...current,
      menus: current.menus.map((menu) =>
        menu.id === activeMenu.id ? { ...menu, items } : menu,
      ),
    }));
  const save = async () => {
    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/admin/navigation?projectId=${selectedProjectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ navigation }),
        },
      );
      if (!response.ok) throw new Error();
      toast.success("Navigation saved");
    } catch {
      toast.error("Could not save navigation");
    } finally {
      setSaving(false);
    }
  };
  const openAdd = (item?: NavItem) => {
    setEditing(item || null);
    setForm(
      item
        ? {
            label: item.label,
            url: item.url,
            type: item.type,
            targetId: item.targetId || "",
            parentId: item.parentId || "",
            openNewTab: !!item.openNewTab,
            categorySettings: {
              ...defaultCategorySettings,
              ...(item.categorySettings || {}),
            },
          }
        : {
            label: "",
            url: "",
            type: "custom",
            targetId: "",
            parentId: "",
            openNewTab: false,
            categorySettings: defaultCategorySettings,
          },
    );
    setAddOpen(true);
  };
  const selectType = (type: TargetType) =>
    setForm((current) => ({
      ...current,
      type,
      targetId: "",
      label: type === "custom" ? current.label : "",
      url: type === "custom" ? current.url : "",
    }));
  const selectTarget = (targetId: string) => {
    const selected = optionsForType.find((option) => option.id === targetId);
    if (!selected) return setForm((current) => ({ ...current, targetId }));
    const prefix =
      form.type === "page"
        ? ""
        : form.type === "blog-category"
          ? "/blog/category/"
          : "/shop/category/";
    setForm((current) => ({
      ...current,
      targetId,
      label: optionLabel(selected),
      url: `${prefix}${selected.slug}`,
    }));
  };
  const submitItem = () => {
    if (!form.label.trim() || !form.url.trim())
      return toast.error("Choose a destination and add a label");
    if (form.parentId === editing?.id)
      return toast.error("An item cannot be its own parent");
    const item: NavItem = {
      id: editing?.id || uid(),
      label: form.label.trim(),
      url: form.url.trim(),
      type: form.type,
      targetId: form.targetId || undefined,
      parentId: form.parentId || undefined,
      openNewTab: form.openNewTab,
      categorySettings:
        form.type === "blog-category" || form.type === "product-category"
          ? form.categorySettings
          : undefined,
    };
    updateMenu(
      editing
        ? allItems.map((entry) => (entry.id === editing.id ? item : entry))
        : [...allItems, item],
    );
    setAddOpen(false);
  };
  const move = (id: string, direction: -1 | 1) => {
    const items = [...topLevel];
    const index = items.findIndex((item) => item.id === id);
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    const order = new Map(items.map((item, index) => [item.id, index]));
    updateMenu(
      [...allItems].sort(
        (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
      ),
    );
  };
  const deleteItem = (id: string) =>
    updateMenu(
      allItems.filter((item) => item.id !== id && item.parentId !== id),
    );
  const addMenu = () => {
    const menu = {
      id: uid(),
      name: `Menu ${navigation.menus.length + 1}`,
      items: [],
    };
    setNavigation({ ...navigation, menus: [...navigation.menus, menu] });
    setActiveMenuId(menu.id);
  };

  const handleLogoFile = () => setMediaPickerOpen(true);
  const handleRemoveLogo = () =>
    setNavigation((current) => ({
      ...current,
      logo: { ...current.logo, imageUrl: "", imageAlt: "" },
    }));

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const id = draggedId;
    if (
      !id ||
      id === targetId ||
      allItems.some((item) => item.id === id && item.parentId === targetId)
    )
      return;
    const target = allItems.find((item) => item.id === targetId);
    const source = allItems.find((item) => item.id === id);
    if (!target || !source || target.id === source.parentId) return;
    const nested = dropTarget?.id === targetId ? dropTarget.nested : false;
    const descendants = new Set<string>();
    const collect = (parent: string) =>
      allItems
        .filter((item) => item.parentId === parent)
        .forEach((item) => {
          descendants.add(item.id);
          collect(item.id);
        });
    collect(id);
    const remaining = allItems.filter(
      (item) => item.id !== id && !descendants.has(item.id),
    );
    const nextItem = {
      ...source,
      parentId: nested ? target.id : target.parentId,
    };
    const targetIndex = remaining.findIndex((item) => item.id === target.id);
    let insertAt = targetIndex < 0 ? remaining.length : targetIndex;
    if (nested) {
      insertAt = targetIndex + 1;
      while (remaining[insertAt]?.parentId === target.id) insertAt += 1;
    }
    remaining.splice(insertAt, 0, nextItem);
    updateMenu(remaining);
    setDraggedId(null);
    setDropTarget(null);
  };
  if (loading)
    return (
      <div className="min-h-[calc(100vh-5rem)] animate-pulse rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
    );
  return (
    <>
      <PageFrame
        title="Navigation"
        description="Organize the links visitors use to explore your site."
        headerAction={
          <Button onClick={save} disabled={saving} className="h-10 shadow-sm">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
        aside={
          <div className="space-y-6">
            <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mb-5 flex items-center gap-2">
                <div className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-700">
                  <Settings2 className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Display locations
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Choose where menus appear
                  </p>
                </div>
              </div>
              <label className="mb-2 block text-xs font-semibold text-neutral-500">
                Header menu
              </label>
              <Select
                value={navigation.locations.header}
                onValueChange={(value) =>
                  setNavigation({
                    ...navigation,
                    locations: {
                      ...navigation.locations,
                      header: value,
                    },
                  })
                }
              >
                <SelectTrigger className="mb-5"><SelectValue /></SelectTrigger>
                <SelectContent>{navigation.menus.map((menu) => <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>)}</SelectContent>
              </Select>
              <label className="mb-2 block text-xs font-semibold text-neutral-500">
                Footer menu
              </label>
              <Select
                value={navigation.locations.footer || "__none"}
                onValueChange={(value) =>
                  setNavigation({
                    ...navigation,
                    locations: {
                      ...navigation.locations,
                      footer: value === "__none" ? "" : value,
                    },
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none">None</SelectItem>{navigation.menus.map((menu) => <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>)}</SelectContent>
              </Select>
            </section>
            <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Header logo
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Choose how your brand appears
                    </p>
                  </div>
                </div>
                {navigation.logo.mode === "image" &&
                  (navigation.logo.imageUrl || projectLogo) && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                    className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:text-red-400 dark:hover:bg-red-950/40"
                      aria-label="Remove logo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {(["text", "image"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setNavigation({
                        ...navigation,
                        logo: { ...navigation.logo, mode },
                      })
                    }
                    variant="secondary"
                    className={`h-10 flex-1 gap-2 px-3 text-xs ${navigation.logo.mode === mode ? "bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-white dark:hover:text-neutral-900" : ""}`}
                  >
                    {mode === "text" ? (
                      <Type className="h-3.5 w-3.5" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    {mode === "text" ? "Text logo" : "Image logo"}
                  </Button>
                ))}
              </div>
              {navigation.logo.mode === "text" ? (
                <>
                  <label className="mb-2 block text-xs font-semibold text-neutral-500">
                    Logo text
                  </label>
                  <Input
                    value={navigation.logo.text}
                    onChange={(e) =>
                      setNavigation({
                        ...navigation,
                        logo: { ...navigation.logo, text: e.target.value },
                      })
                    }
                    placeholder={projectName || "Your brand"}
                    className="h-10"
                  />
                </>
              ) : (
                <>
                  <div className="flex min-h-[150px] items-center justify-center rounded-lg bg-neutral-50 p-6 dark:bg-neutral-900/60">
                    {navigation.logo.imageUrl || projectLogo ? (
                      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-neutral-800">
                        <img
                          src={navigation.logo.imageUrl || projectLogo}
                          alt="Logo preview"
                          className="mx-auto max-h-[90px] max-w-[180px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800">
                          <ImagePlus className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            No logo uploaded
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-500">
                            Upload a logo to see preview
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleLogoFile}
                    variant="secondary"
                    className="my-4 w-full text-xs"
                  >
                    <ImagePlus className="mr-1.5 h-3 w-3" />
                    {navigation.logo.imageUrl || projectLogo
                      ? "Replace image"
                      : "Choose image"}
                  </Button>
                  <label className="mb-2 block text-xs font-semibold text-neutral-500">
                    Accessible alt text
                  </label>
                  <Input
                    value={navigation.logo.imageAlt}
                    onChange={(e) =>
                      setNavigation({
                        ...navigation,
                        logo: { ...navigation.logo, imageAlt: e.target.value },
                      })
                    }
                    placeholder="Your brand logo"
                    className="h-10"
                  />
                </>
              )}
            </section>
          </div>
        }
      >
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-neutral-200 dark:border-neutral-700">
          {navigation.menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActiveMenuId(menu.id)}
              className={`mr-5 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${activeMenuId === menu.id ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"}`}
            >
              {menu.name}
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
                {menu.items.length}
              </span>
            </button>
          ))}
          <Button
            onClick={addMenu}
            className="mb-2"
            variant="secondary"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" /> New menu
          </Button>
        </div>
        <section className="min-w-0 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {activeMenu.name}
                </h2>
              </div>
              <button className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

          </div>

          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
            <p className="px-3 pb-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
              MENU ITEMS{" "}
              <span className="ml-1 font-normal">
                · drag vertically to reorder · drag right to nest
              </span>
            </p>
            <div className="space-y-2">
              {allItems.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Your menu is empty. Add your first link below.
                </div>
              )}
              {allItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedId(item.id)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDropTarget(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    const rect = event.currentTarget.getBoundingClientRect();
                    setDropTarget({
                      id: item.id,
                      nested: event.clientX - rect.left > 58,
                    });
                  }}
                  onDrop={(event) => handleDrop(event, item.id)}
                  className={`${item.parentId ? "ml-8" : ""} ${dropTarget?.id === item.id ? (dropTarget.nested ? "border-cyan-600 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950/30" : "border-cyan-600 dark:border-cyan-400") : ""} group flex cursor-grab items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50 active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-neutral-300" />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {item.label}
                      </div>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {typeLabel(item.type)}
                      </span>
                      {item.categorySettings?.showSubcategories && (
                        <span className="shrink-0 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                          + subcollections
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {item.url}
                    </div>
                  </div>
                  <div className="hidden items-center gap-1 group-hover:flex group-focus-within:flex">
                    <button
                      onClick={() => move(item.id, -1)}
                      disabled={!!item.parentId || index === 0}
                      className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:opacity-25 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(item.id, 1)}
                      disabled={
                        !!item.parentId || index === topLevel.length - 1
                      }
                      className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:opacity-25 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openAdd(item)}
                      className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:text-red-400 dark:hover:bg-red-700 dark:hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => openAdd()}
              variant="secondary"
              className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm"
            >
              <Plus className="h-4 w-4" /> Add menu item
            </Button>
          </div>
        </section>
            <section className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                  Live preview
                </p>
                <h2 className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">
                  Your site header
                </h2>
              </div>
              <ExternalLink className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="mb-8 flex items-center justify-between gap-3">
              <div className="flex h-8 min-w-0 max-w-[110px] items-center overflow-hidden whitespace-nowrap text-ellipsis text-sm font-bold text-neutral-900 dark:text-white">
                {navigation.logo.mode === "image" &&
                (navigation.logo.imageUrl || projectLogo) ? (
                  <img
                    src={navigation.logo.imageUrl || projectLogo}
                    alt={
                      navigation.logo.imageAlt ||
                      `${projectName || "Site"} logo`
                    }
                    className="max-h-8 max-w-[110px] object-contain"
                  />
                ) : (
                  navigation.logo.text || projectName || "Your brand"
                )}
              </div>
              <div className="flex gap-3">
                {topLevel.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="text-[10px] text-neutral-500 dark:text-neutral-400"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
              <div className="h-5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <div className="h-24 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
        </section>
      </PageFrame>
      {addOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-950 dark:text-white">
                  {editing ? "Edit menu item" : "Add menu item"}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Choose from your site content or add a custom link.
                </p>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mb-2 block text-xs font-semibold text-neutral-500">
              Destination type
            </label>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {(
                [
                  "page",
                  "blog-category",
                  "product-category",
                  "custom",
                ] as TargetType[]
              ).map((type) => (
                <Button
                  key={type}
                  type="button"
                  onClick={() => selectType(type)}
                  variant="secondary"
                  className={`h-10 px-2 text-xs ${form.type === type ? "bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:hover:text-neutral-900" : ""}`}
                >
                  {typeLabel(type)}
                </Button>
              ))}
            </div>
            {form.type !== "custom" && (
              <>
                <label className="mb-2 block text-xs font-semibold text-neutral-500">
                  Choose {typeLabel(form.type).toLowerCase()}
                </label>
                <Select value={form.targetId || "__none"} onValueChange={(value) => selectTarget(value === "__none" ? "" : value)}>
                  <SelectTrigger className="mb-4"><SelectValue placeholder="Select an option…" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none">Select an option…</SelectItem>{optionsForType.map((option) => <SelectItem key={option.id} value={option.id}>{optionLabel(option)}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            {form.type === "custom" && (
              <>
                <label className="mb-2 block text-xs font-semibold text-neutral-500">
                  Destination URL
                </label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com"
                  className="mb-4"
                />
              </>
            )}
            <label className="mb-2 block text-xs font-semibold text-neutral-500">
              Navigation label
            </label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Our story"
              className="mb-4"
            />
            {(form.type === "blog-category" ||
              form.type === "product-category") && (
              <div className="mb-4 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <div className="mb-3 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  Subcollection dropdown
                </div>
                <label className="mb-3 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <Checkbox
                    checked={form.categorySettings.showSubcategories}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        categorySettings: {
                          ...form.categorySettings,
                          showSubcategories: checked === true,
                        },
                      })
                    }
                  />{" "}
                  Show subcollections
                </label>
                {form.categorySettings.showSubcategories && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-neutral-500">
                        Maximum shown
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={form.categorySettings.subcategoryLimit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            categorySettings: {
                              ...form.categorySettings,
                              subcategoryLimit: Math.max(
                                1,
                                Number(e.target.value),
                              ),
                            },
                          })
                        }
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-neutral-500">
                        Sort order
                      </label>
                      <Select
                        value={form.categorySettings.subcategoryOrder}
                        onValueChange={(value) =>
                          setForm({
                            ...form,
                            categorySettings: {
                              ...form.categorySettings,
                              subcategoryOrder: value as
                                "default" | "random",
                            },
                          })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="default">Default</SelectItem><SelectItem value="random">Random</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
            {allItems.length > 0 && (
              <>
                <label className="mb-2 block text-xs font-semibold text-neutral-500">
                  Nest under{" "}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <Select
                  value={form.parentId || "__top_level"}
                  onValueChange={(value) => setForm({ ...form, parentId: value === "__top_level" ? "" : value })}
                >
                  <SelectTrigger className="mb-4"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="__top_level">Top level</SelectItem>
                  {allItems
                    .filter(
                      (entry) => !entry.parentId && entry.id !== editing?.id,
                    )
                    .map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <label className="mb-6 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <Checkbox
                checked={form.openNewTab}
                onCheckedChange={(checked) =>
                  setForm({ ...form, openNewTab: checked === true })
                }
              />{" "}
              Open link in a new tab
            </label>
            <Button type="button" onClick={submitItem} className="h-11 w-full">
              {editing ? "Update item" : "Add to menu"}
            </Button>
          </div>
        </div>
      )}
      <MediaPicker
        projectId={selectedProjectId}
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(item) =>
          setNavigation((current) => ({
            ...current,
            logo: {
              ...current.logo,
              mode: "image",
              imageUrl: item.url,
              imageAlt: current.logo.imageAlt || item.name,
            },
          }))
        }
        title="Choose a navigation logo"
      />
    </>
  );
}
