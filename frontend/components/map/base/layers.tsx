"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";

import { pointsToGeoJSON, routesToGeoJSON, type LatLng, type MapPoint } from "@/lib/map/geo";
import { lineGeoJSON, type Journey } from "@/lib/map/playback";
import { PLAYBACK_HEAD_SOURCE } from "@/hooks/useRoutePlayback";
import type { OptimizedRoute } from "@/types";

export const EMPLOYEE_LAYER = "velora-employees";
export const VEHICLE_LAYER = "velora-vehicles";
const OFFICE_LAYER = "velora-offices";

const ACTIVE: ExpressionSpecification = ["boolean", ["get", "active"], false];
const MUTED: ExpressionSpecification = ["boolean", ["get", "muted"], false];
const FADE = { duration: 300, delay: 0 };

/**
 * Circle radius that grows with zoom (from `min` at z12 to `max` at z20), and a fixed
 * larger size for the selected point. Mirrors the sizing the Google markers used.
 */
function radius(min: number, max: number, active = min): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    12,
    ["case", ACTIVE, active, min],
    20,
    ["case", ACTIVE, active, max],
  ];
}

interface PointLayerProps {
  id: string;
  points: MapPoint[];
  color: string;
  radius: ExpressionSpecification;
}

function PointLayer({ id, points, color, radius }: PointLayerProps) {
  const data = useMemo(() => pointsToGeoJSON(points), [points]);
  return (
    <Source id={id} type="geojson" data={data}>
      <Layer
        id={id}
        type="circle"
        layout={{ "circle-sort-key": ["case", ACTIVE, 1, 0] }}
        paint={{
          "circle-color": color,
          "circle-radius": radius,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["case", ACTIVE, 4, 2],
          "circle-opacity": ["case", MUTED, 0.3, 1],
          "circle-stroke-opacity": ["case", MUTED, 0.3, 1],
          "circle-pitch-alignment": "map",
        }}
      />
    </Source>
  );
}

interface PointLayersProps {
  offices?: MapPoint[];
  employees?: MapPoint[];
  vehicles?: MapPoint[];
}

/** Office, employee and vehicle dots, stacked in that order. */
export function PointLayers({ offices = [], employees = [], vehicles = [] }: PointLayersProps) {
  return (
    <>
      <PointLayer id={OFFICE_LAYER} points={offices} color="#EF4444" radius={radius(10, 16.7)} />
      <PointLayer id={EMPLOYEE_LAYER} points={employees} color="#3B82F6" radius={radius(6, 10, 12)} />
      <PointLayer id={VEHICLE_LAYER} points={vehicles} color="#10B981" radius={radius(6, 10, 12)} />
    </>
  );
}

/**
 * Optimised routes: each vehicle's line in its colour over a thin white casing, drawn
 * beneath the dots. Render it after <PointLayers> so the office layer already exists.
 */
export function RouteLayers({
  vehicles,
  activeVehicleId,
  excludeVehicleId,
  dimmed = false,
}: {
  vehicles: OptimizedRoute[];
  activeVehicleId?: string | null;
  /** Leave this vehicle's line out (route playback draws its own). */
  excludeVehicleId?: string | null;
  /** Fade every line into the background. */
  dimmed?: boolean;
}) {
  const data = useMemo(
    () => routesToGeoJSON(vehicles, activeVehicleId, excludeVehicleId),
    [vehicles, activeVehicleId, excludeVehicleId],
  );
  return (
    <Source id="velora-routes" type="geojson" data={data}>
      <Layer
        id="velora-routes-casing"
        type="line"
        beforeId={OFFICE_LAYER}
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": dimmed ? 0.3 : 0.9,
          "line-opacity-transition": FADE,
        }}
      />
      <Layer
        id="velora-routes"
        type="line"
        beforeId={OFFICE_LAYER}
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{
          "line-color": ["get", "color"],
          "line-width": 5,
          "line-opacity": dimmed ? 0.22 : 0.85,
          "line-opacity-transition": FADE,
        }}
      />
    </Source>
  );
}

const ROUND = { "line-join": "round", "line-cap": "round" } as const;

/**
 * Route playback: the whole journey drawn faintly, the part already driven in solid colour,
 * and the current leg's trail, which useRoutePlayback redraws every frame through
 * PLAYBACK_HEAD_SOURCE. `done` and `head` only change here when the vehicle passes a stop.
 */
export function PlaybackLayers({ journey, done, head }: { journey: Journey; done: LatLng[]; head: LatLng[] }) {
  const route = useMemo(() => lineGeoJSON(journey.path), [journey]);
  const doneData = useMemo(() => lineGeoJSON(done), [done]);
  const headData = useMemo(() => lineGeoJSON(head), [head]);
  const trail = { "line-color": journey.color, "line-width": 5 };
  return (
    <>
      <Source id="velora-playback-route" type="geojson" data={route}>
        <Layer
          id="velora-playback-casing"
          type="line"
          beforeId={OFFICE_LAYER}
          layout={ROUND}
          paint={{ "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.95 }}
        />
        <Layer
          id="velora-playback-ghost"
          type="line"
          beforeId={OFFICE_LAYER}
          layout={ROUND}
          paint={{ "line-color": journey.color, "line-width": 5, "line-opacity": 0.3 }}
        />
      </Source>
      <Source id="velora-playback-done" type="geojson" data={doneData}>
        <Layer id="velora-playback-done" type="line" beforeId={OFFICE_LAYER} layout={ROUND} paint={trail} />
      </Source>
      <Source id={PLAYBACK_HEAD_SOURCE} type="geojson" data={headData}>
        <Layer id={PLAYBACK_HEAD_SOURCE} type="line" beforeId={OFFICE_LAYER} layout={ROUND} paint={trail} />
      </Source>
    </>
  );
}
