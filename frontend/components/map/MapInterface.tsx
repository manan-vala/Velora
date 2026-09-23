"use client";

import { useState, useMemo, useEffect, useRef, type CSSProperties } from "react";
import { Marker, Popup, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useAppStore } from "@/store/useAppStore";
import { distanceMeters, optimizedVehiclesOf, ROUTE_COLORS } from "@/lib/map/geo";
import { buildJourney } from "@/lib/map/playback";
import { useRoutePlayback } from "@/hooks/useRoutePlayback";
import BaseMap from "./base/BaseMap";
import { EMPLOYEE_LAYER, PlaybackLayers, PointLayers, RouteLayers, VEHICLE_LAYER } from "./base/layers";
import LeftSidebar from "./MapWidgets/LeftSideBar";
import ZoomControls from "./MapWidgets/ZoomControls";
import BottomControlBar from "./MapWidgets/BottomControlBar";
import RoutePlaybackBar from "./MapWidgets/RoutePlaybackBar";
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
  const mapInstance = useAppStore((state) => state.mapInstance);
  const legendsExpanded = useAppStore((state) => state.legendsExpanded);

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

  const center = useMemo(() => {
    if (employees.length > 0)
      return { lat: employees[0].pickup_lat, lng: employees[0].pickup_lng };
    return undefined;
  }, [employees]);

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

  // --- ROUTE PLAYBACK ---
  const routes = useMemo(
    () => optimizedVehiclesOf(optimizationResult),
    [optimizationResult],
  );
  const [playbackVehicleId, setPlaybackVehicleId] = useState<string | null>(
    null,
  );
  const selectedPlaybackId = routes.some(
    (r) => r.vehicle_id === playbackVehicleId,
  )
    ? playbackVehicleId
    : (routes[0]?.vehicle_id ?? null);

  const journey = useMemo(() => {
    const index = routes.findIndex((r) => r.vehicle_id === selectedPlaybackId);
    if (index < 0) return null;
    return buildJourney(
      routes[index],
      ROUTE_COLORS[index % ROUTE_COLORS.length],
      employees,
      vehicles,
    );
  }, [routes, selectedPlaybackId, employees, vehicles]);

  const {
    view: playbackView,
    play,
    pause,
    stop,
    markerRef,
    progressRef,
    distanceRef,
  } = useRoutePlayback(mapInstance, journey);
  const playbackOn = playbackView.status !== "idle" && journey !== null;

  // Employees already in (or dropped by) the vehicle fade out; the next pickup is highlighted
  const { pickedUp, nextPickup } = useMemo(() => {
    const picked = new Set<string>();
    if (!playbackOn || !journey) return { pickedUp: picked, nextPickup: null };
    const reached = playbackView.leg + (playbackView.arrived ? 1 : 0);
    journey.legs.slice(0, reached).forEach((leg) => {
      if (leg.kind === "pickup") picked.add(leg.to);
    });
    const current = journey.legs[playbackView.leg];
    const next =
      !playbackView.arrived && current?.kind === "pickup" ? current.to : null;
    return { pickedUp: picked, nextPickup: next };
  }, [playbackOn, journey, playbackView.leg, playbackView.arrived]);

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
            active:
              emp.employee_id === clickedEmployeeId ||
              emp.employee_id === nextPickup,
            muted: pickedUp.has(emp.employee_id),
          }))
        : [],
    [employees, layers.employees, clickedEmployeeId, nextPickup, pickedUp],
  );
  const vehiclePoints = useMemo(
    () =>
      layers.vehicles
        ? vehicles
            // The vehicle being played back is drawn by its own moving marker
            .filter(
              (veh) => !(playbackOn && veh.vehicle_id === journey?.vehicleId),
            )
            .map((veh) => ({
              id: veh.vehicle_id,
              lat: veh.current_lat,
              lng: veh.current_lng,
              active: veh.vehicle_id === activeVehicleId, // Highlight if active in stats
            }))
        : [],
    [vehicles, layers.vehicles, activeVehicleId, playbackOn, journey],
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
          />
          {layers.routes && routes.length > 0 && (
            <RouteLayers
              vehicles={routes}
              activeVehicleId={activeVehicleId}
              excludeVehicleId={playbackOn ? journey?.vehicleId : null}
              dimmed={playbackOn}
            />
          )}
          {playbackOn && journey && (
            <PlaybackLayers
              journey={journey}
              done={playbackView.done}
              head={playbackView.head}
            />
          )}
          {playbackOn && journey && playbackView.position && (
            <Marker
              ref={markerRef}
              longitude={playbackView.position.lng}
              latitude={playbackView.position.lat}
              anchor="center"
            >
              <div
                className="velora-vehicle-dot"
                style={{ "--dot": journey.color } as CSSProperties}
                data-moving={playbackView.status === "playing"}
                title={journey.vehicleId}
              >
                <Car className="w-3 h-3" strokeWidth={2.75} />
              </div>
            </Marker>
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

          {routes.length > 0 && (
            <RoutePlaybackBar
              routes={routes}
              selectedId={selectedPlaybackId}
              onSelect={setPlaybackVehicleId}
              journey={journey}
              view={playbackView}
              onPlay={play}
              onPause={pause}
              onStop={stop}
              progressRef={progressRef}
              distanceRef={distanceRef}
              lifted={legendsExpanded}
            />
          )}

          <ZoomControls />
        </>
      )}
    </div>
  );
}
