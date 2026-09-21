"use client";

export default function TopToggle() {
  return (
    <div className="absolute top-6 left-28 z-20 bg-white rounded-xl p-1 shadow-md border border-slate-100 flex">
      <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm">
        Map View
      </button>
      <button className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors">
        Dataset
      </button>
    </div>
  );
}