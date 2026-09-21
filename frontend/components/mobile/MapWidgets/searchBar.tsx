import React, { useState, useMemo, useRef } from "react";
import { useMobileStore } from "@/store/useMobileStore";

type SearchBarProps = {
  setShowSearchBar: (show: boolean) => void;
};

export default function SearchBar({ setShowSearchBar }: SearchBarProps) {
  const parsedData = useMobileStore((state) => state.parsedData);
  const selectVehicle = useMobileStore((state) => state.selectVehicle);
  const selectEmployee = useMobileStore((state) => state.selectEmployee);
  const setMapFocus = useMobileStore((state) => state.setMapFocus);

  const mapRef = useRef<google.maps.Map | null>(null);

  const [searchType, setSearchType] = useState<"employees" | "vehicles">(
    "vehicles",
  );
  const [searchTerm, setSearchTerm] = useState("");

  const [highlightId, setHighlightId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const employees = parsedData?.employees || [];
    const vehicles = parsedData?.vehicles || [];
    const term = searchTerm.toLowerCase();
    if (searchType === "employees") {
      return employees.filter(
        (e) =>
          typeof e.employee_id === "string" &&
          e.employee_id.toLowerCase().includes(term),
      );
    } else {
      return vehicles.filter(
        (v) =>
          typeof v.vehicle_id === "string" &&
          v.vehicle_id.toLowerCase().includes(term),
      );
    }
  }, [searchType, searchTerm, parsedData]);

  const handleLocate = (
    type: "employee" | "vehicle",
    id: string,
    lat: number,
    lng: number,
  ) => {
    if (type === "vehicle") {
      selectVehicle(id);
    } else {
      selectEmployee(id);
    }
    setMapFocus({ lat, lng, zoom: 17 });
  };

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-[95px] sm:bottom-[110px] md:bottom-[116px] md:landscape:bottom-[104px] z-[60] 
        w-[calc(100%-1rem)] max-w-[402px] md:max-w-[500px] h-[calc(100vh-140px)] max-h-[610px] md:max-h-[700px] 
        p-4 sm:p-7 md:p-8 bg-white rounded-2xl shadow-lg flex flex-col overflow-y-hidden"
      >
         <button
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] hover:bg-[#e0e0e0] border border-[#d6d6d6] text-black text-xl font-bold z-10"
          onClick={() => setShowSearchBar(false)}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg sm:text-xl text-[#000000] font-bold mb-4 sm:mb-5 px-1">
          Search Type
        </h2>
        <div className="bg-slate-100 p-1 rounded-2xl flex mb-6">
          <button
            onClick={() => setSearchType("employees")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${searchType === "employees" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
          >
            {/* Icon can be added here */} Employees
          </button>
          <button
            onClick={() => setSearchType("vehicles")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${searchType === "vehicles" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
          >
            {/* Icon can be added here */} Vehicles
          </button>
        </div>
        <div className="border border-slate-100 rounded-[28px] overflow-y-hidden p-2 sm:p-3 bg-white h-[calc(100%-140px)]">
          <input
            type="text"
            placeholder={`Search ${searchType === "employees" ? "Employee" : "Vehicle"}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-[#8F8F8F] bg-slate-50 border border-slate-100 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 mb-4 sm:mb-6 text-sm outline-none"
          />
          <div className="flex flex-col gap-3 sm:gap-4 max-h-[calc(100%-80px)] overflow-y-auto pr-1">
            {filteredItems.map((item, idx) => {
              const id =
                searchType === "employees" ? item.employee_id : item.vehicle_id;
              const color =
                searchType === "employees" ? "bg-blue-600" : "bg-green-500";
              const idStr = typeof id === "string" ? id : String(id ?? "");
              const isLast = idx === filteredItems.length - 1;
              return (
                <div
                  key={idStr}
                  className={`flex items-center justify-between${isLast ? " mb-8" : ""}`}
                >
                  <span className="font-bold text-slate-700">{idStr}</span>
                  <button
                    onClick={() => {
                      if (searchType === "employees") {
                        handleLocate(
                          "employee",
                          idStr,
                          typeof item.pickup_lat === "number"
                            ? item.pickup_lat
                            : 0,
                          typeof item.pickup_lng === "number"
                            ? item.pickup_lng
                            : 0,
                        );
                        if (
                          window.google &&
                          window.google.maps &&
                          mapRef.current
                        ) {
                          mapRef.current.panTo({
                            lat:
                              typeof item.pickup_lat === "number"
                                ? item.pickup_lat
                                : 0,
                            lng:
                              typeof item.pickup_lng === "number"
                                ? item.pickup_lng
                                : 0,
                          });
                          mapRef.current.setZoom(17);
                        }
                      } else {
                        handleLocate(
                          "vehicle",
                          idStr,
                          typeof item.current_lat === "number"
                            ? item.current_lat
                            : 0,
                          typeof item.current_lng === "number"
                            ? item.current_lng
                            : 0,
                        );
                        if (
                          window.google &&
                          window.google.maps &&
                          mapRef.current
                        ) {
                          mapRef.current.panTo({
                            lat:
                              typeof item.current_lat === "number"
                                ? item.current_lat
                                : 0,
                            lng:
                              typeof item.current_lng === "number"
                                ? item.current_lng
                                : 0,
                          });
                          mapRef.current.setZoom(17);
                        }
                      }
                      setShowSearchBar(false);
                      setHighlightId(idStr);
                      setTimeout(() => setHighlightId(null), 1200);
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
    </>
  );
}
