import React from "react";
import { LucideIcon } from "lucide-react";

type ControlCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function ControlCard({ icon: Icon, title, description }: ControlCardProps) {
  return (
    <div className="bg-[#0d0d0d] p-6 border border-[#1a1a1a]">
      <div className="w-11 h-11 border border-[#2a2a2a] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
      </div>
      <h3 className="font-bold text-base text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-[#777] text-sm leading-relaxed">{description}</p>
    </div>
  );
}
