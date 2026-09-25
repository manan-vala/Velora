import React from "react";
import { Loader2 } from "lucide-react";

export default function OptimizationLoading() {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white px-6 py-5 rounded-2xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-white p-3 rounded-full border border-blue-100 shadow-sm">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Optimizing Routes
        </h3>
        <p className="text-slate-500 text-xs text-center max-w-[200px]">
          Calculating the best paths for your fleet...
        </p>
      </div>
    </div>
  );
}
