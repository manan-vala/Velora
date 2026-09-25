import React from "react";
import { X, TrendingUp, IndianRupee, Clock, Map, AlertCircle } from "lucide-react";
import type { OptimizationResult } from "@/types";

interface OptimizationResultProps {
  data: OptimizationResult | null;
  onClose: () => void;
}

export default function OptimizationResult({
  data,
  onClose,
}: OptimizationResultProps) {
  if (!data) return null;

  const summary = data.summary;
  const vehicles = data.vehicles;
  const softViolations = data.soft_violation_details || [];
  const hardViolations = data.hard_violation_details || [];

  // Calculate some aggregate stats for display
  const totalCost = summary.total_cost_all_vehicles;
  const totalTime = vehicles.reduce((acc, v) => acc + v.total_time_minutes, 0);
  const totalDistance = vehicles.reduce((acc, v) => {
    // Assuming we might have distance in the future, but for now let's use a placeholder or derived metric if available
    // The current response doesn't explicitly have total distance per vehicle in top-level,
    // but likely it's part of the optimization logic.
    // We'll leave it as a calculated estimate or hide if not valid.
    return acc + 0;
  }, 0);

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center pointer-events-none">
      {/* Modal Container - Enable pointer events here */}
      <div className="bg-white w-[calc(100%-2rem)] max-w-2xl max-h-[80vh] overflow-y-auto velora-scroll rounded-2xl shadow-2xl ring-1 ring-slate-200/70 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-500">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md px-5 py-4 border-b border-slate-100 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Optimization Complete
              </h2>
              <p className="text-xs text-slate-500">
                {vehicles.length} vehicles optimized
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex flex-col gap-0.5">
              <span className="text-2xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Total Cost
              </span>
              <span className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                ₹{totalCost.toFixed(2)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex flex-col gap-0.5">
              <span className="text-2xs font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Total Time
              </span>
              <span className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {Math.round(totalTime)} min
              </span>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 flex flex-col gap-0.5">
              <span className="text-2xs font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                <Map className="w-3 h-3" /> Vehicles Used
              </span>
              <span className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {vehicles.length}
              </span>
            </div>
          </div>

          {/* Vehicle Breakdown */}
          <div>
            <h3 className="text-xs font-medium text-slate-500 mb-2">
              Vehicle Breakdown
            </h3>
            <div className="space-y-2">
              {vehicles.map((v) => (
                <div
                  key={v.vehicle_id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`px-2 h-8 rounded-lg flex items-center justify-center font-semibold text-xs
                                        ${
                                          v.vehicle_id.includes("V01")
                                            ? "bg-blue-100 text-blue-700"
                                            : v.vehicle_id.includes("V02")
                                              ? "bg-green-100 text-green-700"
                                              : "bg-purple-100 text-purple-700"
                                        }`}
                      >
                        {v.vehicle_id}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {v.vehicle_type}
                        </p>
                        <p className="text-2xs text-slate-500">
                          {v.route_sequence.length - 2} Stops • {v.capacity}{" "}
                          Seats
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center justify-end text-xs font-semibold text-slate-900 tabular-nums">
                        <IndianRupee className="w-3 h-3" />
                        {v.total_cost.toFixed(2)}
                      </p>
                      <p className="text-2xs text-slate-500">
                        {v.total_time_minutes.toFixed(0)} min
                      </p>
                    </div>
                  </div>

                  {/* Simple Route Visual */}
                  <div>
                    {/* the stops in order; they wrap onto more lines on long routes */}
                    <div className="flex flex-wrap gap-1 items-center text-2xs font-medium text-slate-600">
                      {v.route_sequence.map((step, idx) => (
                        <div
                          key={idx}
                          className="bg-white px-1.5 py-0.5 border border-slate-200 rounded-md max-w-40 wrap-break-word whitespace-normal"
                        >
                          {step.location === "office"
                            ? "🏢"
                            : step.location === v.vehicle_id
                              ? "🚗"
                              : step.location}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Violations */}
          {(softViolations.length > 0 || hardViolations.length > 0) && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-500">
                Optimization Violations
              </h3>
              
              {hardViolations.length > 0 && (
                <div className="p-3 rounded-xl border border-red-100 bg-red-50 text-red-800">
                  <h4 className="text-2xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Hard Violations
                  </h4>
                  <ul className="text-xs space-y-0.5">
                    {hardViolations.map((v, i) => (
                      <li key={i}>
                        <span className="font-semibold">{v.employee_id}</span>: {v.type} ({v.actual} / {v.limit})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {softViolations.length > 0 && (
                <div className="p-3 rounded-xl border border-orange-100 bg-orange-50 text-orange-800">
                  <h4 className="text-2xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Soft Violations
                  </h4>
                  <ul className="text-xs space-y-0.5">
                    {softViolations.map((v, i) => (
                      <li key={i}>
                        <span className="font-semibold">{v.employee_id}</span>: {v.type} ({v.actual} / limit {v.limit})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="h-8 px-4 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              View on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
