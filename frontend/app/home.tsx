'use client';

import React from 'react';
import Header from '@/components/home/Header';
import HeroSection from '@/components/home/HeroSection';
import StatsSection from '@/components/home/StatsSection';

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
