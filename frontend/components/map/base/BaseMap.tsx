"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useState, type ReactNode } from "react";
import MapGL, { type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";

import { BANGALORE, type LatLng } from "@/lib/map/geo";
import { getMapStyle, type MapTheme } from "@/lib/map/style";

interface BaseMapProps {
  theme: MapTheme;
  /** Where the map looks; when this changes (e.g. a new dataset) the map glides there. */
  center?: LatLng;
  zoom?: number;
  /** Layer ids whose features are clickable (they get a pointer cursor on hover). */
  interactiveLayerIds?: string[];
  onClick?: (event: MapLayerMouseEvent) => void;
  onReady?: (map: MaplibreMap) => void;
  onZoomEnd?: (zoom: number) => void;
  children?: ReactNode;
}

/**
 * The Velora basemap: MapLibre drawing OpenFreeMap tiles in our own style. North-up
 * and flat (no rotate or tilt gestures), with the app providing its own controls.
 */
export default function BaseMap({
  theme,
  center = BANGALORE,
  zoom = 13,
  interactiveLayerIds,
  onClick,
  onReady,
  onZoomEnd,
  children,
}: BaseMapProps) {
  const [hovering, setHovering] = useState(false);
  const [map, setMap] = useState<MaplibreMap | null>(null);

  // Follow later centre changes; initialViewState only covers the first render
  useEffect(() => {
    map?.easeTo({ center: { lat: center.lat, lng: center.lng }, duration: 600 });
  }, [map, center.lat, center.lng]);

  return (
    <MapGL
      initialViewState={{ latitude: center.lat, longitude: center.lng, zoom }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={getMapStyle(theme)}
      attributionControl={{ compact: true }}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      maxPitch={0}
      interactiveLayerIds={interactiveLayerIds}
      cursor={hovering ? "pointer" : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
      onLoad={(event) => {
        event.target.touchZoomRotate.disableRotation();
        setMap(event.target);
        onReady?.(event.target);
      }}
      onZoomEnd={(event) => onZoomEnd?.(event.viewState.zoom)}
    >
      {children}
    </MapGL>
  );
}
