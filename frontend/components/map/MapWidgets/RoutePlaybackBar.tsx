"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Check, ChevronUp, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Loading } from "loading-dev";

import { ROUTE_COLORS } from "@/lib/map/geo";
import type { Journey, JourneyLeg } from "@/lib/map/playback";
import type { PlaybackView } from "@/hooks/useRoutePlayback";
import type { OptimizedRoute } from "@/types";

interface RoutePlaybackBarProps {
  routes: OptimizedRoute[];
  selectedId: string | null;
  onSelect: (vehicleId: string) => void;
  journey: Journey | null;
  view: PlaybackView;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  progressRef: RefObject<HTMLDivElement | null>;
  distanceRef: RefObject<HTMLSpanElement | null>;
  /** Sit higher, clear of the open legend bar. */
  lifted?: boolean;
}

interface Row {
  key: string;
  state: "driving" | "done";
  title: string;
  detail?: string;
  time?: string;
}

function droppedText(ids: string[]) {
  if (ids.length === 0) return "Arrived at office";
  if (ids.length === 1) return `Dropped off ${ids[0]} at office`;
  return `Dropped off ${ids.length} employees at office`;
}

function legRow(leg: JourneyLeg, index: number, state: Row["state"]): Row {
  const driving = state === "driving";
  const target = leg.kind === "office" ? "office" : leg.to;
  let title = `Driving to ${target}`;
  if (!driving) {
    if (leg.kind === "pickup") title = `Picked up ${leg.to}`;
    else if (leg.kind === "office") title = droppedText(leg.dropped);
    else title = `Arrived at ${leg.to}`;
  }
  return {
    key: `leg-${index}`,
    state,
    title,
    detail: !driving && leg.dropped.length > 1 ? leg.dropped.join(" · ") : undefined,
    time: leg.arrivalTime ? (driving ? `ETA ${leg.arrivalTime}` : leg.arrivalTime) : undefined,
  };
}

function rowsOf(journey: Journey | null, view: PlaybackView): Row[] {
  if (!journey || view.status === "idle") return [];
  const rows = journey.legs
    .slice(0, view.leg + 1)
    .map((leg, i) => legRow(leg, i, i < view.leg || view.arrived ? "done" : "driving"));
  if (view.status === "done") {
    const pickups = journey.legs.filter((l) => l.kind === "pickup").length;
    rows.push({
      key: "complete",
      state: "done",
      title: "Journey complete",
      detail: `${(journey.total / 1000).toFixed(1)} km · ${pickups} pickup${pickups === 1 ? "" : "s"}`,
    });
  }
  return rows;
}

function StatusIcon({ state, color, paused }: { state: Row["state"]; color: string; paused: boolean }) {
  if (state === "driving") {
    return (
      <span className="grid place-items-center w-6 h-6 shrink-0">
        <Loading size={20} color={color} playState={paused ? "paused" : "running"} />
      </span>
    );
  }
  return (
    <span className="velora-pop grid place-items-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 shrink-0">
      <Check className="w-3.5 h-3.5" strokeWidth={3} />
    </span>
  );
}

