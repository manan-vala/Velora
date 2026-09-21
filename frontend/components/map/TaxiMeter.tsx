"use client";

import { MapPin, Timer } from "lucide-react";

interface TaxiMeterProps {
  distance: number;
  time: number;
}

export default function TaxiMeter({ distance, time }: TaxiMeterProps) {
  return (
    <div className="absolute bottom-6 left-6 z-30 bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 min-w-50 backdrop-blur-md bg-opacity-90">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">
            Live Meter
          </span>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="text-blue-400 w-5 h-5" />
          <div>
            <div className="text-2xl font-mono leading-none">
              {(distance / 1000).toFixed(2)}{" "}
              <span className="text-sm text-slate-400">km</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">
              Distance
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Timer className="text-yellow-400 w-5 h-5" />
          <div>
            <div className="text-2xl font-mono leading-none">
              {Math.floor(time)}{" "}
              <span className="text-sm text-slate-400">s</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">
              Time
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
