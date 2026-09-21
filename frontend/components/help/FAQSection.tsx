"use client";
import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string | React.ReactNode;
  index: number;
}

function FAQItem({ question, answer, index }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`border-b border-[#1e1e1e] last:border-0`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-6 py-7 text-left group"
      >
        <div className="flex items-start gap-5">
          <span className="text-[11px] font-bold text-[#3a3a3a] tabular-nums shrink-0 pt-0.5 tracking-widest">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={`font-bold text-[15px] leading-snug tracking-tight transition-colors duration-200 ${
              isOpen ? "text-white" : "text-[#999] group-hover:text-white"
            }`}
          >
            {question}
          </span>
        </div>

        <div
          className={`w-7 h-7 border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
            isOpen
              ? "border-white bg-white text-black"
              : "border-[#2a2a2a] text-[#666] group-hover:border-[#555]"
          }`}
        >
          {isOpen ? (
            <Minus className="w-3 h-3" strokeWidth={2.5} />
          ) : (
            <Plus className="w-3 h-3" strokeWidth={2.5} />
          )}
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-400 ease-in-out ${
          isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pl-10 pr-10 pb-7 text-sm text-[#666] leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const faqs: Omit<FAQItemProps, "index">[] = [
    {
      question: "How do I upload employee and vehicle data?",
      answer:
        "Use the drag-and-drop area at the bottom of the left sidebar. You can also click 'Select a file' to browse your system for an Excel (.xlsx or .xls) file containing all your fleet data.",
    },
    {
      question: "How does the route optimization work?",
      answer:
        "After uploading your dataset, a 'Optimize Routes' button becomes available. Clicking it triggers our backend algorithm to compute the most efficient routes considering vehicle capacities, employee preferences, and priorities.",
    },
    {
      question: "What do the different colored markers mean?",
      answer: (
        <div className="space-y-3">
          {[
            {
              dot: "bg-white",
              label: "Blue",
              desc: "Employee pickup locations",
            },
            {
              dot: "bg-[#aaa]",
              label: "Green",
              desc: "Vehicle starting points",
            },
            {
              dot: "bg-[#555]",
              label: "Red",
              desc: "Office / Drop-off locations",
            },
            {
              dot: "bg-[#777]",
              label: "Orange",
              desc: "Moving taxi during route simulation",
            },
          ].map(({ dot, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
              <span className="text-[#888]">
                <span className="text-white font-semibold">{label}:</span>{" "}
                {desc}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      question: "Can I simulate a vehicle's route?",
      answer:
        "Yes. Once optimization is completed, click 'View' on a specific vehicle in the Search or Stats menu to jump to it on the map. Route simulation is accessible via the Map control settings.",
    },
    {
      question: "How do I download the final optimization results?",
      answer:
        "Open the Left Sidebar, hover over the middle icons, and click the 'Download' icon. From that menu, click 'Download Excel' to get your detailed Vehicle Summary and Route Sequences.",
    },
  ];

  return (
    <div className="w-full border border-[#1e1e1e] bg-[#0d0d0d]">
      <div className="px-8 py-2">
        {faqs.map((faq, idx) => (
          <FAQItem
            key={idx}
            index={idx}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </div>
    </div>
  );
}
