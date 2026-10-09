"use client";

import { useSession } from "@/src/lib/auth";
import { useRouter } from "@/src/lib/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/admin/header";
import { SettingsBackLink } from "@/components/admin/settings-back-link";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Settings,
  Home,
  BarChart3,
  Edit,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Menu,
  Images,
  ArrowRightLeft,
  LineChart,
  Megaphone,
  Mail,
  Bot,
  Database,
} from "lucide-react";
import { useAdmin } from "./admin-context";
import { Toaster } from "@/components/ui/sonner";

function getAdminPageTitle(pathname: string, search = "") {
  if (pathname === "/" || pathname === "/dashboard") {
    return "Dashboard";
  }

  if (pathname === "/media") return "Media Library";
  if (pathname === "/pages") return "Pages";
  if (pathname === "/content-collections") return "Content Collections";
  if (pathname.startsWith("/content-collections/")) {
    if (pathname.includes("/records/"))
      return pathname.endsWith("/new") ? "Add Record" : "Edit Record";
    return pathname.endsWith("/new") ? "New Collection" : "Edit Collection";
  }
  if (pathname === "/blogs") return "Blog Posts";
  if (pathname === "/blog-categories") return "Blog Categories";
  if (pathname.startsWith("/blogs/")) {
    return pathname.endsWith("/new") ? "Create Blog Post" : "Edit Blog Post";
  }
  if (pathname === "/products") return "Products";
  if (pathname === "/product-attributes") return "Product Attributes";
  if (pathname.startsWith("/products/")) {
    return pathname.endsWith("/new") ? "Add Product" : "Edit Product";
  }
  if (pathname === "/collections") return "Collections";
  if (pathname.startsWith("/collections/")) {
    return pathname.endsWith("/new") ? "Add Collection" : "Edit Collection";
  }
  if (pathname === "/navigation" || pathname === "/settings/navigation")
    return "Navigation";
  if (pathname === "/commerce/sales") {
    const view = new URLSearchParams(search).get("view");
    if (view === "payments" || view === "fulfillment" || view === "invoices")
      return view[0].toUpperCase() + view.slice(1);
    return "Orders";
  }
  if (pathname === "/commerce/customers") return "Customers";
  if (pathname === "/commerce/discounts") return "Discounts";
  if (pathname === "/commerce/carts") return "Carts & Returns";
  if (pathname === "/commerce/returns") return "Returns";
  if (pathname === "/commerce/inventory") return "Inventory";
  if (pathname === "/commerce/inventory/locations")
    return "Inventory Locations";
  if (pathname === "/commerce/payments") return "Payments";
  if (pathname === "/commerce/fulfillment") return "Fulfillment";
  if (
    pathname === "/commerce/shipping-tax" ||
    pathname === "/settings/shipping-tax"
  )
    return "Shipping & Taxes";
  if (pathname === "/commerce/checkout" || pathname === "/settings/checkout")
    return "Checkout";
  if (pathname === "/commerce/invoices") return "Invoices";
  if (
    pathname === "/commerce/notifications" ||
    pathname === "/settings/notifications"
  )
    return "Notifications";
  if (pathname.startsWith("/commerce/orders/")) return "Order Details";
  if (pathname.startsWith("/commerce/carts/")) return "Cart Details";
  if (pathname.startsWith("/commerce/returns/")) return "Return Details";
  if (pathname.startsWith("/commerce/payments/")) return "Payment Details";
  if (pathname.startsWith("/commerce/fulfillment/"))
    return "Fulfillment Details";
  if (pathname.startsWith("/commerce/invoices/")) return "Invoice Details";
  if (pathname === "/analytics") return "Analytics";
  if (pathname === "/marketing" || pathname.startsWith("/marketing/"))
    return "SEO Campaign";
  if (pathname === "/seo/campaign") return "SEO Campaign";
  if (pathname === "/seo") {
    const tab = new URLSearchParams(search).get("tab");
    if (tab === "audit") return "Technical SEO Audit";
    if (tab === "records") return "SEO Records";
    return "SEO Overview";
  }
  if (pathname === "/growth") return "Growth";
  if (pathname === "/migration") return "Migration";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/settings/project") return "Project Settings";
  if (pathname === "/settings/team") return "People & Permissions";
  if (pathname === "/settings/plan-usage") return "Billing & Usage";
  if (pathname === "/settings/domains") return "Custom Domain";
  if (pathname === "/settings/appearance") return "Branding & Appearance";
  if (pathname === "/settings/payments") return "Payment Providers";
  if (pathname === "/settings/delivery") return "Delivery Providers";
  if (pathname === "/settings/recovery") return "Recovery Settings";
  if (pathname === "/settings/account" || pathname === "/account")
    return "Account Settings";

  return "Admin Dashboard";
}

function AdminLayoutContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const location = useLocation();
  const pathname = location.pathname;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const {
    projects,
    projectsReady,
    selectedProjectId,
    setSelectedProjectId,
  } = useAdmin();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && projectsReady && projects.length === 0) {
      router.replace("/onboard");
    }
  }, [status, projectsReady, projects.length, router]);

  // Update active section based on current pathname
  useEffect(() => {
    // Check for known multi-segment slugs first
    if (pathname.includes("/collections")) {
      setActiveSection("collections");
    } else if (pathname.includes("/products")) {
      setActiveSection("products");
    } else if (
      pathname.includes("/blogs") ||
      pathname.includes("/blog-categories")
    ) {
      setActiveSection("blogs");
    } else if (pathname.includes("/pages")) {
      setActiveSection("pages");
    } else if (pathname.includes("/content-collections")) {
      setActiveSection("content-collections");
    } else if (pathname.includes("/media")) {
      setActiveSection("media");
    } else if (pathname.startsWith("/settings")) {
      setActiveSection("settings");
    } else if (pathname.startsWith("/migration")) {
      setActiveSection("migration");
    } else {
      setActiveSection(pathname.replace(/^\/admin\/?/, "") || "dashboard");
    }
  }, [pathname]);

  useEffect(() => {
    document.title = `${getAdminPageTitle(pathname, location.search)} | Velozy`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleResize = () => {
      // Only auto-collapse on mobile, keep desktop behavior controlled by hover
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
        setMobileSidebarOpen(false); // Close mobile sidebar on resize
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  if (!session) {
    return null;
  }

  if (projectsReady && projects.length === 0) {
    return null;
  }

  const sidebarItems = [
    { slug: "dashboard", label: "Dashboard", icon: Home },
    { slug: "ai", label: "AI Assistant", icon: Bot },
    {
      slug: "blogs",
      label: "Blogs",
      icon: Edit,
      children: [
        {
          slug: "blogs",
          label: "View All",
          href: "/blogs",
          searchLabel: "Blog Posts",
          searchDescription: "Manage blog posts",
        },
        {
          slug: "blogs/new",
          label: "Add New",
          href: "/blogs/new",
          searchLabel: "Add Blog Post",
          searchDescription: "Write a blog post",
        },
        {
          slug: "blog-categories",
          label: "Categories",
          href: "/blog-categories",
          searchLabel: "Blog Categories",
          searchDescription: "Organize blog posts",
        },
      ],
    },
    { slug: "media", label: "Media Library", icon: Images },
    { slug: "pages", label: "Pages", icon: FileText },
    { slug: "content-collections", label: "Content Collections", icon: Database, href: "/content-collections", searchDescription: "Manage custom structured content" },
    {
      slug: "products",
      label: "Products",
      icon: ShoppingBag,
      children: [
        {
          slug: "products",
          label: "View All",
          href: "/products",
          searchLabel: "Product",
          searchDescription: "Manage your products",
        },
        {
          slug: "products/new",
          label: "Add New",
          searchLabel: "Add Product",
          searchDescription: "Create a product",
        },
        {
          slug: "product-attributes",
          label: "Attributes",
          href: "/product-attributes",
          searchDescription: "Manage product attributes",
        },
        {
          slug: "collections",
          label: "Collections",
          href: "/collections",
          searchDescription: "Manage product collections",
        },
      ],
    },
    {
      slug: "commerce",
      label: "Commerce",
      icon: ShoppingCart,
      children: [
        { slug: "commerce/inventory", label: "Inventory" },
        {
          slug: "commerce/customers",
          label: "Customers",
          icon: CreditCard,
          searchGroup: "Sales",
          searchDescription: "Manage your customers",
        },
        { slug: "commerce/carts", label: "Carts & Returns" },
        {
          slug: "commerce/sales",
          label: "Sales",
          href: "/commerce/sales?view=orders",
        },
        { slug: "commerce/discounts", label: "Discounts" },
      ],
    },
    {
      slug: "enquiries",
      label: "Enquiries",
      icon: Mail,
      children: [
        { slug: "enquiries", label: "All Enquiries" },
        { slug: "enquiries/forms", label: "Forms" },
      ],
    },
    {
      slug: "growth",
      label: "Growth",
      icon: LineChart,
      href: "/growth?view=overview",
    },
    {
      slug: "marketing",
      label: "SEO Campaign",
      icon: Megaphone,
      children: [
        { slug: "seo/campaign", label: "Campaign", href: "/seo/campaign" },
        { slug: "seo", label: "SEO Workspace", href: "/seo" },
      ],
    },
    {
      slug: "migration",
      label: "Migration",
      icon: ArrowRightLeft,
    },
    { slug: "settings", label: "Settings", icon: Settings },
  ];

  const userInfo = {
    name: session.user?.name || "User",
    initials: session.user?.name
      ? session.user.name.charAt(0).toUpperCase()
      : "U",
  };
  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      <Header
        userInfo={userInfo}
        mobileSidebarOpen={mobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
        sidebarCollapsed={sidebarCollapsed}
        sidebarItems={sidebarItems}
      />
      <div className="flex relative">
        {/* Desktop Sidebar - Fixed positioning, floating layer */}
        <div
          ref={sidebarRef}
          className="fixed left-0 top-0 z-40 hidden h-screen md:block"
        >
          <Sidebar
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            sidebarItems={sidebarItems}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Mobile Sidebar */}
            <div className="absolute top-0 left-0 h-full">
              <Sidebar
                sidebarCollapsed={false}
                setSidebarCollapsed={() => {}}
                sidebarItems={sidebarItems}
                activeSection={activeSection}
                setActiveSection={(id) => {
                  setActiveSection(id);
                  setMobileSidebarOpen(false); // Close mobile sidebar when item is clicked
                }}
                isMobile={true}
                onMobileClose={() => setMobileSidebarOpen(false)}
                projects={projects}
                selectedProjectId={selectedProjectId}
                onProjectChange={setSelectedProjectId}
              />
            </div>
          </div>
        )}

        <main
          className={`admin-main-content min-h-[calc(100vh-3.5rem)] flex-1 overflow-auto w-full ${sidebarCollapsed ? "md:ml-14" : "md:ml-60"} transition-[margin] duration-200 ease-in-out ${pathname === "/ai" ? "p-0" : "p-4"}`}
        >
          {pathname.startsWith("/settings/") && (
            <div className="-mx-4 mb-3">
              <div className="admin-editor mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
                <SettingsBackLink />
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <>
      <AdminLayoutContent />
      <Toaster />
    </>
  );
}
