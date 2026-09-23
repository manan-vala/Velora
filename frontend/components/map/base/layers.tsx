"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";

import { pointsToGeoJSON, routesToGeoJSON, type MapPoint } from "@/lib/map/geo";
import type { OptimizedRoute } from "@/types";

export const EMPLOYEE_LAYER = "velora-employees";
export const VEHICLE_LAYER = "velora-vehicles";
const OFFICE_LAYER = "velora-offices";

const ACTIVE: ExpressionSpecification = ["boolean", ["get", "active"], false];

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
  taxi?: MapPoint | null;
}

/** Office, employee, vehicle and simulated-taxi dots, stacked in that order. */
export function PointLayers({ offices = [], employees = [], vehicles = [], taxi }: PointLayersProps) {
  const taxiPoints = useMemo(() => (taxi ? [taxi] : []), [taxi]);
  return (
    <>
      <PointLayer id={OFFICE_LAYER} points={offices} color="#EF4444" radius={radius(10, 16.7)} />
      <PointLayer id={EMPLOYEE_LAYER} points={employees} color="#3B82F6" radius={radius(6, 10, 12)} />
      <PointLayer id={VEHICLE_LAYER} points={vehicles} color="#10B981" radius={radius(6, 10, 12)} />
      <PointLayer id="velora-taxi" points={taxiPoints} color="#F59E0B" radius={radius(8, 13.3)} />
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
}: {
  vehicles: OptimizedRoute[];
  activeVehicleId?: string | null;
}) {
  const data = useMemo(() => routesToGeoJSON(vehicles, activeVehicleId), [vehicles, activeVehicleId]);
  return (
    <Source id="velora-routes" type="geojson" data={data}>
      <Layer
        id="velora-routes-casing"
        type="line"
        beforeId={OFFICE_LAYER}
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{ "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.9 }}
      />
      <Layer
        id="velora-routes"
        type="line"
        beforeId={OFFICE_LAYER}
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{ "line-color": ["get", "color"], "line-width": 5, "line-opacity": 0.85 }}
      />
    </Source>
  );
}
