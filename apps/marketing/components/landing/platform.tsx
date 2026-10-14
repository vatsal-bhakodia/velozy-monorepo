import Image from "next/image";
import {
  Check,
  Globe2,
  Layers3,
  MousePointer2,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import styles from "./platform.module.css";
import { Pill } from "@/components/magicui/pill";

const products = [
  {
    title: "AI Website Builder",
    description: "Turn an idea into a complete website in minutes.",
  },
  {
    title: "Website Editor",
    description:
      "Customize every page, section, and detail with complete creative control.",
  },
  {
    title: "eCommerce",
    description: "Sell products, manage orders, and grow your online store.",
  },
  {
    title: "SEO & Growth",
    description:
      "Get discovered, understand your visitors, and attract more customers.",
  },
];
const features = [
  "AI Generation",
  "Visual Editor",
  "Custom Domains",
  "CMS & Blogs",
  "Product Catalog",
  "Order Management",
  "SEO Tools",
  "Analytics",
];
const platformBenefits = [
  {
    icon: Sparkles,
    title: "Launch faster",
    description: "Go live sooner with AI-generated pages and content.",
  },
  {
    icon: MousePointer2,
    title: "Customize freely",
    description: "Shape every section and detail in the visual editor.",
  },
  {
    icon: Globe2,
    title: "Grow confidently",
    description:
      "Publish your site, manage your store, and improve visibility.",
  },
];

const previewSurface =
  "rounded-xl border border-white/[.14] bg-[#090e16] shadow-[0_14px_32px_#0003]";

function ProductIllustration({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className={styles.builder}>
        <div className={styles.prompt}>
          <Sparkles size={17} />
          <span className={styles.promptText}>
            A website for my design studio
          </span>
        </div>
        <div className={styles.window}>
          <div className="flex h-8 items-center gap-1 border-b border-white/[.08] px-3 text-[8px] text-slate-400 [&>span]:ml-2 [&>i]:h-1 [&>i]:w-1 [&>i]:rounded-full [&>i]:bg-white/25">
            <i />
            <i />
            <i />
            <span>studio.velozy.site</span>
          </div>
          <div className="relative min-h-[230px] overflow-hidden bg-[#0c1c30] px-[17px] py-5">
            <span className="text-[8px] tracking-[.12em]">FORMA®</span>
            <p className="relative z-[1] my-[22px] mb-[13px] text-2xl leading-[1.15] tracking-[-.06em]">
              Ideas into
              <br />
              <strong className="font-medium text-cyan-200">
                beautiful things.
              </strong>
            </p>
            <span className="relative z-[1] inline-block rounded-[3px] bg-cyan-300 px-[9px] py-[7px] text-[7px] text-[#071523]">
              Explore our work ↗
            </span>
            <div className={styles.siteArt} />
          </div>
        </div>
        <div className="absolute bottom-8 right-4 flex items-center gap-[7px] rounded-[7px] border border-cyan-300/25 bg-[#0b1927] p-2.5 text-[9px] text-cyan-100">
          <Check size={14} aria-hidden="true" /> Your starting point, created.
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className={`${styles.editor} pt-3`}>
        <div className={styles.window}>
          <div className="flex h-8 items-center gap-1 border-b border-white/[.08] px-3 text-[8px] text-slate-400 [&>span]:ml-2 [&>i]:h-1 [&>i]:w-1 [&>i]:rounded-full [&>i]:bg-white/25">
            <Layers3 size={12} />
            <span>Website editor</span>
            <span className="!ml-auto pr-2.5 text-cyan-300">Saved</span>
          </div>
          <div className="flex min-h-[245px]">
            <div className="flex w-[34px] shrink-0 flex-col items-center gap-5 border-r border-white/[.08] pt-3.5 text-[13px] text-slate-400">
              <Layers3 size={15} />
              <span>T</span>
              <span>＋</span>
              <ShoppingBag size={15} />
            </div>
            <div className="relative flex-1 overflow-hidden bg-[linear-gradient(150deg,#142b45,#0b121d)] px-[14px] py-8">
              <span className="text-[6px] tracking-[.12em] text-cyan-200">
                YOUR NEXT CHAPTER
              </span>
              <div className={styles.selection}>
                Make it
                <br />
                your own.
                <b />
                <b />
                <b />
                <b />
              </div>
              <div className="mt-[15px] h-6 w-4/5 bg-[repeating-linear-gradient(0deg,transparent_0_8px,#ffffff20_8px_10px)]" />
              <MousePointer2
                className={styles.cursor}
                size={27}
                fill="#67e8f9"
              />
            </div>
          </div>
        </div>
        <div className={styles.settings}>
          <span>Style your section</span>
          <div>
            <span>Colors</span>
            <i />
            <i />
            <i />
            <i />
          </div>
          <div>
            <span>Spacing</span>
            <div className={styles.slider} />
          </div>
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className={styles.commerce}>
        <div
          className={`${previewSurface} mr-3.5 flex items-center gap-2.5 p-[15px_12px] text-[10px]`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/[.12] text-cyan-300">
            <Check size={19} />
          </span>
          <div>
            New order received
            <span className="mt-1 block text-[8px] text-slate-400">
              Ready for your next customer
            </span>
          </div>
        </div>
        <div className={`${previewSurface} mt-3 overflow-hidden`}>
          <div className={styles.productArt}>
            <ShoppingBag size={78} strokeWidth={1} />
          </div>
          <div className="flex items-center justify-between p-3.5 text-[10px]">
            <span>
              Everyday essentials
              <small className="mt-1 block text-[8px] text-slate-400">
                The studio collection
              </small>
            </span>
            <span>↗</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-1 py-4 text-[8px] text-cyan-100">
          <ShoppingBag size={15} />
          <span>Products</span>
          <span>Orders</span>
          <span>Customers</span>
        </div>
      </div>
    );
  return (
    <div className="ml-5 w-[calc(100%-40px)]">
      <div className={styles.search}>
        <Search size={15} />
        <span>Your next customer is searching</span>
      </div>
      <div className={styles.chart}>
        <div>
          <span>See what’s working</span>
          <small>Traffic overview · illustrative</small>
        </div>
        <svg viewBox="0 0 250 110" fill="none">
          <path
            d="M0 95H250M0 60H250M0 25H250"
            stroke="white"
            strokeOpacity=".07"
          />
          <path
            d="M0 100L25 86L50 91L75 64L100 72L125 44L150 50L175 28L200 34L225 10L250 0V110H0Z"
            fill="url(#platform-chart-fill)"
          />
          <path
            pathLength={100}
            d="M0 100L25 86L50 91L75 64L100 72L125 44L150 50L175 28L200 34L225 10L250 0"
            stroke="#67e8f9"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="platform-chart-fill" x2="0" y2="1">
              <stop stopColor="#22d3ee" stopOpacity=".3" />
              <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {[
        [Search, "Search engine essentials"],
        [Globe2, "Understand your audience"],
        [Sparkles, "Find your next opportunity"],
      ].map(([Icon, label]) => {
        const RowIcon = Icon as typeof Search;
        return (
          <div className={styles.growthRow} key={String(label)}>
            <RowIcon size={16} />
            <span>{String(label)}</span>
            <Check size={13} />
          </div>
        );
      })}
    </div>
  );
}

export default function Platform() {
  return (
    <section
      id="platform"
      aria-labelledby="platform-heading"
      className="relative overflow-hidden bg-transparent pt-20 pb-16 text-white sm:pt-28"
    >
      <div className="mx-auto w-full px-[4.65vw] min-[1800px]:max-w-[1700px] max-[639px]:px-5">
        <div className="max-w-[1120px]">
          <Pill
            className="mb-6"
            textClassName="text-[11px] font-medium tracking-[.18em] text-white/80"
          >
            ONE CONNECTED PLATFORM
          </Pill>
          <h2
            id="platform-heading"
            className="text-[clamp(2.4rem,4.5vw,5rem)] font-medium leading-[1.08] tracking-[-.06em]"
          >
            Everything you need to
            <br className="hidden xl:block" /> build, launch, and{" "}
            <span className="bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent">
              grow online.
            </span>
          </h2>
          <p className="mt-[26px] max-w-[620px] text-[17px] leading-[1.8] text-[#a1a1aa] max-[639px]:text-[15px]">
            From your first AI-generated page to a fully functioning online
            business. Every tool works together, all in one place.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-4 gap-5 max-[1100px]:gap-[14px] max-[1023px]:grid-cols-2 max-[1023px]:gap-5 max-[639px]:mt-10 max-[639px]:grid-cols-1">
          {products.map((product, index) => (
            <article key={product.title} className={styles.card}>
              <div className={styles.preview}>
                <div aria-hidden="true" className={styles.visual}>
                  <ProductIllustration index={index} />
                </div>
              </div>
              <div className="relative z-[1] mt-8">
                <h3 className="text-[clamp(24px,2vw,30px)] font-medium leading-[1.15] tracking-[-.06em] max-[1100px]:text-2xl max-[1023px]:text-[30px]">
                  {product.title}
                </h3>
                <p className="mt-3 text-sm leading-[1.7] text-[#a1a1aa] max-[1100px]:text-[13px] max-[1023px]:max-w-[300px] max-[1023px]:text-sm">
                  {product.description}
                </p>
              </div>
            </article>
          ))}
        </div>
        <svg
          aria-hidden="true"
          className={`${styles.topConnections} block h-[88px] w-full stroke-[#67e8f930] [stroke-width:1] max-[1023px]:hidden`}
          viewBox="0 0 1280 88"
          preserveAspectRatio="none"
          fill="none"
        >
          {[160, 480, 800, 1120].map((x) => (
            <path
              key={x}
              d={`M${x} 0 V30 Q${x} 44 ${x + (x < 640 ? 14 : -14)} 44`}
            />
          ))}
          <path d="M80 44H1200" />
          {features.map((_, i) => (
            <path
              key={i}
              d={`M${80 + i * 160 + (i < 4 ? 14 : -14)} 44 Q${80 + i * 160} 44 ${80 + i * 160} 58 V88`}
            />
          ))}
          {features.map((feature, i) => {
            const source = 160 + Math.floor(i / 2) * 320;
            const target = 80 + i * 160;
            const direction = target > source ? 1 : -1;
            return (
              <path
                key={feature}
                className={styles.connectorFlow}
                pathLength={100}
                style={{ animationDelay: `${-i * 0.65}s` }}
                d={`M${source} 0 V30 Q${source} 44 ${source + direction * 14} 44 H${target - direction * 14} Q${target} 44 ${target} 58 V88`}
              />
            );
          })}
        </svg>
        <ul
          className={`${styles.mobileFeatureStem} m-0 grid list-none grid-cols-8 gap-3 p-0 max-[1023px]:relative max-[1023px]:mt-12 max-[1023px]:grid-cols-4 max-[639px]:grid-cols-2 max-[639px]:gap-2`}
        >
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <div className={styles.convergence}>
          <svg
            aria-hidden="true"
            viewBox="0 0 1280 250"
            preserveAspectRatio="none"
            fill="none"
          >
            {features.map((_, i) => (
              <g key={i}>
                <path
                  d={`M${80 + i * 160} 0 C${80 + i * 160} 120 640 100 640 250`}
                />
                <path
                  className={styles.connectorFlow}
                  pathLength={100}
                  style={{ animationDelay: `${-i * 0.65}s` }}
                  d={`M${80 + i * 160} 0 C${80 + i * 160} 120 640 100 640 250`}
                />
              </g>
            ))}
          </svg>
          <div className={styles.logo}>
            <Image src="/logo-icon.png" alt="Velozy" width={64} height={64} />
          </div>
        </div>
        <div className="mx-auto max-w-[1120px] pt-[42px] pb-6 text-center max-[639px]:pt-6 max-[639px]:pb-2">
          <h3 className="whitespace-nowrap text-[clamp(3rem,4.5vw,4.25rem)] font-medium leading-[1.08] tracking-[-.055em] max-[900px]:whitespace-normal max-[900px]:text-[clamp(2.5rem,6vw,3.5rem)] max-[639px]:text-[clamp(2rem,7vw,2.5rem)]">
            Built on One{" "}
            <span className="bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent">
              Connected Platform.
            </span>
          </h3>
          <p className="mx-auto mt-[18px] max-w-[590px] text-[15px] leading-[1.75] text-[#a1a1aa] max-[639px]:text-sm">
            Create, customize, and grow your business in one place.
          </p>
          <div className="mx-auto mt-11 grid max-w-[1000px] grid-cols-3 max-[1023px]:mt-10 max-[639px]:mt-8 max-[639px]:max-w-[420px] max-[639px]:grid-cols-1">
            {platformBenefits.map(({ icon: Icon, title, description }) => (
              <article
                className="min-w-0 px-7 max-[1100px]:px-6 max-[1023px]:px-[18px] max-[639px]:border-t max-[639px]:border-white/[.08] max-[639px]:py-5 max-[639px]:first:border-t-0 max-[639px]:first:py-0"
                key={title}
              >
                <span
                  className="mx-auto grid h-[42px] w-[42px] place-items-center rounded-[13px] border border-cyan-200/[.15] bg-[linear-gradient(145deg,#22d3ee14,#2563eb12)] text-[#8be9f5]"
                  aria-hidden="true"
                >
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <h4 className="mt-[18px] text-lg font-medium tracking-[-.03em] max-[639px]:mt-[14px]">
                  {title}
                </h4>
                <p className="mx-auto mt-[9px] max-w-[280px] text-center text-[13px] leading-[1.7] text-[#a1a1aa]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
