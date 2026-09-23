import type { FeatureCollection, LineString } from "geojson";

import { decodePolyline } from "@/lib/map-utils";
import { distanceMeters, type LatLng } from "@/lib/map/geo";
import type { Employee, OptimizedRoute, Vehicle } from "@/types";

// ---------------------------------------------------------------------------
// Route playback tuning: tweak these to change how the /visualiser journey plays.
// ---------------------------------------------------------------------------

/**
 * How many times faster than real life the vehicle drives. Each vehicle moves at its own
 * avg_speed_kmph multiplied by this, so 150 means one second on screen covers 2.5 minutes
 * of driving. Higher is faster.
 */
export const PLAYBACK_SPEEDUP = 150;

/** How long the vehicle waits at each pickup and at the office, in milliseconds. */
export const STOP_PAUSE_MS = 900;

/** The shortest time any leg takes on screen, so very short hops are still visible. */
export const MIN_LEG_MS = 700;

/** Time spent speeding up after a stop and slowing down before the next one, in ms. */
export const EASE_MS = 450;

/** Used when a vehicle has no avg_speed_kmph. */
const FALLBACK_SPEED_KMPH = 25;

// ---------------------------------------------------------------------------

export type StopKind = "pickup" | "office" | "stop";

export interface JourneyLeg {
  /** Where this leg ends: an employee id, "office", or another location id. */
  to: string;
  kind: StopKind;
  /** Scheduled arrival (HH:MM) from the optimiser, when it gave one. */
  arrivalTime?: string;
  /** Employees who get out at this stop (office legs only). */
  dropped: string[];
  /** Index into the journey path where this leg starts and ends. */
  startIndex: number;
  endIndex: number;
  /** Metres along the whole journey where this leg starts, and its own length. */
  startDist: number;
  length: number;
  /** How long driving this leg takes on screen. */
  durationMs: number;
}

export interface Journey {
  vehicleId: string;
  color: string;
  /** Every point the vehicle drives through, all legs joined. */
  path: LatLng[];
  /** Metres from the start of the journey to each path point. */
  cumulative: number[];
  total: number;
  legs: JourneyLeg[];
}

/** Known coordinates by location id, the same map the backend builds its segments from. */
export function placesOf(employees: Employee[], vehicles: Vehicle[]): Map<string, LatLng> {
  const places = new Map<string, LatLng>();
  if (employees.length > 0) places.set("office", { lat: employees[0].drop_lat, lng: employees[0].drop_lng });
  for (const v of vehicles) places.set(v.vehicle_id, { lat: v.current_lat, lng: v.current_lng });
  for (const e of employees) places.set(e.employee_id, { lat: e.pickup_lat, lng: e.pickup_lng });
  return places;
}

/** The destination of a "{from}_{to}" segment id; ids can contain underscores, so match known places. */
function segmentTarget(segmentId: string, places: Map<string, LatLng>): string {
  for (let i = 0; i < segmentId.length; i++) {
    if (segmentId[i] === "_" && places.has(segmentId.slice(0, i)) && places.has(segmentId.slice(i + 1))) {
      return segmentId.slice(i + 1);
    }
  }
  return segmentId.slice(segmentId.lastIndexOf("_") + 1);
}

function kindOf(id: string, employeeIds: Set<string>): StopKind {
  if (id.toLowerCase() === "office") return "office";
  return employeeIds.has(id) ? "pickup" : "stop";
}

/**
 * Turns an optimised route into a drivable journey: one leg per route segment, each with its
 * road geometry, length and on-screen duration. A segment the router couldn't draw becomes a
 * straight line between its two stops.
 */
