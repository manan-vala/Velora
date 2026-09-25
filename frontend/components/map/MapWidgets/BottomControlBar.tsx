"use client";

import { ChevronRight, ChevronsLeft } from "lucide-react";
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
        <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{label}</span>
      )}
      <div
        className={`flex w-7 h-4 rounded-full transition-colors duration-200 ${
          checked ? "bg-slate-900" : "bg-slate-300"
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
            !checked ? "translate-x-0.5" : "translate-x-3.5"
          }`}
        />
      </div>
    </label>
  );
}

const SURFACE = "bg-white rounded-xl shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/70";

const LEGENDS = [
  { key: "office", label: "Office", dot: "bg-red-500" },
  { key: "employees", label: "Employees", dot: "bg-blue-500" },
  { key: "vehicles", label: "Vehicles", dot: "bg-green-500" },
  { key: "routes", label: "Route Paths", dot: "bg-purple-500" },
] as const;

export default function BottomControlBar() {
  const expanded = useAppStore((state) => state.legendsExpanded);
  const setExpanded = useAppStore((state) => state.setLegendsExpanded);
  const layers = useAppStore((state) => state.layers);
  const setLayer = useAppStore((state) => state.setLayer);

  // Small pill used when collapsed
  const CollapsedPill = (
    <div
      className={`absolute bottom-4 right-17 z-30 h-10 flex items-center gap-2 pl-3 pr-1 ${SURFACE}`}
      role="region"
      aria-label="Legends collapsed"
    >
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-white" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-white -ml-1" />
        <div className="w-2.5 h-2.5 rounded-full bg-purple-400 ring-2 ring-white -ml-1" />
      </div>

      <span className="text-xs font-medium text-slate-700">Legends</span>

      <button
        aria-expanded={expanded}
        aria-label="Expand legends"
        onClick={() => setExpanded(true)}
        className="grid place-items-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
      >
        <ChevronsLeft className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <>
      {!expanded && CollapsedPill}

      <div
        className={`absolute bottom-4 left-21 right-17 z-20 transition-all duration-300 ${
          expanded
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!expanded}
      >
        <div className={`h-10 flex items-center justify-between gap-3 pl-4 pr-1 ${SURFACE}`}>
          <div className="flex items-center gap-4 min-w-0 overflow-x-auto scrollbar-hide">
            {LEGENDS.map((legend, i) => (
              <div key={legend.key} className="flex items-center gap-4 shrink-0">
                {i > 0 && <div className="h-4 border-l border-slate-200" />}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${legend.dot}`} />
                  <ToggleSwitch
                    id={`legend-${legend.key}`}
                    label={legend.label}
                    checked={layers[legend.key]}
                    onChange={(v) => setLayer(legend.key, v)}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            aria-label="Collapse legends"
            aria-expanded={expanded}
            onClick={() => setExpanded(false)}
            className="grid place-items-center w-8 h-8 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
