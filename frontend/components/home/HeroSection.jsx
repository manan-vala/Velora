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
    <section className="bg-[#e8e8e8] px-6 md:px-10 lg:px-16 py-10 md:py-12 flex flex-1 relative overflow-hidden">
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Content - Text and CTAs */}
        <div className="flex flex-col gap-5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-[#0a0a0a] m-0">
            Optimize
            <br />
            Employee
            <br />
            Commutes.
          </h1>

          <p className="text-base md:text-lg leading-relaxed text-[#4a5565] m-0 max-w-lg">
            Intelligent taxi route optimization for enterprises.
            <br />
            Reduce travel time. Cut operational costs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
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