/** Vehicle picker that opens upwards, since the bar sits at the bottom of the screen. */
function VehiclePicker({
  routes,
  selectedId,
  onSelect,
}: Pick<RoutePlaybackBarProps, "routes" | "selectedId" | "onSelect">) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = routes.findIndex((r) => r.vehicle_id === selectedId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 h-10 pl-3 pr-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-colors max-w-full"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow"
          style={{ background: ROUTE_COLORS[Math.max(selectedIndex, 0) % ROUTE_COLORS.length] }}
        />
        <span className="text-sm font-semibold text-slate-800 truncate">{selectedId ?? "Vehicle"}</span>
        <ChevronUp
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? "" : "rotate-180"}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="velora-rise absolute bottom-full left-0 mb-2 w-60 max-h-72 overflow-y-auto velora-scroll rounded-2xl bg-white p-1.5 shadow-2xl shadow-slate-900/15 border border-slate-100"
        >
          {routes.map((route, i) => {
            const selected = route.vehicle_id === selectedId;
            const stops = Math.max((route.route_sequence?.length ?? 1) - 1, 0);
            return (
              <li key={route.vehicle_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(route.vehicle_id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                    selected ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{route.vehicle_id}</span>
                    <span className="block text-xs text-slate-400 truncate">
                      {stops} stop{stops === 1 ? "" : "s"}
                      {route.vehicle_type ? ` · ${route.vehicle_type}` : ""}
                    </span>
                  </span>
                  {selected && <Check className="w-4 h-4 text-slate-700 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Bottom-centre route playback: pick a vehicle, press play, and watch it drive its optimised
 * route. While a journey is running the bar opens upwards into a live log of each stop.
 */
export default function RoutePlaybackBar({
  routes,
  selectedId,
  onSelect,
  journey,
  view,
  onPlay,
  onPause,
  onStop,
  progressRef,
  distanceRef,
  lifted = false,
}: RoutePlaybackBarProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const active = view.status !== "idle";
  const rows = rowsOf(journey, view);
  const color = journey?.color ?? ROUTE_COLORS[0];

  // Keep the newest step in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [rows.length, view.arrived]);

  const playing = view.status === "playing";
  const MainIcon = playing ? Pause : view.status === "done" ? RotateCcw : Play;
  const mainLabel = playing ? "Pause" : view.status === "done" ? "Replay" : "Play route";

  return (
    <div
      className={`velora-rise absolute left-1/2 -translate-x-1/2 z-30 transition-[bottom] duration-300 ease-out ${
        lifted ? "bottom-26" : "bottom-6"
      }`}
    >
      <div
        className={`rounded-3xl bg-white/95 backdrop-blur-md shadow-2xl shadow-slate-900/15 border border-slate-100 transition-[width] duration-300 ease-out ${
          active ? "w-[400px]" : "w-[272px]"
        } max-w-[calc(100vw-2rem)]`}
      >
        {/* Live log: opens upwards while a journey runs */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!active}
        >
          <div className="min-h-0 overflow-hidden">
            <ol ref={listRef} className="max-h-48 overflow-y-auto velora-scroll px-2.5 pt-2.5 space-y-0.5" aria-live="polite">
              {rows.map((row, i) => {
                const current = i === rows.length - 1;
                return (
                  <li
                    key={row.key}
                    className={`velora-row-in flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors duration-300 ${
                      current ? "bg-slate-50" : ""
                    }`}
                  >
                    <StatusIcon key={row.state} state={row.state} color={color} paused={view.status === "paused"} />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate transition-colors duration-300 ${
                          current ? "font-semibold text-slate-800" : "font-medium text-slate-500"
                        }`}
                      >
                        {row.title}
                      </p>
                      {row.detail && <p className="text-xs text-slate-400 truncate">{row.detail}</p>}
                    </div>
                    {row.time && (
                      <span className="text-xs tabular-nums text-slate-400 shrink-0">{row.time}</span>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mx-5 mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                ref={progressRef}
                className="h-full w-full rounded-full origin-left"
                style={{ background: color, transform: "scaleX(0)" }}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 p-2">
          <VehiclePicker routes={routes} selectedId={selectedId} onSelect={onSelect} />

          <div className="flex-1 min-w-0 text-right pr-1">
            {journey && (
              <span className="text-xs font-medium tabular-nums text-slate-400 whitespace-nowrap">
                {active ? (
                  <>
                    <span ref={distanceRef} className="text-slate-700 font-semibold">
                      0.0
                    </span>{" "}
                    / {(journey.total / 1000).toFixed(1)} km
                  </>
                ) : (
                  `${journey.legs.length} stops · ${(journey.total / 1000).toFixed(1)} km`
                )}
              </span>
            )}
          </div>

          {active && (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop playback"
              title="Stop"
              className="grid place-items-center w-10 h-10 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            type="button"
            onClick={playing ? onPause : onPlay}
            disabled={!journey}
            aria-label={mainLabel}
            title={mainLabel}
            className="grid place-items-center w-10 h-10 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/25 hover:bg-slate-800 active:scale-95 transition-[transform,background-color] disabled:opacity-40 disabled:pointer-events-none"
          >
            <MainIcon
              key={mainLabel}
              className={`velora-pop w-4 h-4 ${
                MainIcon === Play ? "fill-current ml-0.5" : MainIcon === Pause ? "fill-current" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
