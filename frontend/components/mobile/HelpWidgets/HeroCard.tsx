import React from "react";

export default function HeroCard() {
  return (
    <section className="px-4 pt-4 pb-8 border-b border-[#1a1a1a]">
      <p className="text-[11px] font-bold tracking-[0.2em] text-[#555] uppercase mb-4">Help Center</p>
      <h1 className="font-bold text-3xl leading-tight tracking-[-0.6px] text-white mb-4">Master the Map Interface.</h1>
      <p className="text-sm text-[#888] leading-relaxed">
        Everything you need to process, analyze, and visualize your fleet from upload to export.
      </p>
    </section>
  );
}
