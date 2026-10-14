import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { adminUrl } from "@/lib/admin-url";
import { Pill } from "@/components/magicui/pill";
import { PrimaryLink } from "./primary-link";

const ui = {
  editor: "[container-type:inline-size]",
  browser:
    "overflow-hidden rounded-[9px] bg-[#f6f1e8] shadow-[0_16px_35px_rgb(61_49_29_/_0.16)]",
  browserBar:
    "flex h-[4.5cqw] items-center justify-between rounded-t-[9px] border-x border-t border-cyan-300/20 bg-[#090e16] px-[2cqw] text-slate-400 [&>svg]:h-[1.5cqw] [&>svg]:w-[1.5cqw] [&>svg]:text-cyan-300",
  dots: "flex gap-[0.6cqw] [&>i]:h-[0.7cqw] [&>i]:w-[0.7cqw] [&>i]:rounded-full",
  prompt:
    "ml-auto mt-[4cqw] flex w-fit max-w-[85%] items-center rounded-[14px] rounded-br-[4px] bg-blue-600 px-[2cqw] py-[1cqw] text-[1.5cqw] text-white shadow-[0_8px_24px_rgba(0,0,0,.24)]",
} as const;

const steps = [
  [
    "Start with your idea",
    "Describe your business and the feeling you want your site to give people.",
  ],
  [
    "Shape the first draft",
    "Velozy creates a complete starting point with pages, content, and imagery.",
  ],
  [
    "Make every detail yours",
    "Edit the layout visually, refine the words, and set up the basics for search.",
  ],
  [
    "Publish when it feels right",
    "Put your homepage online free on a Velozy subdomain, then grow from there.",
  ],
] as const;

function EditorMockup() {
  return (
    <figure className="min-w-0">
      <div
        className={ui.editor}
        role="img"
        aria-label="Velozy website editor showing a fashion storefront, with its product image selected for editing."
      >
        <div aria-hidden="true">
          <div className={ui.browser}>
            <div className={ui.browserBar}>
              <span className={ui.dots}>
                <i className="bg-white" />
                <i className="bg-white" />
                <i className="bg-white" />
              </span>
            </div>
            <Image
              src="/mockups/website-editor.png"
              alt=""
              width={1491}
              height={1055}
              sizes="(max-width: 1023px) 100vw, 55vw"
              className="block h-auto w-full"
            />
          </div>
          <div className={ui.prompt}>
            <span>Make it feel more like my brand</span>
          </div>
          <div
            aria-hidden="true"
            className="ml-auto mt-3 flex w-fit items-center gap-1.5"
          >
            {[0, 160, 320].map((delay) => (
              <span
                key={delay}
                style={{ animationDelay: `${delay}ms` }}
                className="h-2.5 w-2.5 origin-center rounded-full bg-blue-500 motion-safe:animate-loading-dot motion-reduce:animate-loading-dot-reduced"
              />
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

export default function HowToCreate() {
  return (
    <section
      id="how-to-create"
      aria-labelledby="how-to-create-heading"
      className="relative isolate flex min-h-[calc(100svh-72px)] items-center py-20 text-white sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -inset-y-32 -z-10 bg-[radial-gradient(ellipse_at_72%_38%,rgba(34,211,238,.12),transparent_40%),radial-gradient(ellipse_at_85%_78%,rgba(37,99,235,.14),transparent_44%)] blur-3xl"
      />
      <div className="mx-auto grid w-full items-center gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-[5vw] lg:px-[4.65vw]">
        <div>
          <Pill className="mb-6">FROM IDEA TO ONLINE</Pill>
          <h2
            id="how-to-create-heading"
            className="max-w-[620px] text-[clamp(2.4rem,3.8vw,4.5rem)] font-medium leading-[1.08] tracking-[-.06em]"
          >
            <span className="block">How to create a website with</span>
            <span className="block">
              <span className="bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
                AI for free.
              </span>
            </span>
          </h2>
          <p className="mt-5 max-w-[460px] text-[15px] leading-7 text-white/60">
            Start with an idea. Shape every detail. Bring your business online
            in four simple steps.
          </p>
          <div className="mt-7">
            <PrimaryLink
              href={adminUrl("/onboard")}
              size="large"
              variant="white"
              className="min-h-12 gap-5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
              icon={<ArrowUpRight aria-hidden="true" size={17} />}
            >
              Create your free site
            </PrimaryLink>
          </div>
          <ol className="mt-10 max-w-[520px] divide-y divide-white/10">
            {steps.map(([title, description], index) => (
              <li
                key={title}
                className="grid grid-cols-[24px_1fr] gap-4 py-4 first:pt-0 sm:gap-5"
              >
                <span className="pt-1 font-mono text-xs tabular-nums text-white/45">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-base font-medium tracking-[-.025em]">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-[1.75] text-white/60">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <EditorMockup />
      </div>
    </section>
  );
}
