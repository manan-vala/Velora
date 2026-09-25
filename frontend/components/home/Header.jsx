import React from "react";

import AuthNavLink from "./AuthNavLink";

const NAV_LINK = "text-sm text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70";

/**
 * Header Component
 * Contains the ROUTEOPTI logo and navigation links
 * Sticky positioning with light gray background
 */
export default function Header() {
  return (
    <header className="bg-[#e8e8e8] px-6 md:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto h-14 md:h-16 flex items-center justify-between">
        <div className="font-bold text-lg sm:text-xl tracking-tight text-[#0a0a0a]">
          ROUTEOPTI
        </div>
        <nav className="hidden md:flex gap-6 lg:gap-8 items-center">
          <a href="#solution" className={NAV_LINK}>
            Solution
          </a>
          <a href="#pricing" className={NAV_LINK}>
            Pricing
          </a>
          <a href="#contact" className={NAV_LINK}>
            Contact
          </a>
          <AuthNavLink />
        </nav>
      </div>
    </header>
  );
}
