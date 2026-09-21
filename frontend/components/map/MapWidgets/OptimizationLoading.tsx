import React from "react";
import { Loader2 } from "lucide-react";

export default function OptimizationLoading() {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-white p-4 rounded-full border-2 border-blue-50 shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">
          Optimizing Routes
        </h3>
        <p className="text-slate-500 text-sm text-center max-w-[200px]">
          Calculating the best paths for your fleet...
        </p>
      </div>
    </div>
  );
}
