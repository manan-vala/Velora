"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer select-none"
    >
      {label && (
        <span className="text-sm font-bold text-slate-700">{label}</span>
      )}
      <div
        className={`flex w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? "bg-black" : "bg-gray-600"
        }`}
        aria-hidden
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
          aria-checked={checked}
        />
        <span
          className={`my-auto w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${
            !checked ? "translate-x-1" : "translate-x-6"
          }`}
        />
      </div>
    </label>
  );
}

export default function BottomControlBar() {
  // const { isSimulating, onStopSim } = props;
  const [expanded, setExpanded] = useState(false);
  const layers = useAppStore((state) => state.layers);
  const setLayer = useAppStore((state) => state.setLayer);

  // Small pill used when collapsed
  const CollapsedPill = (
    <div
      className="absolute bottom-6 right-24 z-30 bg-white rounded-2xl shadow-xl p-3 border border-slate-100 flex items-center gap-4 pr-5"
      role="region"
      aria-label="Legends collapsed"
    >
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm" />
        <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm -ml-1" />
        <div className="w-3 h-3 rounded-full bg-purple-400 shadow-sm -ml-1" />
      </div>

      <span className="text-sm font-bold text-slate-700 pl-2">Legends</span>

      <button
        aria-expanded={expanded}
        aria-label="Expand legends"
        onClick={() => setExpanded(true)}
        className="ml-4 p-2 rounded-full hover:bg-slate-100 transition"
      >
        {/* Left double chevrons (to mimic <<) */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 6 L9 12 L15 18"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 6 L14 12 L20 18"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );

  return (
    <>
      {!expanded && CollapsedPill}

      <div
        className={`absolute bottom-6 left-28 right-24 z-20 transition-all duration-300 ${
          expanded
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!expanded}
      >
        <div className="bg-white rounded-2xl shadow-xl p-2 border border-slate-100 flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
            {/* Legend Item: Office */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
              <ToggleSwitch
                id="legend-office"
                label="Office"
                checked={layers.office}
                onChange={(v) => setLayer("office", v)}
              />
            </div>

            <div className="h-6 border-l-2 border-slate-100" />

            {/* Legend Item: Employees */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
              <ToggleSwitch
                id="legend-employees"
                label="Employees"
                checked={layers.employees}
                onChange={(v) => setLayer("employees", v)}
              />
            </div>

            <div className="h-6 border-l-2 border-slate-100" />

            {/* Legend Item: Vehicles */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
              <ToggleSwitch
                id="legend-vehicles"
                label="Vehicles"
                checked={layers.vehicles}
                onChange={(v) => setLayer("vehicles", v)}
              />
            </div>

            <div className="h-6 border-l-2 border-slate-100" />

            {/* Legend Item: Route Paths */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" />
              <ToggleSwitch
                id="legend-routes"
                label="Route Paths"
                checked={layers.routes}
                onChange={(v) => {
                  setLayer("routes", v);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* If simulating, show your stop-sim button (keeps original behavior) */}
            {/* {isSimulating && (
              <button
                onClick={onStopSim}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors"
                aria-label="Stop simulation"
              >
                Stop
              </button>
            )} */}

            {/* Collapse button */}
            <button
              aria-label="Collapse legends"
              aria-expanded={expanded}
              onClick={() => setExpanded(false)}
              className="p-3 rounded-full hover:bg-slate-100 transition"
            >
              {/* Right single chevron */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 6 L14 12 L8 18"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
