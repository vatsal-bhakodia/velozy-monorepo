import { ArrowUpRight } from "lucide-react";
import { adminUrl } from "@/lib/admin-url";
import { PrimaryLink } from "./primary-link";
import { Pill } from "@/components/magicui/pill";

export default function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative isolate overflow-hidden border-t border-white/10 px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-[4.65vw]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{
          background:
            "radial-gradient(ellipse at 50% 140%, rgba(34, 211, 238, 0.10), transparent 60%), radial-gradient(ellipse at 50% 140%, rgba(59, 130, 246, 0.16), transparent 70%)",
        }}
      />

      <div className="relative grid items-end gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Pill className="mb-6">Built around your next idea</Pill>
          <h2
            id="final-cta-heading"
            className="text-[clamp(3rem,6.5vw,6rem)] font-medium leading-[.98] tracking-[-.06em]"
          >
            Your idea.
            <span className="block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pr-[.08em] text-transparent">
              Starts here.
            </span>
          </h2>
        </div>

        <div className="max-w-sm lg:justify-self-end lg:pb-2">
          <p className="text-lg leading-8 tracking-[-0.02em] text-gray-400 sm:text-xl">
            Tell us what you have in mind.
            <span className="text-white"> Let’s turn it into a website.</span>
          </p>
          <PrimaryLink
            href={adminUrl("/onboard")}
            size="large"
            variant="white"
            className="mt-8 min-h-14 w-full justify-between gap-10 px-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 sm:w-auto"
            icon={
              <ArrowUpRight
                aria-hidden="true"
                className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              />
            }
          >
            Start building
          </PrimaryLink>
          <p className="mt-4 text-sm text-gray-400">No code. Start free.</p>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent sm:inset-x-8 lg:inset-x-[4.65vw]"
      />
    </section>
  );
}
