"use client";

import { Truck, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function VehicleListPanel() {
  const isOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const parsedData = useAppStore((state) => state.parsedData);
  const vehicles = parsedData?.vehicles || [];
  const selectVehicle = useAppStore((state) => state.selectVehicle);
  const triggerSimulation = useAppStore((state) => state.triggerSimulation);

  if (!isOpen) return null;

  return (
    <div className="absolute left-24 top-20 bottom-24 w-64 bg-white/95 backdrop-blur rounded-2xl shadow-2xl z-30 p-4 border border-slate-200 overflow-hidden animate-in slide-in-from-left-4 fade-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-4 h-4" /> Fleet Status
        </h3>
        <button onClick={() => setSidebarOpen(false)}>
          <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
        </button>
      </div>
      <div className="h-full overflow-y-auto pr-2">
        {vehicles.map((v) => (
          <button
            key={v.vehicle_id}
            onClick={() => {
              selectVehicle(v.vehicle_id);
              triggerSimulation(v.vehicle_id);
            }}
            className="w-full text-left p-3 rounded-lg hover:bg-blue-50 mb-2 transition-all border border-transparent hover:border-blue-100 group"
          >
            <div className="font-bold text-slate-700 text-sm">
              {v.vehicle_id}
            </div>
            <div className="text-xs text-slate-400 flex justify-between mt-1">
              <span>Capacity: {v.capacity}</span>
              <span className="text-blue-500 group-hover:underline">
                Route ➝
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
