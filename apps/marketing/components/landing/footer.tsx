import Image from "next/image";
import Link from "next/link";
import { adminUrl } from "@/lib/admin-url";
import logo from "../../public/logo.svg";

export default function Footer() {
  const groups = [
    {
      title: "Get started",
      links: [
        ["Features", "#product"],
        ["How it works", "#process"],
        ["Start Building", adminUrl("/onboard")],
        ["Showcase", "#showcase"],
        ["Pricing", "#pricing"],
      ],
    },
    {
      title: "Professionals",
      links: [
        ["For agencies", "#agencies"],
        ["For creators", "#creators"],
        ["For developers", "#developers"],
        ["Customer support", "#support"],
        ["Sign in", adminUrl("/signin")],
      ],
    },
    {
      title: "Resources",
      links: [
        ["FAQ", "#faq"],
        ["Case studies", "#showcase"],
        ["Blog", "#blog"],
        ["Help center", "#help"],
        ["Contact us", "#contact"],
      ],
    },
    {
      title: "Company",
      links: [
        ["About", "#about"],
        ["Careers", "#careers"],
        ["Trust center", "#trust"],
        ["Become an affiliate", "#affiliate"],
        ["What's new", "#updates"],
      ],
    },
  ];

  return (
    <footer className="overflow-hidden bg-black text-white">
      <div className="w-full px-5 pt-16 sm:px-8 sm:pt-20 lg:px-[4.65vw] lg:pt-24">
        <div className="pb-14 lg:pb-20">
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4"
          >
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                  {group.title}
                </h2>
                <ul>
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        className="inline-flex min-h-11 items-center rounded-sm py-2 text-sm leading-6 text-gray-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                        href={href}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Velozy</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-1">
            {[
              ["Terms", "#terms"],
              ["Privacy", "#privacy"],
              ["Data controls", "#controls"],
            ].map(([label, href]) => (
              <Link
                key={label}
                className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                href={href}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footer-logo w-full select-none -mb-5 pt-4 sm:pt-8">
          <Image
            alt="Velozy"
            src={logo}
            className="h-auto w-full opacity-20 [filter:invert(1)] [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)]"
          />
        </div>
      </div>
    </footer>
  );
}
