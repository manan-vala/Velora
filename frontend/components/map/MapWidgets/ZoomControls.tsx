"use client";

import { Plus, Minus } from "lucide-react";
import Image from "next/image";
import { useAppStore } from "@/store/useAppStore";
import { fitMapToData } from "@/lib/map/geo";

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
    <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3">
      <Image
        src="/compass.svg"
        alt="Center on office"
        onClick={handleCompass}
        className="rounded-full w-13 h-13 object-cover cursor-pointer"
        title="Center on office"
        width={52}
        height={52}
      />
      <div className="bg-white rounded-2xl shadow-lg border flex flex-col overflow-hidden">
        <button
          onClick={handleZoomIn}
          className="p-3 hover:bg-slate-50 border-b transition-colors active:bg-slate-100 flex items-center justify-center"
          title="Zoom in"
        >
          <Plus className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-3 hover:bg-slate-50 transition-colors active:bg-slate-100 flex items-center justify-center"
          title="Zoom out"
        >
          <Minus className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