export function buildJourney(
  route: OptimizedRoute,
  color: string,
  employees: Employee[],
  vehicles: Vehicle[],
): Journey | null {
  const places = placesOf(employees, vehicles);
  const employeeIds = new Set(employees.map((e) => e.employee_id));
  const sequence = Array.isArray(route.route_sequence) ? route.route_sequence : [];
  const segments = Array.isArray(route.route_geometry) ? route.route_geometry : [];
  if (segments.length === 0) return null;

  const speedMps = ((Number(route.avg_speed_kmph) || FALLBACK_SPEED_KMPH) * 1000) / 3600;
  const start = places.get(sequence[0]?.location ?? route.vehicle_id);

  const path: LatLng[] = [];
  const cumulative: number[] = [];
  const push = (point: LatLng) => {
    const prev = path[path.length - 1];
    cumulative.push(prev ? cumulative[cumulative.length - 1] + distanceMeters(prev, point) : 0);
    path.push(point);
  };

  const legs: JourneyLeg[] = [];
  let onboard: string[] = [];

  segments.forEach((segment, i) => {
    const to = sequence[i + 1]?.location ?? segmentTarget(segment.segment_id, places);
    const kind = kindOf(to, employeeIds);

    let points = decodePolyline(segment.geometry);
    if (points.length < 2) {
      const from = path[path.length - 1] ?? start;
      const target = places.get(to);
      points = [from, target].filter((p): p is LatLng => Boolean(p));
    }
    if (path.length === 0 && points.length === 0 && start) points = [start];

    const startIndex = Math.max(path.length - 1, 0);
    const startDist = cumulative[cumulative.length - 1] ?? 0;
    points.forEach(push);
    const length = (cumulative[cumulative.length - 1] ?? 0) - startDist;

    let dropped: string[] = [];
    if (kind === "pickup") onboard.push(to);
    if (kind === "office") {
      dropped = onboard;
      onboard = [];
    }

    legs.push({
      to,
      kind,
      arrivalTime: sequence[i + 1]?.arrival_time,
      dropped,
      startIndex,
      endIndex: Math.max(path.length - 1, 0),
      startDist,
      length,
      durationMs: Math.max(MIN_LEG_MS, (length / speedMps / PLAYBACK_SPEEDUP) * 1000),
    });
  });

  if (path.length === 0) return null;
  return {
    vehicleId: route.vehicle_id,
    color,
    path,
    cumulative,
    total: cumulative[cumulative.length - 1],
    legs,
  };
}

/**
 * Share of a leg driven after `elapsed` ms: a short speed-up out of the stop, constant speed,
 * then a short slow-down into the next stop (a trapezoidal speed profile).
 */
export function legFraction(elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return 1;
  if (elapsed <= 0) return 0;
  const ramp = Math.min(EASE_MS, duration / 2);
  const speed = 1 / (duration - ramp);
  if (elapsed < ramp) return (speed * elapsed * elapsed) / (2 * ramp);
  if (elapsed <= duration - ramp) return speed * (ramp / 2 + (elapsed - ramp));
  const left = duration - elapsed;
  return 1 - (speed * left * left) / (2 * ramp);
}

/**
 * The point `distance` metres into the journey, and the index of the path point just before
 * it. `hint` is where the previous lookup landed; playback only moves forward, so the search
 * normally advances a step or two from there instead of scanning the path.
 */
export function pointAlong(journey: Journey, distance: number, hint = 0): { point: LatLng; index: number } {
  const { path, cumulative } = journey;
  if (distance <= 0 || path.length === 1) return { point: path[0], index: 0 };
  const last = path.length - 1;
  if (distance >= journey.total) return { point: path[last], index: Math.max(last - 1, 0) };

  let i = Math.min(Math.max(hint, 0), last - 1);
  if (cumulative[i] > distance) i = 0;
  while (i < last - 1 && cumulative[i + 1] <= distance) i++;

  const span = cumulative[i + 1] - cumulative[i];
  const t = span > 0 ? (distance - cumulative[i]) / span : 0;
  const a = path[i];
  const b = path[i + 1];
  return { point: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }, index: i };
}

/** A line through `points` as GeoJSON; empty when there are fewer than two points. */
export function lineGeoJSON(points: LatLng[]): FeatureCollection<LineString> {
  if (points.length < 2) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
      },
    ],
  };
}
