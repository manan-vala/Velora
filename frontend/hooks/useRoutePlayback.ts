"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MaplibreMap, Marker } from "maplibre-gl";

import type { LatLng } from "@/lib/map/geo";
import {
  STOP_PAUSE_MS,
  legFraction,
  lineGeoJSON,
  pointAlong,
  type Journey,
} from "@/lib/map/playback";

export type PlaybackStatus = "idle" | "playing" | "paused" | "done";

/** GeoJSON source holding the part of the current leg driven so far; redrawn every frame. */
export const PLAYBACK_HEAD_SOURCE = "velora-playback-head";

/** The longest step one frame may take, so a backgrounded tab doesn't jump ahead on return. */
const MAX_FRAME_MS = 64;

export interface PlaybackView {
  status: PlaybackStatus;
  /** Index of the leg being driven (or just finished). */
  leg: number;
  /** True once the vehicle has reached the current leg's stop. */
  arrived: boolean;
  position: LatLng | null;
  /** Journey path up to the start of the current leg. */
  done: LatLng[];
  /** The current leg as far as the vehicle has driven it. */
  head: LatLng[];
}

const IDLE: PlaybackView = { status: "idle", leg: 0, arrived: false, position: null, done: [], head: [] };

interface Clock {
  leg: number;
  phase: "drive" | "dwell";
  /** ms driven on the current leg, or ms waited at its stop. */
  elapsed: number;
  /** Path index of the last position lookup, to resume the search from there. */
  hint: number;
}

const freshClock = (): Clock => ({ leg: 0, phase: "drive", elapsed: 0, hint: 0 });

function positionOf(journey: Journey, clock: Clock) {
  const leg = journey.legs[clock.leg];
  const fraction = clock.phase === "drive" ? legFraction(clock.elapsed, leg.durationMs) : 1;
  const distance = leg.startDist + fraction * leg.length;
  const { point, index } = pointAlong(journey, distance, clock.hint);
  clock.hint = index;
  const head = journey.path.slice(leg.startIndex, Math.max(index, leg.startIndex) + 1);
  head.push(point);
  return { distance, point, head };
}

/**
 * Drives one vehicle along its journey. The per-frame work (moving the marker, extending
 * the trail, filling the progress bar) talks to MapLibre and the DOM directly, so React only
 * re-renders when the vehicle reaches or leaves a stop.
 */
export function useRoutePlayback(map: MaplibreMap | null, journey: Journey | null) {
  const [view, setView] = useState<PlaybackView>(IDLE);

  const clock = useRef<Clock>(freshClock());
  const frame = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const status = useRef<PlaybackStatus>("idle");
  /** The frame callback, reached through a ref so it can schedule itself. */
  const tickRef = useRef<FrameRequestCallback>(() => {});

  const markerRef = useRef<Marker | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const distanceRef = useRef<HTMLSpanElement | null>(null);

  const mapRef = useRef(map);
  const journeyRef = useRef(journey);
  useEffect(() => {
    mapRef.current = map;
    journeyRef.current = journey;
  });

  const cancelFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  /** Pushes the current position to the map and the bar without touching React. */
  const draw = useCallback((j: Journey) => {
    const { distance, point, head } = positionOf(j, clock.current);
    markerRef.current?.setLngLat([point.lng, point.lat]);
    (mapRef.current?.getSource(PLAYBACK_HEAD_SOURCE) as GeoJSONSource | undefined)?.setData(lineGeoJSON(head));
    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${j.total > 0 ? distance / j.total : 1})`;
    }
    if (distanceRef.current) distanceRef.current.textContent = (distance / 1000).toFixed(1);
  }, []);

  /** Syncs React with the clock: which leg, whether we've arrived, and the trail so far. */
  const commit = useCallback((j: Journey, next: PlaybackStatus) => {
    status.current = next;
    const c = clock.current;
    const { point, head } = positionOf(j, c);
    setView({
      status: next,
      leg: c.leg,
      arrived: c.phase === "dwell",
      position: point,
      done: j.path.slice(0, j.legs[c.leg].startIndex + 1),
      head,
    });
  }, []);

  const tick = useCallback(
    (now: number) => {
      const j = journeyRef.current;
      if (!j) return;
      const c = clock.current;
      let budget = lastTime.current === null ? 0 : Math.min(now - lastTime.current, MAX_FRAME_MS);
      lastTime.current = now;

      let changed = false;
      let finished = false;
      while (budget > 0 && !finished) {
        const leg = j.legs[c.leg];
        const limit = c.phase === "drive" ? leg.durationMs : STOP_PAUSE_MS;
        const left = limit - c.elapsed;
        if (budget < left) {
          c.elapsed += budget;
          budget = 0;
        } else if (c.phase === "drive") {
          budget -= left;
          changed = true;
          c.phase = "dwell";
          c.elapsed = 0;
          finished = c.leg === j.legs.length - 1;
        } else {
          budget -= left;
          changed = true;
          c.leg += 1;
          c.phase = "drive";
          c.elapsed = 0;
        }
      }

      draw(j);
      if (finished) {
        frame.current = null;
        commit(j, "done");
        return;
      }
      if (changed) commit(j, "playing");
      frame.current = requestAnimationFrame(tickRef.current);
    },
    [commit, draw],
  );
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const play = useCallback(() => {
    const j = journeyRef.current;
    if (!j || j.legs.length === 0 || status.current === "playing") return;

    if (status.current === "idle" || status.current === "done") {
      clock.current = freshClock();
      const m = mapRef.current;
      if (m) {
        const lngs = j.path.map((p) => p.lng);
        const lats = j.path.map((p) => p.lat);
        m.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: { top: 90, bottom: 300, left: 140, right: 120 }, maxZoom: 15.5, duration: 900 },
        );
      }
    }
    lastTime.current = null;
    commit(j, "playing");
    cancelFrame();
    frame.current = requestAnimationFrame(tick);
  }, [commit, tick]);

  const pause = useCallback(() => {
    const j = journeyRef.current;
    if (!j || status.current !== "playing") return;
    cancelFrame();
    commit(j, "paused");
  }, [commit]);

  const stop = useCallback(() => {
    cancelFrame();
    clock.current = freshClock();
    status.current = "idle";
    setView(IDLE);
  }, []);

  // A different vehicle or a new result: start over
  useEffect(() => stop, [journey, stop]);

  return useMemo(
    () => ({ view, play, pause, stop, markerRef, progressRef, distanceRef }),
    [view, play, pause, stop],
  );
}
