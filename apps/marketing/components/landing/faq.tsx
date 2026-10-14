"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
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
      className="relative isolate overflow-x-clip px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-[4.65vw]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[42rem] bg-[radial-gradient(ellipse_at_50%_28%,rgba(34,211,238,.12),transparent_42%),radial-gradient(ellipse_at_12%_72%,rgba(37,99,235,.18),transparent_36%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_10%,rgba(34,211,238,.035),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 grid w-full gap-12 lg:grid-cols-[minmax(19rem,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <h2 className="overflow-visible text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[1.08] tracking-[-.07em] text-white lg:sticky lg:top-24 lg:self-start">
          <span className="block">Website</span>
          <span className="block whitespace-nowrap">
            Builder{" "}
            <span className="inline-block bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pb-4 text-transparent">
              FAQ
            </span>
          </span>
        </h2>

        <div className="relative overflow-hidden rounded-[24px] border border-white/[.12] bg-[#050505]/95 px-6 shadow-[0_24px_80px_rgba(0,0,0,.35)] sm:px-9">
          {faqs.map(([question, answer], index) => {
            const isOpen = index === active;
            const answerId = `faq-answer-${index}`;

            return (
              <div
                key={question}
                className="border-b border-white/[.10] last:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setActive(isOpen ? -1 : index)}
                  className="group flex min-h-[88px] w-full items-center justify-between gap-5 py-6 text-left text-[1.08rem] font-medium leading-tight tracking-[-0.035em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:min-h-[96px] sm:gap-8 sm:text-xl"
                >
                  <span className="flex items-center gap-5 sm:gap-7">
                    <span className="hidden font-mono text-[10px] tracking-[0.16em] text-slate-600 sm:block">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {question}
                  </span>
                  <span className="shrink-0 text-white">
                    {isOpen ? (
                      <X className="h-6 w-6 stroke-[1.5]" />
                    ) : (
                      <Plus className="h-6 w-6 stroke-[1.5]" />
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
