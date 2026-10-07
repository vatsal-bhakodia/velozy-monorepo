export type NavbarVariant =
  | "classic"
  | "centered"
  | "floating"
  | "glass"
  | "minimal"
  | "split";

export type NavbarItem = {
  id: string;
  label: string;
  url: string;
  type?: "page" | "blog-category" | "product-category" | "custom";
  parentId?: string;
  openNewTab?: boolean;
  categorySettings?: {
    showSubcategories?: boolean;
    subcategoryLimit?: number;
    subcategoryOrder?: "default" | "random";
  };
};

export type NavbarNavigation = {
  menus: Array<{ id: string; name: string; items: NavbarItem[] }>;
  locations?: { header?: string; footer?: string };
  logo?: {
    mode?: "image" | "text";
    text?: string;
    imageUrl?: string;
    imageAlt?: string;
  };
};
