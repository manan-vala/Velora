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
      <div className="bg-white w-[90%] max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-100 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-500">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 text-green-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Optimization Complete
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {vehicles.length} vehicles optimized
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col gap-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Total Cost
              </span>
              <span className="text-2xl font-bold text-slate-800">
                ₹{totalCost.toFixed(2)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 flex flex-col gap-1">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Total Time
              </span>
              <span className="text-2xl font-bold text-slate-800">
                {Math.round(totalTime)} min
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col gap-1">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                <Map className="w-3 h-3" /> Vehicles Used
              </span>
              <span className="text-2xl font-bold text-slate-800">
                {vehicles.length}
              </span>
            </div>
          </div>

          {/* Vehicle Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 px-1">
              Vehicle Breakdown
            </h3>
            <div className="space-y-3">
              {vehicles.map((v) => (
                <div
                  key={v.vehicle_id}
                  className="group p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-2 py-3 rounded-xl flex items-center justify-center font-bold text-sm
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
                        <p className="text-sm font-bold text-slate-800">
                          {v.vehicle_type}
                        </p>
                        <p className="text-xs text-slate-500">
                          {v.route_sequence.length - 2} Stops • {v.capacity}{" "}
                          Seats
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center text-sm font-bold text-slate-800">
                        <IndianRupee className="w-3 h-3" />
                        {v.total_cost.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {v.total_time_minutes.toFixed(0)} min
                      </p>
                    </div>
                  </div>

                  {/* Simple Route Visual */}
                  <div className="relative pt-6 pb-2 px-2">
                    {/* horizontal line that spans the whole area (moved slightly down so wrapped lines don't overlap too badly) */}
                    <div className="absolute left-0 right-0 top-6 h-px bg-slate-200 -z-10" />

                    {/* allow items to wrap to next line, reduce gap if needed */}
                    <div className="flex flex-wrap gap-2 items-center text-[14px] font-medium text-slate-500">
                      {v.route_sequence.map((step, idx) => (
                        <div
                          key={idx}
                          className="bg-white px-2 py-1 border border-gray-300 rounded-lg max-w-40 wrap-break-words whitespace-normal"
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
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 px-1">
                Optimization Violations
              </h3>
              
              {hardViolations.length > 0 && (
                <div className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Hard Violations
                  </h4>
                  <ul className="text-sm space-y-1">
                    {hardViolations.map((v, i) => (
                      <li key={i}>
                        <span className="font-bold">{v.employee_id}</span>: {v.type} ({v.actual} / {v.limit})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {softViolations.length > 0 && (
                <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50 text-orange-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Soft Violations
                  </h4>
                  <ul className="text-sm space-y-1">
                    {softViolations.map((v, i) => (
                      <li key={i}>
                        <span className="font-bold">{v.employee_id}</span>: {v.type} ({v.actual} / limit {v.limit})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              View on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
