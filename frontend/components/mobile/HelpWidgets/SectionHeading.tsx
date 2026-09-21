import React from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title?: string;
};

export default function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold tracking-[0.2em] text-[#555] uppercase">{eyebrow}</p>
      {title && <h2 className="font-bold text-2xl leading-tight tracking-[-0.6px] text-white mt-3">{title}</h2>}
    </div>
  );
}
