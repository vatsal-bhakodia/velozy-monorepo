"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { useState } from "react";

const faqs = [
  [
    "How does the Velozy work?",
    "An Velozy uses artificial intelligence to automatically generate a website based on your inputs. Instead of designing pages manually, you simply describe your business, goals or the type of site you want to create. The AI analyzes your request and instantly generates layouts, copy, images and structure tailored to your needs.\n\nWith Velozy, you can go from idea to live site in minutes. The system handles design, content generation and optimization, while still allowing you to customize colors, branding, and layout afterward.",
  ],
  [
    "How much does an AI generated website cost?",
    "The cost depends on the tools, level of customization, and hosting plan you choose. Velozy helps you create a strong first version quickly, so you can spend less time and budget on the initial build.",
  ],
  [
    "What are the benefits of using an AI website maker?",
    "AI website makers help you move from an idea to a polished starting point faster. They can assist with structure, copy, visual direction, responsive layouts, and iterative edits while keeping the final result customizable.",
  ],
  [
    "Is the Velozy free to use?",
    "You can explore the builder and generate a website before deciding how you want to publish it. Available features and publishing options depend on your selected plan.",
  ],
  [
    "How can I vibe code a website?",
    "Describe the experience you want in plain language, then use AI to generate and refine the site. You can keep iterating on sections, styles, and content until the result feels right.",
  ],
  [
    "How to choose the best Velozy?",
    "Look for a builder that gives you a useful first draft, genuine control over the output, responsive results, clear publishing options, and an editing workflow that fits the way you like to work.",
  ],
  [
    "Will my AI website be mobile-friendly?",
    "Yes. Velozy generates responsive layouts for desktop, tablet, and mobile screens. You can preview and adjust the responsive experience before publishing.",
  ],
] as const;

export default function FAQ() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="faq"
      className="relative isolate overflow-hidden bg-black px-4 py-24 text-white sm:px-8 sm:py-28 lg:px-12 lg:py-36"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[42rem] bg-[radial-gradient(ellipse_at_52%_38%,rgba(34,211,238,0.14),transparent_38%),radial-gradient(ellipse_at_12%_65%,rgba(37,99,235,0.22),transparent_34%),radial-gradient(ellipse_at_88%_70%,rgba(99,102,241,0.18),transparent_34%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(100,180,220,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(100,180,220,0.06)_1px,transparent_1px)] bg-[size:54px_54px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        <div className="grid items-end gap-8 md:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)] md:gap-16">
          <h2 className="text-[3rem] font-medium leading-[.92] tracking-[-.07em] text-white sm:text-6xl lg:text-[5.25rem]">
            Questions,
            <span className="block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pb-2 text-transparent">
              clearly answered.
            </span>
          </h2>

          <div className="pb-1 md:text-right">
            <p className="ml-auto max-w-[440px] text-[15px] leading-7 text-white/50 sm:text-base">
              Everything worth knowing before you turn your idea into a live
              website.
            </p>
            <a
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
              href="mailto:hello@example.com"
            >
              Still curious? Talk to us
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-[28px] border border-white/10 bg-[#050505] px-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:px-9 lg:px-12">
          {faqs.map(([question, answer], index) => {
            const isOpen = index === active;
            const answerId = `faq-answer-${index}`;

            return (
              <div
                key={question}
                className="border-b border-white/10 last:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setActive(isOpen ? -1 : index)}
                  className="group flex min-h-[104px] w-full items-center justify-between gap-5 py-7 text-left text-[1.08rem] font-normal leading-tight tracking-[-0.025em] text-white transition-colors hover:text-cyan-200 sm:min-h-[118px] sm:gap-8 sm:text-[1.3rem]"
                >
                  <span className="flex items-center gap-5 sm:gap-7">
                    <span className="hidden font-mono text-[10px] tracking-[0.16em] text-slate-600 sm:block">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {question}
                  </span>
                  <span
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${isOpen ? "rotate-0 border-cyan-300/50 bg-cyan-300 text-slate-950" : "border-white/15 bg-white/[0.04] text-cyan-300 group-hover:border-cyan-300/50 group-hover:bg-cyan-300/10"}`}
                  >
                    {isOpen ? (
                      <X className="h-4 w-4 stroke-[1.75]" />
                    ) : (
                      <Plus className="h-4 w-4 stroke-[1.75]" />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={answerId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="max-w-[760px] pb-9 pr-8 text-[0.94rem] leading-7 tracking-[-0.01em] text-slate-400 sm:ml-[3.15rem] sm:text-base">
                        {answer.split("\n\n").map((paragraph) => (
                          <p key={paragraph} className="mb-5 last:mb-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
