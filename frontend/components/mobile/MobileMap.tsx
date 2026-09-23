"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";

import BaseMap from "@/components/map/base/BaseMap";
import { PointLayers, RouteLayers } from "@/components/map/base/layers";
import { optimizedVehiclesOf } from "@/lib/map/geo";
import { useMobileStore } from "@/store/useMobileStore";

export default function MobileMap() {
  const parsedData = useMobileStore((state) => state.parsedData);
  const layers = useMobileStore((state) => state.layers);
  const setMapInstance = useMobileStore((state) => state.setMapInstance);
  const setZoom = useMobileStore((state) => state.setZoom);
  const activeVehicleId = useMobileStore((state) => state.activeVehicleId);
  const activeEmployeeId = useMobileStore((state) => state.activeEmployeeId);
  const mapFocus = useMobileStore((state) => state.mapFocus);
  const mapTheme = useMobileStore((state) => state.mapTheme);
  const optimizationResult = useMobileStore((state) => state.optimizationResult);

  const mapRef = useRef<MaplibreMap | null>(null);

  const employees = useMemo(() => parsedData?.employees || [], [parsedData]);
  const vehicles = useMemo(() => parsedData?.vehicles || [], [parsedData]);
  const routes = useMemo(() => optimizedVehiclesOf(optimizationResult), [optimizationResult]);

  const center = useMemo(() => {
    if (employees.length > 0)
      return { lat: employees[0].pickup_lat, lng: employees[0].pickup_lng };
    return undefined;
  }, [employees]);

  useEffect(() => {
    if (mapRef.current && mapFocus) {
      mapRef.current.flyTo({
        center: { lat: mapFocus.lat, lng: mapFocus.lng },
        zoom: mapFocus.zoom,
        duration: 800,
      });
    }
  }, [mapFocus]);

  const officePoints = useMemo(
    () =>
      layers.office
        ? employees.map((emp) => ({ id: `office-${emp.employee_id}`, lat: emp.drop_lat, lng: emp.drop_lng }))
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
            active: emp.employee_id === activeEmployeeId,
          }))
        : [],
    [employees, layers.employees, activeEmployeeId],
  );
  const vehiclePoints = useMemo(
    () =>
      layers.vehicles
        ? vehicles.map((veh) => ({
            id: veh.vehicle_id,
            lat: veh.current_lat,
            lng: veh.current_lng,
            active: veh.vehicle_id === activeVehicleId,
          }))
        : [],
    [vehicles, layers.vehicles, activeVehicleId],
  );

  return (
    <BaseMap
      theme={mapTheme}
      center={center}
      onReady={(map) => {
        mapRef.current = map;
        setMapInstance(map);
      }}
      onZoomEnd={setZoom}
    >
      <PointLayers offices={officePoints} employees={employeePoints} vehicles={vehiclePoints} />
      {layers.routes && routes.length > 0 && <RouteLayers vehicles={routes} />}
    </BaseMap>
  );
}
