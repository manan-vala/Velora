"use client";

import { useRouter } from "next/navigation";

const VIEWS = [
  { id: "map", label: "Map View", href: "/visualiser" },
  { id: "dataset", label: "Dataset", href: "/dataset" },
] as const;

/**
 * Switch between the map and the uploaded dataset, shared by both screens. It floats top-right
 * over the map; `inline` places it in normal flow instead (the dataset page header).
 */
export default function TopToggle({ active, inline = false }: { active: "map" | "dataset"; inline?: boolean }) {
  const router = useRouter();

  return (
    <div className={`${inline ? "" : "absolute top-4 right-4 z-20 "}flex gap-0.5 rounded-xl bg-white/95 p-1 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/70 backdrop-blur-sm`}>
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          aria-pressed={active === view.id}
          onClick={() => active !== view.id && router.push(view.href)}
          className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${
            active === view.id
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
