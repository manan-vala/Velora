import React from "react";
import { LucideIcon } from "lucide-react";

type MobileFeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
};

export default function MobileFeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: MobileFeatureCardProps) {
  return (
    <div className="group flex flex-col h-full gap-4 p-6 border border-[#2a2a2a] bg-[#111111] hover:bg-[#1a1a1a] transition-colors duration-300">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 border border-[#2a2a2a] flex items-center justify-center group-hover:border-white transition-colors duration-300">
          <Icon className="w-4 h-4 text-white" strokeWidth={1.5} />
        </div>
        <span className="text-[11px] font-bold text-[#3a3a3a] tabular-nums tracking-widest">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div>
        <h3 className="text-[15px] font-bold text-white mb-2.5 tracking-tight leading-snug">{title}</h3>
        <p className="text-[#666] text-sm leading-relaxed">{description}</p>
      </div>

      <div className="mt-auto pt-3 border-t border-[#1e1e1e]">
        <div className="w-8 h-0.5 bg-white/40" />
      </div>
    </div>
  );
}
