import React from "react";

/**
 * StatsSection Component
 * Displays key statistics and metrics in a black section
 * Three main stats: reduced commute time, operational savings, and daily users
 */
export default function StatsSection() {
  const stats = [
    {
      value: "30%",
      label: "Reduced commute time",
    },
    {
      value: "18%",
      label: "Operational cost savings",
    },
    {
      value: "1000+",
      label: "Employees optimized daily",
    },
  ];

  return (
    <section className="w-full bg-black py-2 sm:py-2 md:py-12 lg:py-4 flex justify-center">
      <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-6 md:px-8 flex flex-col md:flex-row items-stretch md:items-center justify-center gap-2 md:gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center flex-1 min-w-0"
          >
            <div className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-white">
              {stat.value}
            </div>
            <div className="font-sans text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed text-[#99a1af] text-center mt-2">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
