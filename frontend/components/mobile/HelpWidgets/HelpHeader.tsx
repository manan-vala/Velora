import React from "react";

type HelpHeaderProps = {
  onClose: () => void;
};

export default function HelpHeader({ onClose }: HelpHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-20 h-22.5 sm:h-24.5 bg-white px-4 pb-3 border-b border-[#d0d0d0] flex items-end">
        <div className="font-bold text-xl tracking-[-0.6px] text-[#0a0a0a]">VELORA</div>
      </header>

      <button
        onClick={onClose}
        aria-label="Close help and feedback"
        className="fixed top-24 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#2a2a2a] bg-white text-[#0a0a0a] text-xl font-bold z-30"
        type="button"
      >
        ×
      </button>
    </>
  );
}
