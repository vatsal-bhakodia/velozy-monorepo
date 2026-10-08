import {
  Bell,
  ChevronRight,
  CreditCard,
  Menu,
  Palette,
  Truck,
  UserRound,
  Building2,
  UsersRound,
  LifeBuoy,
  BarChart3,
  Globe,
} from "lucide-react";
import Link from "@/components/router-link";

const groups = [
  {
    title: "Your Profile",
    items: [
      {
        title: "Account",
        description: "Manage your profile and password",
        href: "/settings/account",
        icon: UserRound,
      },
    ],
  },
  {
    title: "Project Settings",
    items: [
      {
        title: "Project settings",
        description: "Update your project name and industry",
        href: "/settings/project",
        icon: Building2,
      },
      {
        title: "People & permissions",
        description: "Invite collaborators and manage access",
        href: "/settings/team",
        icon: UsersRound,
      },
      {
        title: "Billing & usage",
        description: "Manage your plan, AI credits, and project usage",
        href: "/settings/plan-usage",
        icon: BarChart3,
      },
      {
        title: "Branding & Appearance",
        description: "Manage your logo and site theme",
        href: "/settings/appearance",
        icon: Palette,
      },
      {
        title: "Custom domain",
        description: "Connect a domain you own to your published site",
        href: "/settings/domains",
        icon: Globe,
      },
      {
        title: "Navigation",
        description: "Configure your menus and header",
        href: "/settings/navigation",
        icon: Menu,
      },
    ],
  },
  {
    title: "Payments & Commerce",
    items: [
      {
        title: "Checkout",
        description: "Set purchase options and currency",
        href: "/settings/checkout",
        icon: CreditCard,
      },
      {
        title: "Payment Providers",
        description: "Connect and manage payment gateways",
        href: "/settings/payments",
        icon: CreditCard,
      },
      {
        title: "Revenue Recovery",
        description: "Cart recovery, dunning and payment retries",
        href: "/settings/recovery",
        icon: LifeBuoy,
      },
      {
        title: "Shipping & Taxes",
        description: "Review shipping and tax settings",
        href: "/settings/shipping-tax",
        icon: Truck,
      },
      {
        title: "Delivery Providers",
        description: "Connect carriers for rates, labels, and tracking",
        href: "/settings/delivery",
        icon: Truck,
      },
      {
        title: "Notifications",
        description: "Configure customer notifications",
        href: "/settings/notifications",
        icon: Bell,
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="-mx-4">
      <div className="admin-editor mx-auto w-full max-w-[1600px] px-5 pb-8 sm:px-8 lg:px-12">
        <div className="space-y-6">
          {groups.map((group, index) => (
            <section
              key={group.title}
              aria-labelledby={`settings-${group.title}`}
              className={
                index
                  ? "border-t border-neutral-200 pt-6 dark:border-neutral-800"
                  : undefined
              }
            >
              <h2
                id={`settings-${group.title}`}
                className="mb-4 text-lg font-medium text-neutral-950 dark:text-neutral-50"
              >
                {group.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map(({ title, description, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-24 items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-neutral-900 dark:text-neutral-100">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                        {description}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
