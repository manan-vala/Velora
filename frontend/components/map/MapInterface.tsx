"use client";

import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { Employee, Vehicle } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { whiteMap, darkMode } from "./Mapthemes";
import { decodePolyline } from "@/lib/map-utils";
// Import new components
import LeftSidebar from "./MapWidgets/LeftSideBar";
import ZoomControls from "./MapWidgets/ZoomControls";
import BottomControlBar from "./MapWidgets/BottomControlBar";
import VehicleListPanel from "./MapWidgets/VehicleListPanel";
import TaxiMeter from "./TaxiMeter";
import { Car, User, Users, Gauge, Star, Tag } from "lucide-react";

// Keep styles and Meter inside or import them if you want further separation

const containerStyle = { width: "100%", height: "100%" };

interface MapInterfaceProps {
  isMobileView?: boolean;
}

export default function MapInterface({
  isMobileView = false,
}: MapInterfaceProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // 1. ZUSTAND STORE HOOKS
  const parsedData = useAppStore((state) => state.parsedData);
  const layers = useAppStore((state) => state.layers);
  const mapFocus = useAppStore((state) => state.mapFocus);
  const setMapFocus = useAppStore((state) => state.setMapFocus);
  const optimizationResult = useAppStore((state) => state.optimizationResult);

  const setMapInstance = useAppStore((state) => state.setMapInstance);

  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);

  const activeVehicleId = useAppStore((state) => state.activeVehicleId);
  const activeEmployeeId = useAppStore((state) => state.activeEmployeeId);

  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const selectVehicle = useAppStore((state) => state.selectVehicle);
  const selectEmployee = useAppStore((state) => state.selectEmployee);
  const mapTheme = useAppStore((state) => state.mapTheme);
  const triggerSimulation = useAppStore((state) => state.triggerSimulation);

  // Local State for InfoWindows (Decoupled from global active selection for routes)
  const [clickedVehicleId, setClickedVehicleId] = useState<string | null>(null);
  const [clickedEmployeeId, setClickedEmployeeId] = useState<string | null>(
    null,
  );

  // Derived Data
  const employees = useMemo(
    () => parsedData?.employees || [],
    [parsedData?.employees],
  );
  const vehicles = parsedData?.vehicles || [];

  // Simulation state — driven by precomputed backend route_geometry
  const [simPath, setSimPath] = useState<{ lat: number; lng: number }[] | null>(
    null,
  );
  const [movingTaxiPos, setMovingTaxiPos] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [simStats, setSimStats] = useState({ distance: 0, time: 0 });
  const [isSimulating, setIsSimulating] = useState(false);

  const currentMapStyles = useMemo(() => {
    switch (mapTheme) {
      case "darkMode":
        return darkMode;
      case "whiteMap":
      default:
        return whiteMap;
    }
  }, [mapTheme]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      heading: 0,
      tilt: 0,
      gestureHandling: "greedy",
      styles: currentMapStyles,
    }),
    [currentMapStyles],
  );

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY || "",
    libraries: ["places", "geometry"],
  });

  const center = useMemo(() => {
    if (employees.length > 0)
      return { lat: employees[0].pickup_lat, lng: employees[0].pickup_lng };
    return { lat: 12.9716, lng: 77.5946 };
  }, [employees]);

  // Simulation animation loop — animates taxi along precomputed simPath
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.google ||
      !simPath ||
      simPath.length < 2 ||
      !isSimulating
    )
      return;

    let currentIndex = 0;
    let totalDist = 0;
    const startTimestamp = Date.now();

    const interval = setInterval(() => {
      if (currentIndex >= simPath.length - 1) {
        clearInterval(interval);
        setIsSimulating(false);
        return;
      }

      const currentPoint = simPath[currentIndex];
      const nextPoint = simPath[currentIndex + 1];
      const stepDist = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(currentPoint.lat, currentPoint.lng),
        new google.maps.LatLng(nextPoint.lat, nextPoint.lng),
      );

      totalDist += stepDist;
      setMovingTaxiPos({ lat: nextPoint.lat, lng: nextPoint.lng });
      setSimStats({
        distance: totalDist,
        time: (Date.now() - startTimestamp) / 1000,
      });

      currentIndex++;
    }, 100);

    return () => clearInterval(interval);
  }, [simPath, isSimulating]);

  // Bug #3 fix: Consume and reset mapFocus so the same location can re-trigger
  useEffect(() => {
    if (mapFocus && mapRef.current) {
      const focus = mapFocus;
      setMapFocus(null); // Reset immediately so same coords can re-trigger

      const map = mapRef.current;
      const targetPos = { lat: focus.lat, lng: focus.lng };
      const targetZoom = 17;
      const startPos = map.getCenter();
      const endPos = new google.maps.LatLng(targetPos);
      const currentZoom = map.getZoom() || 13;
      const panDelay = 1000;

      if (!startPos) return;

      // Calculate distance to decide animation style
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        startPos,
        endPos,
      );

      // A. If close (< 500m), just pan and smooth zoom
      if (distance < 500) {
        map.panTo(targetPos);
        if (currentZoom < targetZoom) {
          setTimeout(() => smoothZoom(map, targetZoom, currentZoom), 300);
        }
        return;
      }

      // B. "Fly To" Effect (Zoom Out -> Pan -> Zoom In)
      const flyOutZoom = Math.min(currentZoom, 12);

      // 1. Zoom Out
      map.setZoom(flyOutZoom);

      // 2. Pan (wait a tiny bit)
      setTimeout(() => {
        map.panTo(targetPos);

        // 3. Zoom In (after pan finishes)
        setTimeout(() => {
          smoothZoom(map, targetZoom, flyOutZoom);
          setZoom(targetZoom);
        }, panDelay);
      }, 600);
    }
  }, [mapFocus]);

  // Bug #5 fix: Consume and reset simulationTargetId
  // Bug #4 fix: Use precomputed backend route_geometry instead of Google Directions API
  const simulationTargetId = useAppStore((state) => state.simulationTargetId);

  useEffect(() => {
    if (!simulationTargetId) return;

    // Consume and reset so the same vehicle can re-trigger
    const targetId = simulationTargetId;
    triggerSimulation(null);

    // Simulation only available post-optimization
    if (!optimizationResult) return;

    const optimizedVehicle = optimizationResult.vehicles.find(
      (v) => v.vehicle_id === targetId,
    );
    if (!optimizedVehicle) return;

    // Decode the precomputed backend geometry into a LatLng path
    const path = optimizedVehicle.route_geometry.flatMap((seg) =>
      decodePolyline(seg.geometry),
    );
    if (path.length < 2) return;

    // Reset sim state and start
    setSimStats({ distance: 0, time: 0 });
    setMovingTaxiPos(null);
    setSimPath(path);
    setIsSimulating(true);
  }, [simulationTargetId]);

  // Custom Smooth Zoom Function using requestAnimationFrame
  const smoothZoom = (
    map: google.maps.Map,
    targetZoom: number,
    currentZoom: number,
  ) => {
    if (currentZoom >= targetZoom) return; // Stop if reached target

    const step = () => {
      const zoom = map.getZoom();
      if (!zoom) return;

      if (zoom < targetZoom) {
        // Increment by a small amount - Adjust this value for speed
        const nextZoom = Math.min(zoom + 0.5, targetZoom); // Increased speed for reliability
        map.setZoom(nextZoom);
        if (nextZoom < targetZoom) {
          requestAnimationFrame(step);
        }
      }
    };
    requestAnimationFrame(step);
  };

  // --- OPTIMIZED ROUTES: Raw Google Maps Polylines ---
  // Bypasses the @react-google-maps/api <Polyline> component which has
  // unreliable unmount cleanup. We manage polylines directly.
  const ROUTE_COLORS = [
    "#2563EB",
    "#16A34A",
    "#9333EA",
    "#EA580C",
    "#DC2626",
    "#0D9488",
  ];

  useEffect(() => {
    // Clean up any existing polylines first
    polylinesRef.current.forEach((p) => {
      p.setMap(null);
    });
    polylinesRef.current = [];

    // Only create new polylines if routes are visible AND we have data AND the map is ready
    if (!layers.routes || !optimizationResult || !mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const newPolylines: google.maps.Polyline[] = [];

    optimizationResult.vehicles.forEach((vehicle, index) => {
      if (activeVehicleId && vehicle.vehicle_id !== activeVehicleId) {
        return;
      }

      const fullPath = vehicle.route_geometry.flatMap((segment) =>
        decodePolyline(segment.geometry),
      );
      const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

      const polyline = new google.maps.Polyline({
        path: fullPath,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 5,
        geodesic: true,
        map: map,
      });
      newPolylines.push(polyline);
    });

    polylinesRef.current = newPolylines;

    // Cleanup on unmount or when dependencies change
    return () => {
      newPolylines.forEach((p) => p.setMap(null));
    };
  }, [layers.routes, optimizationResult, activeVehicleId]);

  if (!isLoaded)
    return (
      <div className="h-150 flex items-center justify-center bg-slate-50 font-medium text-slate-400">
        Initializing Systems...
      </div>
    );

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden font-sans">
      {/* --- LAYER 1: THE MAP --- */}
      <div className="absolute inset-0 z-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={(map) => {
            mapRef.current = map;
            setMapInstance(map);
          }}
          onZoomChanged={() => {
            if (mapRef.current) {
              setZoom(mapRef.current.getZoom() || 13);
            }
          }}
          options={mapOptions}
        >
          {/* Optimized Routes are rendered via useEffect (raw google.maps.Polyline) */}

          {/* Simulation Taxi */}
          {movingTaxiPos && layers.vehicles && (
            <Marker
              position={movingTaxiPos}
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE,
                scale: Math.max(8, zoom / 1.5), // Dynamic scale
                fillColor: "#F59E0B",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white",
              }}
              zIndex={100} // Ensure it's on top
            />
          )}

          {/* Static Vehicles */}
          {layers.vehicles &&
            vehicles.map((veh) => (
              <Marker
                key={veh.vehicle_id}
                position={{ lat: veh.current_lat, lng: veh.current_lng }}
                onClick={() => {
                  setClickedVehicleId(veh.vehicle_id);
                }}
                icon={{
                  path: window.google?.maps?.SymbolPath?.CIRCLE,
                  scale:
                    activeVehicleId === veh.vehicle_id
                      ? 12
                      : Math.max(6, zoom / 2), // Highlight if active in stats
                  fillColor: "#10B981",
                  fillOpacity: 1,
                  strokeWeight: activeVehicleId === veh.vehicle_id ? 4 : 2,
                  strokeColor: "white",
                }}
                zIndex={activeVehicleId === veh.vehicle_id ? 100 : 50}
              />
            ))}

          {/* Vehicle InfoWindow (Independent of Stats Menu filtering) */}
          {(() => {
            const popupVehicle = clickedVehicleId
              ? vehicles.find((v) => v.vehicle_id === clickedVehicleId)
              : null;
            return (
              popupVehicle && (
                <InfoWindow
                  position={{
                    lat: popupVehicle.current_lat,
                    lng: popupVehicle.current_lng,
                  }}
                  onCloseClick={() => setClickedVehicleId(null)}
                >
                  <div className="flex flex-col gap-3 min-w-[200px] p-1 font-sans">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-none">
                          {popupVehicle.vehicle_id}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium">
                          Vehicle Details
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Tag className="w-4 h-4" /> Type
                        </span>
                        <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          {popupVehicle.vehicle_type}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Users className="w-4 h-4" /> Capacity
                        </span>
                        <span className="font-semibold text-slate-700">
                          {popupVehicle.capacity} seats
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Gauge className="w-4 h-4" /> Speed
                        </span>
                        <span className="font-semibold text-slate-700">
                          {popupVehicle.avg_speed_kmph} km/h
                        </span>
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )
            );
          })()}

          {/* Employee Markers */}
          {layers.employees &&
            employees.map((emp) => {
              const isActive = emp.employee_id === clickedEmployeeId;
              return (
                <Fragment key={emp.employee_id}>
                  <Marker
                    position={{ lat: emp.pickup_lat, lng: emp.pickup_lng }}
                    onClick={() => setClickedEmployeeId(emp.employee_id)}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.CIRCLE,
                      scale: isActive ? 12 : Math.max(6, zoom / 2),
                      fillColor: "#3B82F6",
                      fillOpacity: 1,
                      strokeWeight: isActive ? 4 : 2,
                      strokeColor: "white",
                    }}
                    zIndex={isActive ? 100 : 40}
                  />
                  {isActive && (
                    <InfoWindow
                      position={{ lat: emp.pickup_lat, lng: emp.pickup_lng }}
                      onCloseClick={() => setClickedEmployeeId(null)}
                    >
                      <div className="flex flex-col gap-3 min-w-[200px] p-1 font-sans">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shadow-sm">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm leading-none">
                              {emp.employee_id}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 font-medium">
                              Employee Info
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2.5 mt-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Star className="w-4 h-4" /> Priority
                            </span>
                            <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                              {emp.priority}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Car className="w-4 h-4" /> Preference
                            </span>
                            <span className="font-semibold text-slate-700 capitalize">
                              {String(emp.vehicle_preference).toLowerCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Users className="w-4 h-4" /> Sharing
                            </span>
                            <span className="font-semibold text-slate-700 capitalize">
                              {String(emp.sharing_preference).toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Fragment>
              );
            })}

          {/* Office/Drop-off Markers */}
          {layers.office &&
            employees.map((emp) => (
              <Marker
                key={`office-${emp.employee_id}`}
                position={{ lat: emp.drop_lat, lng: emp.drop_lng }}
                icon={{
                  path: window.google?.maps?.SymbolPath?.CIRCLE,
                  scale: Math.max(10, zoom / 1.2), // Dynamic scale
                  fillColor: "#EF4444",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "white",
                }}
                zIndex={30}
              />
            ))}
        </GoogleMap>
      </div>

      {/* --- LAYER 2: UI OVERLAYS --- */}

      {!isMobileView && (
        <>
          <LeftSidebar />

          {/* <VehicleListPanel /> */}

          <BottomControlBar />

          {isSimulating && (
            <div className="absolute top-24 right-6 z-30">
              <TaxiMeter distance={simStats.distance} time={simStats.time} />
            </div>
          )}

          <ZoomControls />
        </>
      )}
    </div>
  );
}
