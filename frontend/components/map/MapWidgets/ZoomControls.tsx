"use client";

import { Compass, Plus, Minus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { fitMapToData } from "@/lib/map/geo";

const SURFACE = "bg-white rounded-xl shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/70";
const BUTTON =
  "w-10 h-10 grid place-items-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors";

export default function ZoomControls() {
  const mapInstance = useAppStore((s) => s.mapInstance);
  const parsedData = useAppStore((s) => s.parsedData);

  const handleZoomIn = () => mapInstance?.zoomIn();

  const handleZoomOut = () => mapInstance?.zoomOut();

  const handleCompass = () => {
    if (!mapInstance || !parsedData) return;
    fitMapToData(mapInstance, parsedData.employees || [], parsedData.vehicles || []);
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCompass}
        className={`${SURFACE} ${BUTTON}`}
        title="Center on office"
        aria-label="Center on office"
      >
        <Compass className="w-4 h-4" />
      </button>
      <div className={`${SURFACE} flex flex-col overflow-hidden`}>
        <button type="button" onClick={handleZoomIn} className={`${BUTTON} border-b border-slate-100`} title="Zoom in" aria-label="Zoom in">
          <Plus className="w-4 h-4" />
        </button>
        <button type="button" onClick={handleZoomOut} className={BUTTON} title="Zoom out" aria-label="Zoom out">
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
