"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Map,
  FileSpreadsheet,
  Search,
  BarChart3,
  Download,
  PlayCircle,
  Settings,
  Layers,
  MousePointerClick,
  ArrowRight,
} from "lucide-react";
import FeatureCard from "@/components/help/FeatureCard";
import FAQSection from "@/components/help/FAQSection";
import Image from "next/image";

/* ─── scroll reveal hook ─── */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`relative transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {children}
    </div>
  );
}

export default function HelpPage() {
  const router = useRouter();

  const features = [
    {
      icon: FileSpreadsheet,
      title: "Data Upload",
      description:
        "Drag and drop your Excel dataset onto the sidebar to automatically parse and load employee and vehicle data onto the map.",
    },
    {
      icon: MousePointerClick,
      title: "Interactive Map",
      description:
        "Click any marker to view detailed info. Vehicles show capacity and speed; employees show priority and ride-sharing preferences.",
    },
    {
      icon: Search,
      title: "Quick Search",
      description:
        "Use the Search menu to instantly locate specific employees or vehicles and smoothly pan to their exact location.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "View granular statistics post-optimization: total distance, time, active stops, and estimated fuel costs.",
    },
    {
      icon: PlayCircle,
      title: "Route Simulation",
      description:
        "Visualize the optimized path with a moving taxi overlay and dynamic taximeter showing time and distance covered.",
    },
    {
      icon: Download,
      title: "Export Results",
      description:
        "Download customized route sequences and vehicle summaries back into an Excel format with one click.",
    },
  ];

  const mapControls = [
    {
      icon: Layers,
      title: "Bottom Control Bar",
      desc: "Toggle visibility of Employee Markers, Vehicle Markers, Office Drop-offs, and Route Paths directly from the bottom bar.",
    },
    {
      icon: Settings,
      title: "Theme Settings",
      desc: "Switch between Light Mode and Dark Mode via the Settings menu in the sidebar to match your viewing preference.",
    },
  ];

  return (
    <div className="font-sans w-full min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      {/* ── Header ── matches homepage header style exactly */}
      <header className="bg-[#e8e8e8] px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-5 md:py-6 flex items-center justify-between">
        <div className="font-bold text-xl sm:text-2xl tracking-[-0.6px] text-[#0a0a0a]">
          ROUTEOPTI
        </div>
        <nav className="hidden md:flex gap-8 lg:gap-12 items-center">
          <button
            onClick={() => router.push("/visualiser")}
            className="flex items-center gap-2 font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Map
          </button>
          <a
            href="#features"
            className="font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
          >
            Features
          </a>
          <a
            href="#controls"
            className="font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
          >
            Controls
          </a>
          <a
            href="#faq"
            className="font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
          >
            FAQ
          </a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative bg-[#0a0a0a] px-4 sm:px-8 md:px-12 lg:px-16 pt-16 pb-20 md:pt-20 md:pb-24 border-b border-[#1a1a1a]">
        <div className="max-w-7xl w-full">
          <Reveal>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#555] uppercase mb-6">
              Help Center
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-bold text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-[65px] leading-tight tracking-[-0.6px] text-white mb-6 max-w-3xl">
              Master the
              <br />
              Map Interface.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl leading-6 md:leading-7 text-[#666] max-w-xl mb-10">
              Everything you need to process, analyze, and visualize your fleet.
              <br />
              From first upload to final export.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/visualiser")}
                className="inline-flex items-center gap-2 bg-white text-[#0a0a0a] font-bold text-sm px-6 py-3.5 hover:bg-[#e8e8e8] transition-colors duration-200"
              >
                Go to Map
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 border border-[#2a2a2a] text-[#999] font-bold text-sm px-6 py-3.5 hover:border-white hover:text-white transition-colors duration-200"
              >
                Explore Features
              </a>
            </div>
          </Reveal>
          <div className="absolute top-1/2 -translate-y-1/2 right-25">
            <Reveal delay={240}>
              <div className="flex justify-end">
                <Image
                  src="/map.jpg"
                  alt="Map Image"
                  width={1920}
                  height={1080}
                  className="w-3/5 h-auto rounded-4xl"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── mirrors StatsSection exactly */}
      <section className="w-full bg-black py-10 md:py-12 border-b border-[#1a1a1a]">
        <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col md:flex-row items-stretch md:items-center justify-center gap-8 md:gap-4">
          {[
            { value: "6", label: "Core platform features" },
            { value: "1-Click", label: "Route optimization" },
            { value: "Excel", label: "Import & export ready" },
          ].map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center flex-1 min-w-0"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-white">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm md:text-base leading-relaxed text-[#99a1af] text-center mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section
        id="features"
        className="px-4 sm:px-8 md:px-12 lg:px-16 py-20 md:py-24 bg-[#0a0a0a] border-b border-[#1a1a1a]"
      >
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#555] uppercase mb-4">
                  Core Features
                </p>
                <h2 className="font-bold text-3xl md:text-4xl lg:text-5xl tracking-[-0.6px] text-white leading-tight">
                  Everything you
                  <br />
                  need to succeed.
                </h2>
              </div>
              <p className="text-[#555] text-sm max-w-xs leading-relaxed md:text-right md:pb-1">
                Six built-in tools — no plugins, no extras needed.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <FeatureCard {...f} index={i} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Map Controls ── */}
      <section
        id="controls"
        className="px-4 sm:px-8 md:px-12 lg:px-16 py-20 md:py-24 bg-[#0d0d0d] border-b border-[#1a1a1a]"
      >
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#555] uppercase mb-4">
              Interface Guide
            </p>
            <h2 className="font-bold text-3xl md:text-4xl lg:text-5xl tracking-[-0.6px] text-white leading-tight mb-14">
              Understanding
              <br />
              Map Controls.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1a1a1a]">
            {mapControls.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 100}>
                <div className="group bg-[#0d0d0d] p-10 hover:bg-[#111] transition-colors duration-300 h-full">
                  <div className="w-11 h-11 border border-[#2a2a2a] flex items-center justify-center mb-6 group-hover:border-white transition-colors duration-300">
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-3 tracking-tight">
                    {title}
                  </h3>
                  <p className="text-[#666] text-sm leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="px-4 sm:px-8 md:px-12 lg:px-16 py-20 md:py-24 bg-[#0a0a0a] border-b border-[#1a1a1a]"
      >
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#555] uppercase mb-4">
                  FAQ
                </p>
                <h2 className="font-bold text-3xl md:text-4xl lg:text-5xl tracking-[-0.6px] text-white leading-tight">
                  Quick
                  <br />
                  Answers.
                </h2>
              </div>
              <p className="text-[#555] text-sm max-w-xs leading-relaxed md:text-right md:pb-1">
                The most common questions, answered clearly.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <FAQSection />
          </Reveal>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="w-full bg-[#e8e8e8] px-4 sm:px-8 md:px-12 lg:px-16 py-16 md:py-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h2 className="font-bold text-3xl md:text-4xl lg:text-5xl tracking-[-0.6px] text-[#0a0a0a] leading-tight mb-3">
              Ready to optimize?
            </h2>
            <p className="text-[#666] text-base leading-relaxed max-w-md">
              Upload your dataset and start computing the most efficient routes
              for your fleet.
            </p>
          </div>
          <button
            onClick={() => router.push("/visualiser")}
            className="shrink-0 inline-flex items-center gap-2 bg-[#0a0a0a] text-white font-bold text-sm px-8 py-4 hover:bg-black transition-colors duration-200"
          >
            Start Optimizing
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#e8e8e8] px-4 sm:px-8 md:px-12 lg:px-16 py-5 flex items-center justify-between border-t border-[#d0d0d0]">
        <div className="font-bold text-xl tracking-[-0.6px] text-[#0a0a0a]">
          ROUTEOPTI
        </div>
        <p className="text-[#888] text-xs">
          © {new Date().getFullYear()} Route Optimization Platform. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
