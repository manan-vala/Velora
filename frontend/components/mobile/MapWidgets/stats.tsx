import React from "react";
import Image from "next/image";
import { useMobileStore } from "@/store/useMobileStore";

type Employee = {
  id: string;
  pickup_time: string;
};

type Vehicle = {
  vehicle_id: string;
  avg_speed_kmph?: number;
  capacity: number;
  total_cost: number;
  total_time_minutes: number;
  total_steps: number;
  route_sequence: { location: string; arrival_time: string }[];
};

type StatsProps = {
  setShowStats: (show: boolean) => void;
  selectedVehicle: Vehicle;
  allVehicles: Vehicle[];
};

export default function Stats({ setShowStats, selectedVehicle, allVehicles }: StatsProps) {
  const activeVehicleId = useMobileStore((state) => state.activeVehicleId);
  const selectVehicle = useMobileStore((state) => state.selectVehicle);

  if (!allVehicles.length) {
    return (
      <div className="fixed left-1/2 -translate-x-1/2 bottom-[95px] sm:bottom-[110px] md:bottom-[116px] md:landscape:bottom-[104px] z-[60] w-[calc(100%-1rem)] max-w-[402px] md:max-w-[500px] p-5 sm:p-7 bg-white rounded-2xl shadow-lg">
        <button
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] hover:bg-[#e0e0e0] border border-[#d6d6d6] text-black text-xl font-bold z-10"
          onClick={() => setShowStats(false)}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-[#000000] mb-4">Route Statistics</h2>
        <p className="text-slate-500 text-sm">Please run optimization to view route statistics.</p>
      </div>
    );
  }

  const vehiclesToProcess = activeVehicleId
    ? allVehicles.filter((v) => v.vehicle_id === activeVehicleId)
    : allVehicles;

  let totalDistance = 0;
  let totalTime = 0;
  let totalStops = 0;
  let totalCost = 0;

  const displayedEmployees: Employee[] = [];

  vehiclesToProcess.forEach((v) => {
    totalTime += v.total_time_minutes;
    totalCost += v.total_cost;
    totalDistance += (v.total_time_minutes / 60) * (v.avg_speed_kmph || 0);
    totalStops += v.total_steps;

    v.route_sequence.forEach((step) => {
      if (
        step.location.toLowerCase() !== "office" &&
        !step.location.includes("V") &&
        step.location !== "0"
      ) {
        displayedEmployees.push({ id: step.location, pickup_time: step.arrival_time });
      }
    });
  });

  const vehicleColors: Record<string, string> = {
    V01: "bg-blue-600",
    V02: "bg-green-500",
    V03: "bg-purple-500",
    V04: "bg-red-500",
    V05: "bg-yellow-500",
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[95px] sm:bottom-[110px] md:bottom-[116px] md:landscape:bottom-[104px] z-[60] w-[calc(100%-1rem)] max-w-[402px] md:max-w-[500px] h-[calc(100vh-140px)] max-h-[610px] md:max-h-[700px] p-0 bg-white rounded-2xl shadow-lg flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 sm:p-7">
        <button
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] hover:bg-[#e0e0e0] border border-[#d6d6d6] text-black text-xl font-bold z-10"
          onClick={() => setShowStats(false)}
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full ${vehicleColors[activeVehicleId || selectedVehicle.vehicle_id] || "bg-blue-600"}`} />
            <h2 className="text-lg sm:text-xl font-bold text-[#000000]">Selected Vehicle</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 sm:gap-y-6 mb-6 sm:mb-8 px-1">
          <div>
            <p className="text-[#000000] text-xs mb-1">Distance</p>
            <p className="text-lg sm:text-xl font-bold text-neutral-950">{totalDistance.toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-[#000000] text-xs mb-1">Time</p>
            <p className="text-lg sm:text-xl font-bold text-neutral-950">{Math.round(totalTime)} min</p>
          </div>
          <div>
            <p className="text-[#000000] text-xs mb-1">Stops</p>
            <p className="text-lg sm:text-xl font-bold text-neutral-950">{totalStops}</p>
          </div>
          <div>
            <p className="text-[#000000] text-xs mb-1">Fuel Cost</p>
            <p className="text-lg sm:text-xl font-bold text-neutral-950">₹ {totalCost.toFixed(2)}</p>
          </div>
        </div>

        <h3 className="font-bold text-[#5E5E5E] text-sm mb-4">Employees & Pickup</h3>
        <div className="flex flex-col gap-2 mb-8">
          {displayedEmployees.length > 0 ? (
            displayedEmployees.map((e, idx) => (
              <div
                key={`${e.id}-${idx}`}
                className="bg-white border border-slate-100 p-3.5 rounded-xl flex justify-between items-center cursor-default"
              >
                <span className="font-bold text-[#000000]">{e.id}</span>
                <span className="text-[#000000] text-xs">At {e.pickup_time}</span>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-xs">No employees</p>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="relative w-7 h-7">
            <Image src="/allRoutes.svg" alt="All Routes" fill className="object-contain" />
          </div>
          <h3 className="font-bold text-[#000000]">All Routes</h3>
        </div>

        <div className="flex flex-col gap-2">
          {allVehicles.map((v) => (
            <div
              key={v.vehicle_id}
              className={`p-4 rounded-xl border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${activeVehicleId === v.vehicle_id ? "bg-slate-100" : ""}`}
              onClick={() => selectVehicle(v.vehicle_id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${vehicleColors[v.vehicle_id] || "bg-gray-400"}`} />
                <span className="font-bold text-slate-700">{v.vehicle_id}</span>
              </div>
              <span className="text-slate-400 text-xs font-medium">{v.total_steps} Stops</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}