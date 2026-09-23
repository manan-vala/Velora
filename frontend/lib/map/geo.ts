import type { FeatureCollection, LineString, Point } from "geojson";
import type { Map as MaplibreMap } from "maplibre-gl";

import { decodePolyline } from "@/lib/map-utils";
import type { Employee, OptimizedRoute, Vehicle } from "@/types";

export interface LatLng {
  lat: number;
  lng: number;
}

export type LngLatBounds = [[number, number], [number, number]];

export const BANGALORE: LatLng = { lat: 12.9716, lng: 77.5946 };

export const ROUTE_COLORS = ["#2563EB", "#16A34A", "#9333EA", "#EA580C", "#DC2626", "#0D9488"];

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle (haversine) distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Box around the office, every pickup and every vehicle; null when there's nothing to show. */
export function boundsOf(employees: Employee[], vehicles: Vehicle[]): LngLatBounds | null {
  const points: LatLng[] = [];
  if (employees.length > 0) points.push({ lat: employees[0].drop_lat, lng: employees[0].drop_lng });
  for (const e of employees) points.push({ lat: e.pickup_lat, lng: e.pickup_lng });
  for (const v of vehicles) points.push({ lat: v.current_lat, lng: v.current_lng });

  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return null;

  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const p of valid) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

/**
 * The vehicle routes of an optimisation result. The backend returns them at the top
 * level; the mobile store has also held them wrapped in `data`, so accept both.
 */
export function optimizedVehiclesOf(result: unknown): OptimizedRoute[] {
  if (!result || typeof result !== "object") return [];
  const r = result as { vehicles?: unknown; data?: { vehicles?: unknown } };
  const vehicles = r.vehicles ?? r.data?.vehicles;
  return Array.isArray(vehicles) ? (vehicles as OptimizedRoute[]) : [];
}

/** The full decoded path a vehicle drives, all segments joined. */
export function routePath(vehicle: OptimizedRoute): LatLng[] {
  if (!Array.isArray(vehicle.route_geometry)) return [];
  return vehicle.route_geometry.flatMap((segment) => decodePolyline(segment.geometry));
}

/**
 * One coloured line per vehicle; colours follow the vehicle's position in the result.
 * `activeVehicleId` keeps only that vehicle, `excludeVehicleId` leaves one out.
 */
export function routesToGeoJSON(
  vehicles: OptimizedRoute[],
  activeVehicleId?: string | null,
  excludeVehicleId?: string | null,
): FeatureCollection<LineString, { vehicleId: string; color: string }> {
  const features = vehicles.flatMap((vehicle, index) => {
    if (activeVehicleId && vehicle.vehicle_id !== activeVehicleId) return [];
    if (excludeVehicleId && vehicle.vehicle_id === excludeVehicleId) return [];
    const path = routePath(vehicle);
    if (path.length < 2) return [];
    return [
      {
        type: "Feature" as const,
        properties: { vehicleId: vehicle.vehicle_id, color: ROUTE_COLORS[index % ROUTE_COLORS.length] },
        geometry: { type: "LineString" as const, coordinates: path.map((p) => [p.lng, p.lat]) },
      },
    ];
  });
  return { type: "FeatureCollection", features };
}

export interface MapPoint extends LatLng {
  id: string;
  active?: boolean;
  /** Drawn faded, e.g. an employee already picked up during route playback. */
  muted?: boolean;
}

export function pointsToGeoJSON(
  points: MapPoint[],
): FeatureCollection<Point, { id: string; active: boolean; muted: boolean }> {
  return {
    type: "FeatureCollection",
    features: points
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({
        type: "Feature" as const,
        properties: { id: p.id, active: Boolean(p.active), muted: Boolean(p.muted) },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
  };
}

/** Frames the office, pickups and vehicles, or Bangalore when there's nothing to frame. */
export function fitMapToData(map: MaplibreMap, employees: Employee[], vehicles: Vehicle[]) {
  const bounds = boundsOf(employees, vehicles);
  if (bounds) {
    map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
  } else {
    map.flyTo({ center: BANGALORE, zoom: 13 });
  }
}
