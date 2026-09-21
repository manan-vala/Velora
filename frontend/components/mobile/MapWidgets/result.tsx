import React from "react";
import { OptimizedRoute, OptimizationResponse, OptimizationResult } from "@/types";
import { useMobileStore } from "@/store/useMobileStore";
import { Download, FileDown, AlertCircle } from "lucide-react";
import { exportOptimizationResultToExcel } from "@/lib/export-excel";

type ResultDashboardProps = {
  setShowResult: (show: boolean) => void;
  resultData: OptimizationResponse | OptimizationResult;
};

export default function ResultDashboard({
  setShowResult,
  resultData,
}: ResultDashboardProps) {
  const parsedData = useMobileStore((state) => state.parsedData);
  const [showMoreDetails, setShowMoreDetails] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const normalizedResult = "data" in resultData ? resultData.data : resultData;
  const vehicles = normalizedResult?.vehicles || [];
  const softViolations = normalizedResult?.soft_violation_details || [];
  const hardViolations = normalizedResult?.hard_violation_details || [];

  if (!vehicles.length) {
    return (
      <div className="fixed left-1/2 -translate-x-1/2 bottom-[95px] sm:bottom-[110px] md:bottom-[116px] md:landscape:bottom-[104px] z-60 w-[calc(100%-1rem)] max-w-[402px] p-4 sm:p-6 bg-white rounded-2xl shadow-2xl flex items-center justify-center pointer-events-auto">
        <p className="text-gray-500 text-sm font-medium">Calculating optimization…</p>
      </div>
    );
  }

  const optVehicles = vehicles as OptimizedRoute[];

  let baselineCost = 0;
  let baselineTime = 0;
  if (parsedData?.baseline && parsedData.baseline.length > 0) {
    parsedData.baseline.forEach((b) => {
      baselineCost += b.baseline_cost;
      baselineTime += b.baseline_time_min;
    });
  }

  const vehiclesList = optVehicles.map((v) => {
    const assignedEmps = v.route_sequence
      .filter(
        (step) =>
          step.location.toLowerCase() !== "office" &&
          step.location !== "0" &&
          !step.location.includes("V"),
      )
      .map((step) => step.location);

    return {
      id: v.vehicle_id,
      employees: assignedEmps,
      totalCost: v.total_cost,
      totalTime: v.total_time_minutes,
    };
  });

  const netCost = vehiclesList.reduce((sum, v) => sum + v.totalCost, 0);
  const netTime = vehiclesList.reduce((sum, v) => sum + v.totalTime, 0);
  const totalEmployeesServed = vehiclesList.reduce(
    (sum, v) => sum + v.employees.length,
    0,
  );

  const noOfVehiclesUsed = optVehicles.length;

  let costWeight = parsedData?.metadata?.objective_cost_weight || 0.5;
  let timeWeight = parsedData?.metadata?.objective_time_weight || 0.5;

  const totalWeight = costWeight + timeWeight;
  if (totalWeight > 0) {
    costWeight /= totalWeight;
    timeWeight /= totalWeight;
  }

  const costRatio = baselineCost > 0 ? netCost / baselineCost : 1;
  let costOptimizationPct = (1 - costRatio) * 100;
  costOptimizationPct = Math.max(0, Math.min(100, costOptimizationPct));

  const timeRatio = baselineTime > 0 ? netTime / baselineTime : 1;
  let timeOptimizationPct = (1 - timeRatio) * 100;
  timeOptimizationPct = Math.max(0, Math.min(100, timeOptimizationPct));

  const totalOptimizationPct =
    costWeight * costOptimizationPct + timeWeight * timeOptimizationPct;

  const BIG_CIRCLE = 389;
  const SMALL_CIRCLE = 113;

  const getOffset = (percent: number, circumference: number) =>
    circumference - (percent / 100) * circumference;

  const predefinedColors = [
    "bg-blue-600",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
  ];

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportOptimizationResultToExcel(normalizedResult as OptimizationResult);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[95px] sm:bottom-[110px] md:bottom-[116px] md:landscape:bottom-[104px] z-60 w-[calc(100%-1rem)] max-w-[402px] md:max-w-[500px] h-[calc(100vh-140px)] max-h-[610px] md:max-h-[700px] p-0 bg-white rounded-2xl shadow-lg flex flex-col">
      <div className="flex-1 overflow-y-auto p-7 relative">
        <button
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] hover:bg-[#e0e0e0] border border-[#d6d6d6] text-black text-xl font-bold z-10 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowResult(false);
          }}
          aria-label="Close"
          type="button"
        >
          ×
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-black mb-2 mt-2">
          Optimization Results
        </h2>

        <p className="text-sm sm:text-base text-[#6a6a6a] mb-2 pr-6">
          All information regarding optimization are here
        </p>

        <div className="mb-6">
          <p className="text-lg font-semibold text-black mb-1">
            Total Optimization :
          </p>

          <div className="flex items-center justify-center">
            <div className="relative w-35 h-35">
              <svg
                className="absolute top-0 left-0 w-full h-full -rotate-90"
                viewBox="0 0 142 142"
              >
                <circle cx="71" cy="71" r="62" stroke="#d6d6d6" strokeWidth="12" fill="none" />
                <circle
                  cx="71"
                  cy="71"
                  r="62"
                  stroke="#50D468"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={BIG_CIRCLE}
                  strokeDashoffset={getOffset(totalOptimizationPct, BIG_CIRCLE)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-black">
                {totalOptimizationPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pb-2">
          <DetailCard label="Cost Saved (in %)" value={costOptimizationPct} circle={SMALL_CIRCLE} getOffset={getOffset} />
          <DetailCard label="Time Saved (in %)" value={timeOptimizationPct} circle={SMALL_CIRCLE} getOffset={getOffset} />

          {showMoreDetails && (
            <div className="p-4 mt-2 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Vehicles Used</span>
                <span className="text-sm font-bold text-slate-800">{noOfVehiclesUsed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Employees Served</span>
                <span className="text-sm font-bold text-slate-800">{totalEmployeesServed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Net Cost</span>
                <span className="text-sm font-bold text-slate-800">₹ {netCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Net Time Spent</span>
                <span className="text-sm font-bold text-slate-800">{netTime.toFixed(0)} min</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="w-full py-3 bg-slate-100 rounded-2xl font-bold text-slate-500 mt-2 text-sm cursor-pointer hover:bg-slate-200 transition-colors"
          >
            {showMoreDetails ? "See less..." : "See more..."}
          </button>

         

          <h3 className="text-lg font-bold mb-3 mt-5 text-[#000000]">Vehicles & Assignments :</h3>
          <div className="flex flex-col gap-3">
            {vehiclesList.map((v, i) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${predefinedColors[i % predefinedColors.length]}`}
                    />
                    <span className="font-bold text-[#000000]">{v.id}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{v.employees.length} Employees</span>
                </div>
                <p className="text-slate-400 text-[10px] mb-2 font-bold uppercase tracking-wider">
                  Assigned Employees:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {v.employees.map((emp) => (
                    <span
                      key={emp}
                      className="px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-500 text-[10px] font-bold"
                    >
                      {emp}
                    </span>
                  ))}
                  {v.employees.length === 0 && (
                    <span className="text-xs text-slate-400">None</span>
                  )}
                </div>
              </div>
              
            ))}

            {/* Violations Mobile */}
            {(softViolations.length > 0 || hardViolations.length > 0) && (
              <div className="space-y-3 mt-4">
                <h3 className="text-sm font-bold text-[#000000]">
                  Optimization Violations
                </h3>
                
                {hardViolations.length > 0 && (
                  <div className="p-3 rounded-2xl border border-red-100 bg-red-50 text-red-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Hard Violations
                    </h4>
                    <ul className="text-xs space-y-1">
                      {hardViolations.map((v, i) => (
                        <li key={i}>
                          <span className="font-bold">{v.employee_id}</span>: {v.type} ({v.actual} / {v.limit})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {softViolations.length > 0 && (
                  <div className="p-3 rounded-2xl border border-orange-100 bg-orange-50 text-orange-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Soft Violations
                    </h4>
                    <ul className="text-xs space-y-1">
                      {softViolations.map((v, i) => (
                        <li key={i}>
                          <span className="font-bold">{v.employee_id}</span>: {v.type} ({v.actual} / {v.limit})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              type="button"
              className="w-full  bg-black hover:bg-black-700 disabled:bg-black-400 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export Excel"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value, circle, getOffset }: { label: string; value: number; circle: number; getOffset: (p: number, c: number) => number; }) {
  return (
    <div className="bg-[#fcfcfc] border border-[#d6d6d6] rounded-[10px] p-4 flex justify-between items-center shadow-sm">
      <span className="text-[#6a6a6a] font-medium text-[15px]">{label}</span>
      <span className="relative flex items-center justify-center w-12 h-12">
        <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="18" stroke="#d6d6d6" strokeWidth="6" fill="none" />
          <circle cx="24" cy="24" r="18" stroke="#50D468" strokeWidth="6" fill="none" strokeDasharray={circle} strokeDashoffset={getOffset(value, circle)} className="transition-all duration-1000 ease-out" />
        </svg>
        <span className="relative text-xs font-bold text-black">{value.toFixed(0)}%</span>
      </span>
    </div>
  );
}