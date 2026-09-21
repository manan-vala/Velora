"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Menu,
  Search,
  BarChart3,
  TrendingUp,
  Download,
  AlertCircle,
  Settings,
  HelpCircle,
  MessageSquareMore,
  Upload,
  FileSpreadsheet,
  Users,
  Car,
  Bug,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimization } from "@/hooks/useOptimization";
import { useAppStore } from "@/store/useAppStore"; // Zustand Store
import { parseExcel } from "@/lib/excel-parser";
import { ParsedData, Employee, Vehicle } from "@/types";
import OptimizationLoading from "./OptimizationLoading";
import OptimizationResult from "./OptimizationResult";
import { Alert, AlertTitle, AlertDescription } from "@/components/map/ui/alert";
import { exportOptimizationResultToExcel } from "@/lib/export-excel";

export default function EloraSidebarLayout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showResultsPopup, setShowResultsPopup] = useState(false);

  // Zustand Hooks
  const setParsedData = useAppStore((state) => state.setParsedData);
  const setUploadedFile = useAppStore((state) => state.setUploadedFile);
  const parsedData = useAppStore((state) => state.parsedData);
  const uploadedFile = useAppStore((state) => state.uploadedFile);
  const activeVehicleId = useAppStore((state) => state.activeVehicleId);

  const selectVehicle = useAppStore((state) => state.selectVehicle);
  const selectEmployee = useAppStore((state) => state.selectEmployee);
  const setMapFocus = useAppStore((state) => state.setMapFocus);

  const employees = parsedData?.employees || [];
  const vehicles = parsedData?.vehicles || [];

  const { runOptimization, status, isStarting } = useOptimization();
  const router = useRouter();

  // Show popup automatically when it finishes processing
  useEffect(() => {
    if (status === "completed") {
      setShowResultsPopup(true);
    }
  }, [status]);

  const optimizationResult = useAppStore((state) => state.optimizationResult);

  const canOptimize = employees.length > 0 && vehicles.length > 0;
  const isOptimized = status === "completed";
  const isProcessing = status === "processing" || isStarting;

  const handleFileUpload = async (file: File) => {
    try {
      const parsed = await parseExcel(file);
      setUploadedFile(file);
      setParsedData(parsed);
      setShowResultsPopup(false);
    } catch (error) {
      console.error("Error parsing file:", error);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleLocate = (
    type: "employee" | "vehicle",
    id: string,
    lat: number,
    lng: number,
  ) => {
    // 1. Update Selection (Store automatically clears the other one)
    if (type === "vehicle") {
      selectVehicle(id);
    } else {
      selectEmployee(id);
    }

    // 2. Command the Map to Move
    // We just say "Go here". The Map component decides HOW to animate it.
    setMapFocus({ lat, lng, zoom: 17 });
  };

  // --- FLOATING MENU CONTENT COMPONENTS ---

  const SearchMenu = () => {
    const [searchType, setSearchType] = useState<"employees" | "vehicles">(
      "vehicles",
    );
    const [searchTerm, setSearchTerm] = useState("");

    const filteredItems = useMemo(() => {
      const term = searchTerm.toLowerCase();
      if (searchType === "employees") {
        return employees.filter((e) =>
          e.employee_id.toLowerCase().includes(term),
        );
      } else {
        return vehicles.filter((v) =>
          v.vehicle_id.toLowerCase().includes(term),
        );
      }
    }, [searchType, searchTerm, employees, vehicles]);

    return (
      <div className="p-7">
        <h2 className="text-xl text-[#000000] font-bold mb-5 px-1">
          Search Type
        </h2>
        <div className="bg-slate-100 p-1 rounded-2xl flex mb-6">
          <button
            onClick={() => setSearchType("employees")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${searchType === "employees" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
          >
            <Users className="w-4 h-4" /> Employees
          </button>
          <button
            onClick={() => setSearchType("vehicles")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${searchType === "vehicles" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
          >
            <Car className="w-4 h-4" /> Vehicles
          </button>
        </div>
        <div className="border border-slate-100 rounded-[28px] p-5 bg-white">
          <h3 className="text-lg font-bold mb-1 text-slate-800">
            Find {searchType === "employees" ? "Employee" : "Vehicle"}
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Locate a {searchType === "employees" ? "person" : "vehicle"} on the
            map
          </p>
          <input
            type="text"
            placeholder={`Search ${searchType === "employees" ? "Employee" : "Vehicle"}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-[#8F8F8F] bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 mb-6 text-sm outline-none"
          />
          {/* <h4 className="text-[#5E5E5E] font-bold mb-4 uppercase text-[10px] tracking-widest">
            Suggested
          </h4> */}
          <div className="flex flex-col gap-4">
            {filteredItems.map((item) => {
              const id =
                searchType === "employees"
                  ? (item as Employee).employee_id
                  : (item as Vehicle).vehicle_id;
              // Simple color coding: Blue for employees, Green for vehicles
              const color =
                searchType === "employees" ? "bg-blue-600" : "bg-green-500";

              return (
                <div key={id} className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">{id}</span>
                  <button
                    onClick={() => {
                      if (searchType === "employees") {
                        const emp = item as Employee;
                        handleLocate(
                          "employee",
                          emp.employee_id,
                          emp.pickup_lat,
                          emp.pickup_lng,
                        );
                      } else {
                        const veh = item as Vehicle;
                        handleLocate(
                          "vehicle",
                          veh.vehicle_id,
                          veh.current_lat,
                          veh.current_lng,
                        );
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 border border-slate-100 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full ${color}`} /> View
                  </button>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-4">
                No items found.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const StatsMenu = () => {
    if (!optimizationResult) {
      return (
        <div className="p-7 min-w-[320px]">
          <h2 className="text-xl font-bold text-[#000000] mb-4">
            Route Statistics
          </h2>
          <p className="text-slate-500 text-sm">
            Please run optimization to view route statistics.
          </p>
        </div>
      );
    }

    let totalDistance = 0;
    let totalTime = 0;
    let totalStops = 0;
    let totalCost = 0;

    let displayedEmployees: { id: string; t: string }[] = [];

    const vehiclesToProcess = activeVehicleId
      ? optimizationResult.vehicles.filter(
          (v) => v.vehicle_id === activeVehicleId,
        )
      : optimizationResult.vehicles;

    vehiclesToProcess.forEach((v) => {
      totalTime += v.total_time_minutes;
      totalCost += v.total_cost;
      totalDistance += (v.total_time_minutes / 60) * v.avg_speed_kmph;
      totalStops += v.total_steps;

      v.route_sequence.forEach((step) => {
        if (
          step.location.toLowerCase() !== "office" &&
          !step.location.includes("V") &&
          step.location !== "0"
        ) {
          displayedEmployees.push({ id: step.location, t: step.arrival_time });
        }
      });
    });

    return (
      <div className="p-7 min-w-[320px]">
        <div className="flex justify-between items-center mb-8 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <h2 className="text-xl font-bold text-[#000000]">
              Selected Vehicle
            </h2>
          </div>
          <select
            className="bg-slate-50 px-2 py-1.5 rounded-xl text-[#000000] font-bold text-sm border border-slate-200 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 max-w-[120px]"
            value={activeVehicleId || ""}
            onChange={(e) => {
              const val = e.target.value;
              selectVehicle(val === "" ? null : val);
            }}
          >
            <option value="">--</option>
            {optimizationResult.vehicles.map((v) => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.vehicle_id}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-y-6 mb-8 px-1">
          <div>
            <p className="text-[#000000] text-xs mb-1">Distance</p>
            <p className="text-xl font-bold text-neutral-950">
              {totalDistance.toFixed(1)} km
            </p>
          </div>
          <div>
            <p className="text-[#000000] text-xs mb-1">Time</p>
            <p className="text-xl font-bold text-neutral-950">
              {Math.round(totalTime)} min
            </p>
          </div>
          <div>
            <p className="text-[#000000] text-xs mb-1">Stops</p>
            <p className="text-xl font-bold text-neutral-950">{totalStops}</p>
          </div>
          <div>
            <p className="text-[#000000] text-xs mb-1">Fuel Cost</p>
            <p className="text-xl font-bold text-neutral-950">
              ₹ {totalCost.toFixed(2)}
            </p>
          </div>
        </div>
        <h3 className="font-bold text-[#5E5E5E] text-sm mb-4">
          Employees & Pickup
        </h3>
        <div className="flex flex-col gap-2 mb-8 overflow-y-auto pr-1">
          {displayedEmployees.length > 0 ? (
            displayedEmployees.map((e, idx) => (
              <div
                key={`${e.id}-${idx}`}
                className={`bg-white border ${optimizationResult.soft_violation_details?.some((emp) => emp.employee_id === e.id) ? "border-red-300 bg-red-100" : "border-slate-100"} p-3.5 rounded-xl flex justify-between items-center cursor-default shrink-0`}
              >
                <span className="font-bold text-[#000000] truncate max-w-[120px]">
                  {e.id}
                </span>
                <span className="text-[#000000] text-xs whitespace-nowrap">
                  At {e.t}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-xs">No employees</p>
          )}
        </div>
      </div>
    );
  };

  const ResultsMenu = () => {
    const [showMoreDetails, setShowMoreDetails] = useState(false);

    if (!optimizationResult || !parsedData) {
      return (
        <div className="p-7 min-w-[320px]">
          <h2 className="text-2xl text-[#000000] font-bold mb-1">
            Optimization Results
          </h2>
          <p className="text-slate-500 text-sm mt-4">
            Please run optimization to view results.
          </p>
        </div>
      );
    }

    // 1. Calculate Baselines
    let baselineCost = 0;
    let baselineTime = 0;
    if (parsedData.baseline && parsedData.baseline.length > 0) {
      parsedData.baseline.forEach((b) => {
        baselineCost += b.baseline_cost;
        baselineTime += b.baseline_time_min;
      });
    }

    // 2. Calculate New Post-Optimization Totals & Assignments
    let netCost = 0;
    let netTime = 0;
    let totalEmployeesServed = 0;

    const vehiclesList = optimizationResult.vehicles.map((v) => {
      netCost += v.total_cost;
      netTime += v.total_time_minutes;

      // Filter out office, '0', and generic non-employee nodes
      const assignedEmps = v.route_sequence
        .filter(
          (step) =>
            step.location.toLowerCase() !== "office" &&
            step.location !== "0" &&
            !step.location.includes("V"),
        )
        .map((step) => step.location);

      totalEmployeesServed += assignedEmps.length;

      return {
        id: v.vehicle_id,
        employees: assignedEmps,
      };
    });

    const noOfVehiclesUsed = optimizationResult.vehicles.length;

    // 3. Retrieve Weights (defaults to 0.5 if not found or 0)
    let costWeight = parsedData.metadata?.objective_cost_weight || 0.5;
    let timeWeight = parsedData.metadata?.objective_time_weight || 0.5;

    // Normalize weights just in case they don't add up to 1
    const totalWeight = costWeight + timeWeight;
    if (totalWeight > 0) {
      costWeight /= totalWeight;
      timeWeight /= totalWeight;
    }

    // 4. Calculate % Saved
    // Cost
    const costRatio = baselineCost > 0 ? netCost / baselineCost : 1;
    let costOptimizationPct = (1 - costRatio) * 100;
    // Bound between 0 and 100 to prevent display bugs if negative (worse than baseline)
    costOptimizationPct = Math.max(0, Math.min(100, costOptimizationPct));

    // Time
    const timeRatio = baselineTime > 0 ? netTime / baselineTime : 1;
    let timeOptimizationPct = (1 - timeRatio) * 100;
    timeOptimizationPct = Math.max(0, Math.min(100, timeOptimizationPct));

    // Total Optimization
    const totalOptimizationPct =
      costWeight * costOptimizationPct + timeWeight * timeOptimizationPct;

    const size = 140,
      sw = 14,
      r = (size - sw) / 2,
      circ = 2 * Math.PI * r;

    const MiniProgress = ({ val }: { val: number }) => {
      const mSize = 48,
        mSw = 5,
        mR = (mSize - mSw) / 2,
        mCirc = 2 * Math.PI * mR;
      return (
        <div className="w-12 h-12 flex items-center justify-center relative">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox={`0 0 ${mSize} ${mSize}`}
          >
            <circle
              cx={mSize / 2}
              cy={mSize / 2}
              r={mR}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={mSw}
            />
            <circle
              cx={mSize / 2}
              cy={mSize / 2}
              r={mR}
              fill="none"
              stroke="#22c55e"
              strokeWidth={mSw}
              strokeDasharray={mCirc}
              strokeDashoffset={mCirc - (val / 100) * mCirc}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[14px] text-[#000000] font-bold">
            {val.toFixed(0)}%
          </span>
        </div>
      );
    };

    const predefinedColors = [
      "bg-blue-600",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
    ];

    return (
      <div className="p-7 w-[340px]">
        <h2 className="text-2xl text-[#000000] font-bold mb-1">
          Optimization Results
        </h2>
        <p className="text-slate-400 text-xs mb-8">
          All information regarding optimization are here
        </p>
        <h3 className="text-lg font-bold mb-6 text-[#000000]">
          Total Optimization :
        </h3>
        <div className="flex justify-center mb-7 relative">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox={`0 0 ${size} ${size}`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={sw}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#22c55e"
                strokeWidth={sw}
                strokeDasharray={circ}
                strokeDashoffset={circ - (totalOptimizationPct / 100) * circ}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-3xl font-bold text-slate-800">
              {totalOptimizationPct.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 mb-6">
          {[
            { l: "Cost Saved", v: costOptimizationPct },
            { l: "Time Saved", v: timeOptimizationPct },
          ].map((s) => (
            <div
              key={s.l}
              className="p-4 rounded-2xl border border-slate-100 flex justify-between items-center cursor-default"
            >
              <span className="text-sm font-medium text-[#000000]">
                {s.l} (in %)
              </span>
              <MiniProgress val={s.v} />
            </div>
          ))}

          {showMoreDetails && (
            <div className="p-4 mt-2 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Vehicles Used
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {noOfVehiclesUsed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Employees Served
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {totalEmployeesServed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Net Cost
                </span>
                <span className="text-sm font-bold text-slate-800">
                  ₹ {netCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Net Time Spent
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {netTime.toFixed(0)} min
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-400 mt-2 text-sm cursor-pointer hover:bg-slate-200 transition-colors"
          >
            {showMoreDetails ? "See less..." : "See more..."}
          </button>
        </div>
        <h3 className="text-lg font-bold mb-6 text-[#000000]">
          Vehicles & Assignments :
        </h3>
        <div className="flex flex-col gap-4">
          {vehiclesList.map((v, i) => (
            <div
              key={v.id}
              className="p-5 rounded-3xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${predefinedColors[i % predefinedColors.length]}`}
                  />
                  <span className="font-bold text-[#000000]">{v.id}</span>
                </div>
                <span className="text-slate-400 text-xs">
                  {v.employees.length} Employees
                </span>
              </div>
              <p className="text-slate-400 text-[10px] mb-2 font-bold uppercase tracking-wider">
                Assigned Employees:
              </p>
              <div className="flex gap-2 flex-wrap">
                {v.employees.map((emp) => (
                  <span
                    key={emp}
                    className="px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-400 text-[10px] font-bold cursor-default hover:border-slate-300 transition-colors"
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
        </div>
      </div>
    );
  };

  const DownloadMenu = () => (
    <div className="p-7 max-w-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl text-[#000000] font-bold">Download Results</h2>
      </div>
      <p className="text-slate-400 text-xs mb-8">
        Export your optimization results to Excel
      </p>

      {!optimizationResult ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Optimization Required</AlertTitle>
          <AlertDescription>
            Please process routes first before downloading the results.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-slate-500 text-sm mb-2">
            Your routes have been successfully optimized. You can now download
            the detailed vehicle summary and route sequences.
          </p>
          <button
            onClick={() => exportOptimizationResultToExcel(optimizationResult)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-5 h-5" /> Download Excel (.xlsx)
          </button>
        </div>
      )}
    </div>
  );

  const SettingsMenu = () => {
    const mapTheme = useAppStore((state) => state.mapTheme);
    const setMapTheme = useAppStore((state) => state.setMapTheme);

    return (
      <div className="p-7 min-w-[300px]">
        <h2 className="text-xl text-[#000000] font-bold mb-5 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" /> Settings
        </h2>
        <div className="border border-slate-100 rounded-[28px] p-5 bg-white">
          <h3 className="text-sm font-bold mb-3 text-slate-800">Map Theme</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="theme"
                value="whiteMap"
                checked={mapTheme === "whiteMap"}
                onChange={() => setMapTheme("whiteMap")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-slate-700">
                Light Mode
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="theme"
                value="darkMode"
                checked={mapTheme === "darkMode"}
                onChange={() => setMapTheme("darkMode")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-slate-700">
                Dark Mode
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed left-4 top-4 bottom-4 flex gap-4 z-70"
      onMouseLeave={() => {
        setIsSidebarExpanded(false);
        setActiveTab(null);
      }}
    >
      <div
        onMouseEnter={() => setIsSidebarExpanded(true)}
        className={`bg-white h-full rounded-3xl shadow-lg border border-slate-100 flex flex-col py-6 px-3 transition-all duration-300 ${isSidebarExpanded ? "w-64" : "w-20"}`}
      >
        <div className="flex items-center h-12 mb-2 shrink-0">
          <div
            className="w-12 h-12 flex items-center justify-center shrink-0 cursor-pointer"
            onClick={() => setIsSidebarExpanded((prev) => !prev)}
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </div>
          <div
            className={`relative h-8 w-28 transition-opacity ${isSidebarExpanded ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src="/velora.png"
              alt="Logo"
              fill
              className="object-contain object-left pl-6"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-1">
          {[
            { id: "search", icon: Search, label: "Search" },
            { id: "stats", icon: BarChart3, label: "Stats" },
            { id: "results", icon: TrendingUp, label: "Results" },
            { id: "download", icon: Download, label: "Download" },
          ].map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setActiveTab(item.id)}
              className={`flex items-center h-12 rounded-xl cursor-pointer group ${activeTab === item.id ? "bg-[#E5E7EB]" : "hover:bg-slate-50"}`}
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <item.icon className="w-6 h-6 text-[#000000]" />
              </div>
              <span
                className={`font-medium text-slate-900 text-sm transition-all ${isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"}`}
              >
                {item.label}
              </span>
            </div>
          ))}

          <div className="w-full my-2">
            <hr className="border-slate-50 mb-2" />
            <div className="flex items-center h-12 w-full">
              {/* Replaced optimization icon logic with optimization.svg */}
              <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
                <div className="relative w-6 h-6">
                  <Image
                    src="/optimized.svg"
                    alt="Optimization"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <div
                className={`border-2 rounded-full transition-all whitespace-nowrap overflow-hidden shadow-sm ${isSidebarExpanded ? "opacity-100 w-full px-1 py-1 mr-2" : "opacity-0 w-0 pointer-events-none"} ${isOptimized ? "border-green-500 bg-green-50" : "border-transparent"}`}
              >
                <button
                  id="optimize-trigger"
                  disabled={!canOptimize || isProcessing}
                  onClick={() => runOptimization()}
                  className={`h-9 rounded-full text-xs font-bold transition-all whitespace-nowrap overflow-hidden cursor-pointer flex items-center justify-center gap-2
    ${
      isOptimized
        ? "bg-green-500 text-white hover:bg-green-600"
        : "bg-gray-800 text-white hover:bg-gray-900"
    }
    ${!canOptimize || isProcessing ? "opacity-50 cursor-not-allowed" : ""}
    ${isSidebarExpanded ? "opacity-100 w-full px-2 lg:mr-2" : "opacity-0 w-0 pointer-events-none"}
  `}
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : isOptimized ? (
                    <>Result Optimized</>
                  ) : (
                    <>Optimize Routes</>
                  )}
                </button>
              </div>
            </div>
            <hr className="border-slate-50 mt-2" />
          </div>

          {/* Loaders and Popups */}
          {isProcessing && <OptimizationLoading />}
          {showResultsPopup && (
            <OptimizationResult
              data={optimizationResult}
              onClose={() => setShowResultsPopup(false)}
            />
          )}

          {[
            { id: "settings", icon: Settings, l: "Settings" },
            { id: "help", icon: HelpCircle, l: "Help" },
            { id: "bug report", icon: Bug, l: "Report Bugs" },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.id === "help") {
                  router.push("/visualiser/help");
                }
              }}
              onMouseEnter={() => setActiveTab(item.id)}
              className={`flex items-center h-12 rounded-xl cursor-pointer group ${activeTab === item.id ? "bg-[#E5E7EB]" : "hover:bg-slate-50"}`}
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-[#000000]" />
              </div>
              <span
                className={`font-medium text-slate-900 text-sm transition-all ${isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`}
              >
                {item.l}
              </span>
            </div>
          ))}
        </div>

        <div
          className={`${isSidebarExpanded ? "p-4 bg-slate-50 rounded-3xl border border-slate-100" : "py-4 h-28"}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div
            className={`flex cursor-pointer ${isSidebarExpanded ? "items-center justify-center bg-white p-2 rounded-lg mb-2 shadow-sm" : "items-start justify-center w-12 h-12"}`}
          >
            <FileSpreadsheet
              className={`w-5 h-5 ${
                isSidebarExpanded ? "text-green-500" : "text-black"
              } ${isDragging ? "animate-bounce" : ""}`}
            />
          </div>
          {isSidebarExpanded && (
            <div className="text-center">
              <p className="text-[9px] text-slate-400 mb-2 leading-tight">
                {isDragging ? "Drop file here" : "Drag and drop or"}
                <br />
                {!isDragging && "select an excel file."}
              </p>
              <div className="relative">
                <button className="bg-blue-600 text-white text-[9px] py-1.5 w-full rounded-lg font-bold flex items-center justify-center gap-1 shadow-md cursor-pointer hover:bg-blue-700 transition-colors">
                  <Upload className="w-3 h-3" /> Select a file
                </button>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={onFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab && (
        <div className="mt-14 w-fit bg-white rounded-4xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-120px)]">
          <div className="overflow-y-auto flex-1 scrollbar-hide">
            {activeTab === "search" && <SearchMenu />}
            {activeTab === "stats" && <StatsMenu />}
            {activeTab === "results" && <ResultsMenu />}
            {activeTab === "download" && <DownloadMenu />}
            {activeTab === "settings" && <SettingsMenu />}
          </div>
        </div>
      )}
    </div>
  );
}
