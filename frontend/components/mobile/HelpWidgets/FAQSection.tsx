"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { useMobileStore } from "@/store/useMobileStore";

type FAQItemData = {
  question: string;
  answer: string;
};

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const openIndex = useMobileStore((state) => state.helpFaqOpenIndex);
  const setOpenIndex = useMobileStore((state) => state.setHelpFaqOpenIndex);
  const isOpen = openIndex === index;

  return (
    <div className="border-b border-[#1e1e1e] last:border-0">
      <button
        onClick={() => setOpenIndex(isOpen ? null : index)}
        className="w-full flex items-start justify-between gap-4 py-6 text-left"
        type="button"
      >
        <div className="flex items-start gap-4">
          <span className="text-[11px] font-bold text-[#3a3a3a] tabular-nums shrink-0 pt-0.5 tracking-widest">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={`font-bold text-[15px] leading-snug tracking-tight ${isOpen ? "text-white" : "text-[#999]"}`}>
            {question}
          </span>
        </div>

        <div
          className={`w-7 h-7 border flex items-center justify-center shrink-0 mt-0.5 ${
            isOpen ? "border-white bg-white text-black" : "border-[#2a2a2a] text-[#666]"
          }`}
        >
          {isOpen ? (
            <Minus className="w-3 h-3" strokeWidth={2.5} />
          ) : (
            <Plus className="w-3 h-3" strokeWidth={2.5} />
          )}
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="pl-8 pr-2 pb-6 text-sm text-[#666] leading-relaxed">{answer}</div>
      </div>
    </div>
  );
}

export default function MobileFAQSection({ faqs }: { faqs: FAQItemData[] }) {
  return (
    <div className="w-full border border-[#1e1e1e] bg-[#0d0d0d] px-4 py-1">
      {faqs.map((faq, idx) => (
        <FAQItem key={faq.question} index={idx} question={faq.question} answer={faq.answer} />
      ))}
    </div>
  );
}
