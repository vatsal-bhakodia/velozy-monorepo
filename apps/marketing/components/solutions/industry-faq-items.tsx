"use client";

import { useId, useState } from "react";

type FaqItem = { question: string; answer: string };

export function IndustryFaqItems({ items }: { items: FaqItem[] }) {
  const id = useId();
  const [openItem, setOpenItem] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenItem((current) => (current === index ? null : index));
  }

  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {items.map((item, index) => {
        const open = openItem === index;
        const answerId = `${id}-answer-${index}`;
        return (
          <div key={item.question} className="py-5">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={answerId}
              onClick={() => toggle(index)}
              className="flex min-h-11 w-full items-center justify-between gap-5 text-left text-base font-medium leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--industry-pale)] sm:text-lg"
            >
              {item.question}
              <span
                aria-hidden="true"
                className={`shrink-0 text-xl font-light text-[var(--industry-pale)] transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-45" : "rotate-0"}`}
              >
                +
              </span>
            </button>
            <div
              id={answerId}
              aria-hidden={!open}
              inert={!open}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="max-w-3xl pr-8 pt-3 text-sm leading-7 text-white/60 sm:text-[15px]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
