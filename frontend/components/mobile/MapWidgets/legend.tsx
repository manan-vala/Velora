import React from "react";

import { useMobileStore } from "@/store/useMobileStore";

function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-1 sm:gap-2 md:gap-2.5 select-none ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      {label && (
        <span className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">{label}</span>
      )}
      <div
        className={`flex w-7 sm:w-8 md:w-9 h-3.5 sm:h-4 md:h-4.5 rounded-full transition-colors duration-200 ${checked ? "bg-black" : "bg-gray-400"}`}
        aria-hidden
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          className="sr-only"
          aria-checked={checked}
          disabled={disabled}
        />
        <span
          className={`my-auto w-2 sm:w-2.5 md:w-3 h-2 sm:h-2.5 md:h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${!checked ? "translate-x-0.5 sm:translate-x-1 md:translate-x-1" : "translate-x-3.5 sm:translate-x-4 md:translate-x-5"}`}
        />
      </div>
    </label>
  );
}

export default function MobileLegend() {
  const layers = useMobileStore((state) => state.layers);
  const toggleLayer = useMobileStore((state) => state.toggleLayer);
  const optimizationResult = useMobileStore((state) => state.optimizationResult);
  
  const hasOptimizationData = !!optimizationResult;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-28 md:bottom-32 md:landscape:bottom-24 z-20 w-full max-w-107.5 md:max-w-none px-2 sm:px-4 md:px-6 md:landscape:px-8">
      <div className="bg-white rounded-xl shadow-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 border border-slate-100 grid grid-cols-3 items-center">
        {/* Employees */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 min-w-0">
          <div className="w-1.5 sm:w-2 md:w-2.5 h-1.5 sm:h-2 md:h-2.5 rounded-full bg-blue-500 shadow-sm" />
          <ToggleSwitch
            id="legend-employees"
            label="Employees"
            checked={layers.employees}
            onChange={() => toggleLayer("employees")}
          />
        </div>
        {/* Vehicles */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 min-w-0 border-x border-slate-200 px-1 sm:px-1.5 md:px-2">
          <div className="w-1.5 sm:w-2 md:w-2.5 h-1.5 sm:h-2 md:h-2.5 rounded-full bg-green-500 shadow-sm" />
          <ToggleSwitch
            id="legend-vehicles"
            label="Vehicles"
            checked={layers.vehicles}
            onChange={() => toggleLayer("vehicles")}
          />
        </div>
        {/* Route Paths */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 min-w-0">
          <div className={`w-1.5 sm:w-2 md:w-2.5 h-1.5 sm:h-2 md:h-2.5 rounded-full bg-purple-500 shadow-sm ${!hasOptimizationData ? "opacity-50" : ""}`} />
          <ToggleSwitch
            id="legend-routes"
            label="Route Paths"
            checked={layers.routes}
            onChange={() => toggleLayer("routes")}
            disabled={!hasOptimizationData}
          />
        </div>
      </div>
    </div>
  );
}
