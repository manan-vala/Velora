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
    <section className="w-full bg-black px-6 md:px-10 lg:px-16 py-6 md:py-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center min-w-0"
          >
            <div className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white">
              {stat.value}
            </div>
            <div className="text-xs md:text-sm text-[#99a1af] text-center mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
