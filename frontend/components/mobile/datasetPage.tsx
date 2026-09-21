import React from "react";
import { useMobileStore } from "@/store/useMobileStore";
import MobileHeader from "./MapWidgets/header";
import UserCard from "./MapWidgets/user";
import MobileBottomNav from "./MapWidgets/bottomnav";
import EmployeeCard from "./DatasetWidgets/employeeCard";
import VehicleCard from "./DatasetWidgets/vehcileCard";
import { OptimizedRoute, OptimizationResult, RouteStep } from "@/types";

export default function MobileDatasetPage() {
  const data = useMobileStore((s) => s.parsedData);
  const optimizationResult = useMobileStore((s) => s.optimizationResult);
  
  const [listType, setListType] = React.useState<"employees" | "vehicles">("employees");
  const [showUserCard, setShowUserCard] = React.useState(false);

  const optimizedVehicles: OptimizedRoute[] =
    optimizationResult?.data?.vehicles ||
    (optimizationResult as unknown as OptimizationResult)?.vehicles ||
    [];

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-50">
        <MobileHeader onAvatarClick={() => setShowUserCard(true)} />
      </div>

      {/* UserCard Overlay - match map view positioning */}
      {showUserCard && (
        <div className="absolute right-2 sm:right-6 top-24 sm:top-28 z-50">
          <div className="relative">
            <button
              className="absolute -top-3 -right-3 bg-white rounded-full shadow p-1 text-xl z-10 border border-gray-200"
              onClick={() => setShowUserCard(false)}
              aria-label="Close user card"
            >
              ×
            </button>
            <UserCard setShowUserCard={setShowUserCard} />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center py-6 sm:py-8 overflow-hidden relative z-10 px-2">
        
        {/* Employees/Vehicles toggle button */}
        <div className="bg-slate-100 p-1 rounded-2xl flex mb-4 sm:mb-6 mt-34 sm:mt-38 w-full max-w-md mx-2">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${listType === "employees" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
            onClick={() => setListType("employees")}
          >
            Employees
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${listType === "vehicles" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
            onClick={() => setListType("vehicles")}
          >
            Vehicles
          </button>
        </div>

        {/* List rendering */}
        {listType === "employees" ? (
          data && data.employees && data.employees.length > 0 ? (
            <div className="flex flex-col items-center gap-4 w-full max-w-md px-2 overflow-y-auto mt-0" style={{ maxHeight: "62.5vh" }}>
              {data.employees.map((emp, idx) => {
                const empId = emp.employee_id ? String(emp.employee_id) : `E${idx+1}`;
                let assignedVehicle = "Not Assigned";
                
                if (optimizedVehicles.length > 0) {
                  for (const veh of optimizedVehicles) {
                    if (veh.route_sequence && Array.isArray(veh.route_sequence)) {
                      if (veh.route_sequence.some((seq: RouteStep) => seq.location === empId)) {
                        assignedVehicle = veh.vehicle_id;
                        break;
                      }
                    }
                  }
                }

                return (
                  <EmployeeCard
                    key={idx}
                    name={String(emp.name ?? "Unknown")}
                    priority={String(emp.priority ?? "Medium")}
                    employeeId={empId}
                    pickupLocation={
                      typeof emp.pickup_lat === "number" && typeof emp.pickup_lng === "number"
                        ? `${emp.pickup_lat.toFixed(4)}, ${emp.pickup_lng.toFixed(4)}`
                        : "N/A"
                    }
                    dropOffLocation={
                      typeof emp.drop_lat === "number" && typeof emp.drop_lng === "number"
                        ? `${emp.drop_lat.toFixed(4)}, ${emp.drop_lng.toFixed(4)}`
                        : "N/A"
                    }
                    allotedVehicle={assignedVehicle}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 text-center text-base font-medium">
              No employee data found. Please upload a dataset first.
            </div>
          )
        ) : (
          optimizedVehicles.length > 0 ? (
            <div className="flex flex-col items-center gap-4 w-full max-w-md px-2 overflow-y-auto mt-0" style={{ maxHeight: "62.5vh" }}>
              {optimizedVehicles.map((veh: OptimizedRoute, idx: number) => {
                let assignedEmployees: string[] = [];
                
                if (veh.route_sequence && Array.isArray(veh.route_sequence)) {
                  assignedEmployees = veh.route_sequence
                    .filter((seq: RouteStep) => seq.location !== "office" && seq.location !== veh.vehicle_id)
                    .map((seq: RouteStep) => (seq.location.startsWith("E") ? seq.location : `E${seq.location}`));
                }
                
                return (
                  <VehicleCard
                    key={idx}
                    vehicle_id={typeof veh.vehicle_id === "string" ? veh.vehicle_id : `Vehicle ${idx+1}`}
                    vehicle_type={typeof veh.vehicle_type === "string" ? veh.vehicle_type : "Standard Vehicle"}
                    capacity={typeof veh.capacity === "number" ? veh.capacity : 0}
                    assigned_to={assignedEmployees.length > 0 ? assignedEmployees : "Not Assigned"}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 text-center text-base font-medium flex flex-col items-center gap-2 mt-10">
              <p>No vehicle assignments yet.</p>
              <p className="text-sm">Run an optimization on the map to see assigned vehicles.</p>
            </div>
          )
        )}

        <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-20 w-full max-w-107.5 px-2 pointer-events-auto">
          <MobileBottomNav
            setShowSearchBar={() => {}}
            setShowResult={() => {}}
            setShowStats={() => {}}
            setShowMore={() => {}}
          />
        </div>
      </div>
    </>
  );
}