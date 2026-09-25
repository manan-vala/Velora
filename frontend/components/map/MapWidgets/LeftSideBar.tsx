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
  Upload,
  FileSpreadsheet,
  Users,
  Car,
  LogOut,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimization } from "@/hooks/useOptimization";
import { useLogout, useSession } from "@/hooks/useSession";
import { useAppStore } from "@/store/useAppStore"; // Zustand Store
import { parseExcel } from "@/lib/excel-parser";
import { DEMO_DATASETS, loadDemoFile, type DemoDataset } from "@/lib/demo-datasets";
import { ParsedData, Employee, Vehicle } from "@/types";
import OptimizationLoading from "./OptimizationLoading";
import OptimizationResult from "./OptimizationResult";
import { Alert, AlertTitle, AlertDescription } from "@/components/map/ui/alert";
import { exportOptimizationResultToExcel } from "@/lib/export-excel";
import { ROUTE_COLORS } from "@/lib/map/geo";

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
  const { user, isAdmin } = useSession();
  const logout = useLogout();
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

  // Demo test cases load as real .xlsx files, the same as a picked file
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const handleDemo = async (demo: DemoDataset) => {
    if (loadingDemo) return;
    setLoadingDemo(demo.id);
    try {
      await handleFileUpload(await loadDemoFile(demo));
    } catch (error) {
      console.error("Error loading demo dataset:", error);
    } finally {
      setLoadingDemo(null);
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
      <div className="p-4 w-72">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">
          Search Type
        </h2>
        <div className="bg-slate-100 p-0.5 rounded-lg flex mb-3">
          <button
            onClick={() => setSearchType("employees")}
            className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-all cursor-pointer ${searchType === "employees" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
          >
            <Users className="w-3.5 h-3.5" /> Employees
          </button>
          <button
            onClick={() => setSearchType("vehicles")}
            className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-all cursor-pointer ${searchType === "vehicles" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
          >
            <Car className="w-3.5 h-3.5" /> Vehicles
          </button>
        </div>
        <div className="rounded-xl border border-slate-100 p-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Find {searchType === "employees" ? "Employee" : "Vehicle"}
          </h3>
          <p className="text-slate-500 text-xs mb-2">
            Locate a {searchType === "employees" ? "person" : "vehicle"} on the
            map
          </p>
          <input
            type="text"
            placeholder={`Search ${searchType === "employees" ? "Employee" : "Vehicle"}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-2.5 mb-1 text-xs outline-none focus:border-slate-400 focus:bg-white"
          />
          {/* <h4 className="text-slate-500 font-semibold mb-4 uppercase text-2xs tracking-widest">
            Suggested
          </h4> */}
          <div className="flex flex-col">
            {filteredItems.map((item) => {
              const id =
                searchType === "employees"
                  ? (item as Employee).employee_id
                  : (item as Vehicle).vehicle_id;
              // Simple color coding: Blue for employees, Green for vehicles
              const color =
                searchType === "employees" ? "bg-blue-600" : "bg-green-500";

              return (
                <div
                  key={id}
                  className="flex items-center justify-between px-1 py-1 border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-xs font-medium text-slate-900">{id}</span>
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
                    className="flex items-center gap-1.5 h-6 px-2.5 border border-slate-200 rounded-full text-2xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full ${color}`} /> View
                  </button>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="text-center text-slate-400 text-xs py-3">
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
        <div className="p-4 w-72">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Route Statistics
          </h2>
          <p className="text-slate-500 text-xs">
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
      <div className="p-4 w-72">
        <div className="flex justify-between items-center mb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Selected Vehicle
            </h2>
          </div>
          <select
            className="h-7 bg-slate-50 px-2 rounded-lg text-slate-900 font-medium text-xs border border-slate-200 cursor-pointer outline-none focus:border-slate-400 max-w-[120px]"
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3 p-3 rounded-xl bg-slate-50">
          <div>
            <p className="text-slate-500 text-2xs">Distance</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              {totalDistance.toFixed(1)} km
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-2xs">Time</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              {Math.round(totalTime)} min
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-2xs">Stops</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">{totalStops}</p>
          </div>
          <div>
            <p className="text-slate-500 text-2xs">Fuel Cost</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              ₹ {totalCost.toFixed(2)}
            </p>
          </div>
        </div>
        <h3 className="text-xs font-medium text-slate-500 mb-1.5">
          Employees & Pickup
        </h3>
        <div className="flex flex-col gap-1">
          {displayedEmployees.length > 0 ? (
            displayedEmployees.map((e, idx) => (
              <div
                key={`${e.id}-${idx}`}
                className={`border ${optimizationResult.soft_violation_details?.some((emp) => emp.employee_id === e.id) ? "border-red-200 bg-red-50" : "border-slate-100 bg-white"} px-2.5 py-1.5 rounded-lg flex justify-between items-center cursor-default shrink-0`}
              >
                <span className="text-xs font-medium text-slate-900 truncate max-w-[160px]">
                  {e.id}
                </span>
                <span className="text-slate-500 text-2xs tabular-nums whitespace-nowrap">
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
        <div className="p-4 w-72">
          <h2 className="text-sm font-semibold text-slate-900">
            Optimization Results
          </h2>
          <p className="text-slate-500 text-xs mt-1">
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
        <div className="w-10 h-10 flex items-center justify-center relative">
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
          <span className="absolute text-2xs text-slate-900 font-semibold">
            {val.toFixed(0)}%
          </span>
        </div>
      );
    };

    return (
      <div className="p-4 w-72">
        <h2 className="text-sm font-semibold text-slate-900">
          Optimization Results
        </h2>
        <p className="text-slate-500 text-xs mt-0.5 mb-3">
          All information regarding optimization are here
        </p>
        <h3 className="text-xs font-medium mb-1.5 text-slate-500">
          Total Optimization
        </h3>
        <div className="flex justify-center mb-3 relative">
          <div className="relative w-28 h-28 flex items-center justify-center">
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
            <span className="absolute text-2xl font-semibold tracking-tight text-slate-900">
              {totalOptimizationPct.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          {[
            { l: "Cost Saved", v: costOptimizationPct },
            { l: "Time Saved", v: timeOptimizationPct },
          ].map((s) => (
            <div
              key={s.l}
              className="pl-3 pr-1.5 py-1 rounded-xl border border-slate-100 flex justify-between items-center cursor-default"
            >
              <span className="text-xs font-medium text-slate-900">
                {s.l} (in %)
              </span>
              <MiniProgress val={s.v} />
            </div>
          ))}

          {showMoreDetails && (
            <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Vehicles Used
                </span>
                <span className="text-xs font-semibold text-slate-900 tabular-nums">
                  {noOfVehiclesUsed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Employees Served
                </span>
                <span className="text-xs font-semibold text-slate-900 tabular-nums">
                  {totalEmployeesServed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Net Cost
                </span>
                <span className="text-xs font-semibold text-slate-900 tabular-nums">
                  ₹ {netCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  Net Time Spent
                </span>
                <span className="text-xs font-semibold text-slate-900 tabular-nums">
                  {netTime.toFixed(0)} min
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="w-full h-8 bg-slate-100 rounded-lg font-medium text-slate-500 text-xs cursor-pointer hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            {showMoreDetails ? "See less..." : "See more..."}
          </button>
        </div>
        <h3 className="text-xs font-medium mb-1.5 text-slate-500">
          Vehicles & Assignments
        </h3>
        <div className="flex flex-col gap-1.5">
          {vehiclesList.map((v, i) => (
            <div
              key={v.id}
              className="p-3 rounded-xl border border-slate-100 bg-white"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                  />
                  <span className="text-xs font-semibold text-slate-900">{v.id}</span>
                </div>
                <span className="text-slate-400 text-2xs">
                  {v.employees.length} Employees
                </span>
              </div>
              <p className="text-slate-400 text-2xs mb-1 font-medium uppercase tracking-wider">
                Assigned Employees:
              </p>
              <div className="flex gap-1 flex-wrap">
                {v.employees.map((emp) => (
                  <span
                    key={emp}
                    className="px-2 rounded-full border border-slate-200 bg-white text-slate-600 text-2xs font-medium cursor-default hover:border-slate-300 transition-colors"
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
    <div className="p-4 w-72">
      <h2 className="text-sm font-semibold text-slate-900">Download Results</h2>
      <p className="text-slate-500 text-xs mt-0.5 mb-3">
        Export your optimization results to Excel
      </p>

      {!optimizationResult ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">Optimization Required</AlertTitle>
          <AlertDescription className="text-xs">
            Please process routes first before downloading the results.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-slate-500 text-xs">
            Your routes have been successfully optimized. You can now download
            the detailed vehicle summary and route sequences.
          </p>
          <button
            onClick={() => exportOptimizationResultToExcel(optimizationResult)}
            className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download Excel (.xlsx)
          </button>
        </div>
      )}
    </div>
  );

  const SettingsMenu = () => {
    const mapTheme = useAppStore((state) => state.mapTheme);
    const setMapTheme = useAppStore((state) => state.setMapTheme);

    return (
      <div className="p-4 w-72">
        <h2 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-700" /> Settings
        </h2>
        <div className="rounded-xl border border-slate-100 p-1.5">
          <h3 className="text-xs font-medium px-2 pt-1 pb-0.5 text-slate-500">Map Theme</h3>
          <div className="flex flex-col">
            <label className="flex items-center gap-2 cursor-pointer px-2 h-8 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="theme"
                value="whiteMap"
                checked={mapTheme === "whiteMap"}
                onChange={() => setMapTheme("whiteMap")}
                className="w-3.5 h-3.5 accent-slate-900"
              />
              <span className="text-xs font-medium text-slate-700">
                Light Mode
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer px-2 h-8 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="theme"
                value="darkMode"
                checked={mapTheme === "darkMode"}
                onChange={() => setMapTheme("darkMode")}
                className="w-3.5 h-3.5 accent-slate-900"
              />
              <span className="text-xs font-medium text-slate-700">
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
      className="fixed left-4 top-4 bottom-4 flex gap-3 z-70"
      onMouseLeave={() => {
        setIsSidebarExpanded(false);
        setActiveTab(null);
      }}
    >
      <div
        onMouseEnter={() => setIsSidebarExpanded(true)}
        className={`bg-white h-full rounded-2xl shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/70 flex flex-col p-2 transition-all duration-300 ${isSidebarExpanded ? "w-60" : "w-14"}`}
      >
        <div className="flex items-center h-9 mb-1 shrink-0">
          <div
            className="w-10 h-9 flex items-center justify-center shrink-0 cursor-pointer rounded-lg hover:bg-slate-100"
            onClick={() => setIsSidebarExpanded((prev) => !prev)}
          >
            <Menu className="size-4.5 text-slate-700" />
          </div>
          <div
            className={`relative ml-2 h-6 w-24 transition-opacity ${isSidebarExpanded ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src="/velora.png"
              alt="Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {[
            { id: "search", icon: Search, label: "Search" },
            { id: "stats", icon: BarChart3, label: "Stats" },
            { id: "results", icon: TrendingUp, label: "Results" },
            { id: "download", icon: Download, label: "Download" },
          ].map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setActiveTab(item.id)}
              className={`flex items-center h-9 rounded-lg cursor-pointer group shrink-0 ${activeTab === item.id ? "bg-slate-100" : "hover:bg-slate-50"}`}
            >
              <div className="w-10 h-9 flex items-center justify-center shrink-0">
                <item.icon className="size-4.5 text-slate-700" />
              </div>
              <span
                className={`whitespace-nowrap font-medium text-slate-700 text-sm transition-all ${isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"}`}
              >
                {item.label}
              </span>
            </div>
          ))}

          <div className="w-full my-1 shrink-0">
            <hr className="border-slate-100 mb-1" />
            <div className="flex items-center h-9 w-full">
              {/* Replaced optimization icon logic with optimization.svg */}
              <div className="w-10 h-9 flex items-center justify-center shrink-0 relative">
                <div className="relative size-4.5">
                  <Image
                    src="/optimized.svg"
                    alt="Optimization"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <div
                className={`border rounded-lg transition-all whitespace-nowrap overflow-hidden ${isSidebarExpanded ? "opacity-100 w-full p-0.5 mr-1" : "opacity-0 w-0 pointer-events-none"} ${isOptimized ? "border-green-500 bg-green-50" : "border-transparent"}`}
              >
                <button
                  id="optimize-trigger"
                  disabled={!canOptimize || isProcessing}
                  onClick={() => runOptimization()}
                  className={`h-7 rounded-md text-xs font-medium transition-all whitespace-nowrap overflow-hidden cursor-pointer flex items-center justify-center gap-1.5
    ${
      isOptimized
        ? "bg-green-500 text-white hover:bg-green-600"
        : "bg-slate-900 text-white hover:bg-slate-800"
    }
    ${!canOptimize || isProcessing ? "opacity-50 cursor-not-allowed" : ""}
    ${isSidebarExpanded ? "opacity-100 w-full px-2" : "opacity-0 w-0 pointer-events-none"}
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
            <hr className="border-slate-100 mt-1" />
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
            ...(isAdmin ? [{ id: "users", icon: Users, l: "User accounts" }] : []),
            { id: "log out", icon: LogOut, l: user ? `Log out (${user.username})` : "Log out" },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.id === "help") {
                  router.push("/visualiser/help");
                } else if (item.id === "users") {
                  router.push("/admin");
                } else if (item.id === "log out") {
                  logout.mutate(undefined, { onSettled: () => router.replace("/login") });
                }
              }}
              onMouseEnter={() => setActiveTab(item.id)}
              className={`flex items-center h-9 rounded-lg cursor-pointer group shrink-0 ${activeTab === item.id ? "bg-slate-100" : "hover:bg-slate-50"}`}
            >
              <div className="w-10 h-9 flex items-center justify-center shrink-0">
                <item.icon className="size-4.5 text-slate-700" />
              </div>
              <span
                className={`whitespace-nowrap font-medium text-slate-700 text-sm transition-all ${isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`}
              >
                {item.l}
              </span>
            </div>
          ))}
        </div>

        <div
          className={`shrink-0 ${isSidebarExpanded ? "p-2 bg-slate-50 rounded-xl border border-slate-100" : "py-px"}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div
            className={`flex cursor-pointer ${isSidebarExpanded ? "items-center justify-center bg-white h-9 rounded-lg mb-2 border border-slate-100" : "items-center justify-center w-10 h-9"}`}
          >
            <FileSpreadsheet
              className={`size-4.5 ${
                isSidebarExpanded ? "text-green-600" : "text-slate-700"
              } ${isDragging ? "animate-bounce" : ""}`}
            />
          </div>
          {isSidebarExpanded && (
            <div className="text-center">
              <p className="text-2xs text-slate-500 mb-2">
                {isDragging ? "Drop file here" : "Drag and drop or"}
                <br />
                {!isDragging && "select an excel file."}
              </p>
              <div className="relative">
                <button className="bg-slate-900 text-white text-xs h-7 w-full rounded-lg font-medium flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Select a file
                </button>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={onFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-2xs text-slate-400 mt-2 mb-1">or load a demo test case</p>
              <div className="grid grid-cols-4 gap-1">
                {DEMO_DATASETS.map((demo) => {
                  const loaded = uploadedFile?.name === demo.file;
                  return (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => handleDemo(demo)}
                      disabled={loadingDemo !== null}
                      title={`${demo.note}: ${demo.employees} employees, ${demo.vehicles} vehicles`}
                      aria-pressed={loaded}
                      className={`h-6 rounded-md border text-2xs font-semibold flex items-center justify-center cursor-pointer transition-colors disabled:cursor-wait ${
                        loaded
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {loadingDemo === demo.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        demo.label
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab && (
        <div className="mt-12 self-start w-fit bg-white rounded-2xl shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/70 overflow-hidden flex flex-col max-h-[calc(100%-3rem)]">
          <div className="overflow-y-auto flex-1 min-h-0 velora-scroll">
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
