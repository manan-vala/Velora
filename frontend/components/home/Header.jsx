import React from "react";

/**
 * Header Component
 * Contains the ROUTEOPTI logo and navigation links
 * Sticky positioning with light gray background
 */
export default function Header() {
  return (
    <header className="bg-[#e8e8e8] px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-5 md:py-6 flex items-center justify-between static">
      <div className="font-sans font-bold text-xl sm:text-2xl tracking-[-0.6px] text-[#0a0a0a]">
        ROUTEOPTI
      </div>
      <nav className="hidden md:flex gap-8 lg:gap-12 items-center">
        <a
          href="#solution"
          className="font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
        >
          Solution
        </a>
        <a
          href="#pricing"
          className="font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
        >
          Pricing
        </a>
        <a
          href="#contact"
          className="font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
        >
          Contact
        </a>
      </nav>
    </header>
  );
}
