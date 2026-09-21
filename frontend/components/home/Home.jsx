import React from "react";
import Header from "./Header";
import HeroSection from "./HeroSection";
import StatsSection from "./StatsSection";

/**
 * Home Component
 * Main page container for the homepage
 * Assembles Header, HeroSection, and StatsSection components
 * No internal styling - all styling delegated to child components
 */
export default function Home() {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col">
        <HeroSection />
        <StatsSection />
      </div>
    </div>
  );
}
