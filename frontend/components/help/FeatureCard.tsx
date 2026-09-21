"use client";
import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  index = 0,
}: FeatureCardProps) {
  return (
    <div className="group flex flex-col h-full gap-5 p-7 border border-[#2a2a2a] bg-[#111111] hover:bg-[#1a1a1a] transition-colors duration-300 cursor-default">
      {/* Top row: index + icon */}
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 border border-[#2a2a2a] flex items-center justify-center group-hover:border-white transition-colors duration-300">
          <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
        </div>
        <span className="text-[11px] font-bold text-[#3a3a3a] tabular-nums tracking-widest">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Text */}
      <div>
        <h3 className="text-[15px] font-bold text-white mb-2.5 tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-[#666] text-sm leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {/* Bottom accent line */}
      <div className="mt-auto pt-4 border-t border-[#1e1e1e] group-hover:border-[#333] transition-colors duration-300">
        <div className="w-0 group-hover:w-8 h-[2px] bg-white transition-all duration-500 ease-out" />
      </div>
    </div>
  );
}
