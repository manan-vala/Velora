"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Popup, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useAppStore } from "@/store/useAppStore";
import { distanceMeters, routePath, type LatLng } from "@/lib/map/geo";
import BaseMap from "./base/BaseMap";
import { EMPLOYEE_LAYER, PointLayers, RouteLayers, VEHICLE_LAYER } from "./base/layers";
import LeftSidebar from "./MapWidgets/LeftSideBar";
import ZoomControls from "./MapWidgets/ZoomControls";
import BottomControlBar from "./MapWidgets/BottomControlBar";
import TaxiMeter from "./TaxiMeter";
import { Car, User, Users, Gauge, Star, Tag } from "lucide-react";

const FOCUS_ZOOM = 17;

interface MapInterfaceProps {
  isMobileView?: boolean;
}

export default function MapInterface({
  isMobileView = false,
}: MapInterfaceProps) {
  const mapRef = useRef<MaplibreMap | null>(null);

  // 1. ZUSTAND STORE HOOKS
  const parsedData = useAppStore((state) => state.parsedData);
  const layers = useAppStore((state) => state.layers);
  const mapFocus = useAppStore((state) => state.mapFocus);
  const setMapFocus = useAppStore((state) => state.setMapFocus);
  const optimizationResult = useAppStore((state) => state.optimizationResult);

  const setMapInstance = useAppStore((state) => state.setMapInstance);
  const setZoom = useAppStore((state) => state.setZoom);

  const activeVehicleId = useAppStore((state) => state.activeVehicleId);
  const mapTheme = useAppStore((state) => state.mapTheme);
  const triggerSimulation = useAppStore((state) => state.triggerSimulation);

  // Local State for popups (Decoupled from global active selection for routes)
  const [clickedVehicleId, setClickedVehicleId] = useState<string | null>(null);
  const [clickedEmployeeId, setClickedEmployeeId] = useState<string | null>(
    null,
  );

  // Derived Data
  const employees = useMemo(
    () => parsedData?.employees || [],
    [parsedData?.employees],
  );
  const vehicles = useMemo(
    () => parsedData?.vehicles || [],
    [parsedData?.vehicles],
  );

  // Simulation state — driven by precomputed backend route_geometry
  const [simPath, setSimPath] = useState<LatLng[] | null>(null);
  const [movingTaxiPos, setMovingTaxiPos] = useState<LatLng | null>(null);
  const [simStats, setSimStats] = useState({ distance: 0, time: 0 });
  const [isSimulating, setIsSimulating] = useState(false);

  const center = useMemo(() => {
    if (employees.length > 0)
      return { lat: employees[0].pickup_lat, lng: employees[0].pickup_lng };
    return undefined;
  }, [employees]);

  // Simulation animation loop — animates taxi along precomputed simPath
  useEffect(() => {
    if (!simPath || simPath.length < 2 || !isSimulating) return;

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

      totalDist += distanceMeters(currentPoint, nextPoint);
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
      const target = { lat: focus.lat, lng: focus.lng };
      const { lat, lng } = map.getCenter();

      // Close by (< 500m): a short glide. Further away: zoom out, pan, zoom back in.
      if (distanceMeters({ lat, lng }, target) < 500) {
        map.easeTo({
          center: target,
          zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
          duration: 600,
        });
      } else {
        map.flyTo({ center: target, zoom: FOCUS_ZOOM, speed: 1.4, curve: 1.5 });
      }
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
    const path = routePath(optimizedVehicle);
    if (path.length < 2) return;

    // Reset sim state and start
    setSimStats({ distance: 0, time: 0 });
    setMovingTaxiPos(null);
    setSimPath(path);
    setIsSimulating(true);
  }, [simulationTargetId]);

  // --- MAP POINTS (GeoJSON circle layers) ---
  const officePoints = useMemo(
    () =>
      layers.office
        ? employees.map((emp) => ({
            id: `office-${emp.employee_id}`,
            lat: emp.drop_lat,
            lng: emp.drop_lng,
          }))
        : [],
    [employees, layers.office],
  );
  const employeePoints = useMemo(
    () =>
      layers.employees
        ? employees.map((emp) => ({
            id: emp.employee_id,
            lat: emp.pickup_lat,
            lng: emp.pickup_lng,
            active: emp.employee_id === clickedEmployeeId,
          }))
        : [],
    [employees, layers.employees, clickedEmployeeId],
  );
  const vehiclePoints = useMemo(
    () =>
      layers.vehicles
        ? vehicles.map((veh) => ({
            id: veh.vehicle_id,
            lat: veh.current_lat,
            lng: veh.current_lng,
            active: veh.vehicle_id === activeVehicleId, // Highlight if active in stats
          }))
        : [],
    [vehicles, layers.vehicles, activeVehicleId],
  );
  const taxiPoint = useMemo(
    () =>
      movingTaxiPos && layers.vehicles ? { id: "taxi", ...movingTaxiPos } : null,
    [movingTaxiPos, layers.vehicles],
  );

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const id = feature?.properties?.id as string | undefined;
    if (feature?.layer.id === VEHICLE_LAYER && id) {
      setClickedVehicleId(id);
    } else if (feature?.layer.id === EMPLOYEE_LAYER && id) {
      setClickedEmployeeId(id);
    } else {
      // A click on empty map closes any open popup
      setClickedVehicleId(null);
      setClickedEmployeeId(null);
    }
  };

  const popupVehicle =
    clickedVehicleId && layers.vehicles
      ? vehicles.find((v) => v.vehicle_id === clickedVehicleId)
      : null;
  const popupEmployee =
    clickedEmployeeId && layers.employees
      ? employees.find((e) => e.employee_id === clickedEmployeeId)
      : null;

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden font-sans">
      {/* --- LAYER 1: THE MAP --- */}
      <div className="absolute inset-0 z-0">
        <BaseMap
          theme={mapTheme === "darkMode" ? "dark" : "light"}
          center={center}
          interactiveLayerIds={[EMPLOYEE_LAYER, VEHICLE_LAYER]}
          onClick={handleMapClick}
          onReady={(map) => {
            mapRef.current = map;
            setMapInstance(map);
          }}
          onZoomEnd={setZoom}
        >
          <PointLayers
            offices={officePoints}
            employees={employeePoints}
            vehicles={vehiclePoints}
            taxi={taxiPoint}
          />
          {layers.routes && optimizationResult && (
            <RouteLayers
              vehicles={optimizationResult.vehicles}
              activeVehicleId={activeVehicleId}
            />
          )}

          {/* Vehicle popup (Independent of Stats Menu filtering) */}
          {popupVehicle && (
            <Popup
              latitude={popupVehicle.current_lat}
              longitude={popupVehicle.current_lng}
              closeOnClick={false}
              onClose={() => setClickedVehicleId(null)}
              offset={16}
              maxWidth="none"
              className="velora-popup"
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
            </Popup>
          )}

          {/* Employee popup */}
          {popupEmployee && (
            <Popup
              latitude={popupEmployee.pickup_lat}
              longitude={popupEmployee.pickup_lng}
              closeOnClick={false}
              onClose={() => setClickedEmployeeId(null)}
              offset={16}
              maxWidth="none"
              className="velora-popup"
            >
              <div className="flex flex-col gap-3 min-w-[200px] p-1 font-sans">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-none">
                      {popupEmployee.employee_id}
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
                      {popupEmployee.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Car className="w-4 h-4" /> Preference
                    </span>
                    <span className="font-semibold text-slate-700 capitalize">
                      {String(popupEmployee.vehicle_preference).toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> Sharing
                    </span>
                    <span className="font-semibold text-slate-700 capitalize">
                      {String(popupEmployee.sharing_preference).toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </BaseMap>
      </div>

      {/* --- LAYER 2: UI OVERLAYS --- */}

      {!isMobileView && (
        <>
          <LeftSidebar />

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
