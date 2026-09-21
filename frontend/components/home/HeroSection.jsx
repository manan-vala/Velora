import React from "react";
import Button from "./Button";
import MapVisual from "./MapVisual";
import Link from "next/link";

/**
 * HeroSection Component
 * Main hero section with heading, description, and CTA buttons
 * Displays left-aligned text with right-aligned route map visualization
 */
export default function HeroSection() {
  return (
    <section className="bg-[#e8e8e8] pt-4 md:pt-2 pl-8 md:pl-12 lg:pl-16 pr-8 md:pr-12 lg:pr-16 pb-4 md:pb-6 flex flex-1 relative">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pr-0">
        {/* Left Content - Text and CTAs */}
        <div className="flex flex-col gap-6 pt-6">
          <h1 className="font-sans text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-[65px] font-bold leading-tight md:leading-12.5 lg:leading-17.5 text-[#0a0a0a] m-0">
            Optimize
            <br />
            Employee
            <br />
            Commutes.
          </h1>

          <p className="font-sans text-sm sm:text-base md:text-lg lg:text-xl leading-6 md:leading-7 text-[#4a5565] m-0 max-w-lg">
            Intelligent taxi route optimization for enterprises.
            <br />
            Reduce travel time. Cut operational costs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Link href="/visualiser">
              <Button variant="primary">Start Optimizing</Button>
            </Link>
            <Button variant="secondary">See How It Works</Button>
          </div>
        </div>

        {/* Right Content - Map Visualization */}
        <div className="hidden lg:block">
          <MapVisual />
        </div>
      </div>
    </section>
  );
}
