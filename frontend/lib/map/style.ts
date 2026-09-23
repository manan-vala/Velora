import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

import liberty from "./openfreemap-liberty.json";

/**
 * Velora's basemap: OpenFreeMap's Liberty style (a pinned snapshot in
 * openfreemap-liberty.json) recoloured with the palettes below for a calmer,
 * Google/Protomaps-like look. Tweak colours here; the snapshot can also be opened
 * in Maputnik (https://maputnik.github.io/editor) to explore layer by layer.
 */
export type MapTheme = "light" | "dark";

export interface MapPalette {
  land: string;
  residential: string;
  park: string;
  wood: string;
  grass: string;
  pitch: string;
  school: string;
  hospital: string;
  cemetery: string;
  sand: string;
  water: string;
  aeroway: string;
  runway: string;
  building: string;
  buildingOutline: string;
  highway: string;
  highwayCasing: string;
  major: string;
  majorCasing: string;
  minor: string;
  minorCasing: string;
  path: string;
  rail: string;
  boundary: string;
  countryBoundary: string;
  placeLabel: string;
  suburbLabel: string;
  roadLabel: string;
  waterLabel: string;
  poiLabel: string;
  transitLabel: string;
  halo: string;
  /** Opacity of the sprite hatch patterns (pedestrian areas, wetland); white hatching glares in dark mode */
  patternOpacity: number;
}

export const LIGHT: MapPalette = {
  land: "#eeede9",
  residential: "#ebeae6",
  park: "#addcb0",
  wood: "#c2e3bd",
  grass: "#cbe8c5",
  pitch: "#c9e7c8",
  school: "#eeeae0",
  hospital: "#f7e3e3",
  cemetery: "#dfe8d8",
  sand: "#f3eedc",
  water: "#9dd3f2",
  aeroway: "#e6e6ea",
  runway: "#d4d6db",
  building: "#e3e1dc",
  buildingOutline: "#d8d5cf",
  highway: "#dce4ee",
  highwayCasing: "#b9c6d4",
  major: "#ffffff",
  majorCasing: "#d6d6d6",
  minor: "#ffffff",
  minorCasing: "#dddcd8",
  path: "#ffffff",
  rail: "#c9c9c9",
  boundary: "#b8b8b8",
  countryBoundary: "#8f8f8f",
  placeLabel: "#3c4043",
  suburbLabel: "#70757a",
  roadLabel: "#80868b",
  waterLabel: "#3b83b5",
  poiLabel: "#5f6368",
  transitLabel: "#1a73e8",
  halo: "#ffffff",
  patternOpacity: 0.6,
};

export const DARK: MapPalette = {
  land: "#1f2125",
  residential: "#222428",
  park: "#1f3527",
  wood: "#1f3226",
  grass: "#223428",
  pitch: "#223428",
  school: "#27282c",
  hospital: "#2e2426",
  cemetery: "#242c26",
  sand: "#2a2823",
  water: "#17324a",
  aeroway: "#2a2c31",
  runway: "#34373d",
  building: "#2a2c31",
  buildingOutline: "#303238",
  highway: "#4a5461",
  highwayCasing: "#2a2f36",
  major: "#3a3e45",
  majorCasing: "#1b1d20",
  minor: "#2f3237",
  minorCasing: "#1b1d20",
  path: "#34373c",
  rail: "#45484e",
  boundary: "#50535a",
  countryBoundary: "#6b6f76",
  placeLabel: "#d5d8dc",
  suburbLabel: "#9aa0a6",
  roadLabel: "#8e949a",
  waterLabel: "#6fa8d6",
  poiLabel: "#a0a5ab",
  transitLabel: "#7fb2f0",
  halo: "#1f2125",
  patternOpacity: 0.12,
};

const PALETTES: Record<MapTheme, MapPalette> = { light: LIGHT, dark: DARK };

// MapLibre can't shape Kannada (or other Indic scripts), so labels use the English
// name or OpenMapTiles' transliteration and never fall back to the local script.
const LATIN_NAME: ExpressionSpecification = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "name:latin"],
  ["get", "name"],
];

// Keep landmarks people navigate by; everything else in OSM's POI layer is noise here.
const POI_KEEP: ExpressionSpecification = [
  "any",
  [
    "match",
    ["get", "class"],
    ["park", "hospital", "college", "stadium", "attraction", "zoo", "golf", "place_of_worship"],
    true,
    false,
  ],
  ["==", ["get", "subclass"], "mall"],
];

const TRANSIT_KEEP: ExpressionSpecification = [
  "any",
  ["match", ["get", "class"], ["rail", "airport"], true, false],
  ["==", ["get", "subclass"], "bus_station"],
];

// Relief shading, dashed park edges, 3D extrusions and US highway shields add noise here
const DROPPED_LAYERS = new Set([
  "natural_earth",
  "park_outline",
  "building-3d",
  "highway-shield-us-interstate",
  "road_shield_us",
]);

type Paint = Record<string, unknown>;
type Layout = Record<string, unknown>;

function roadColors(id: string, p: MapPalette): { fill: string; casing: string } | null {
  if (/rail/.test(id)) return { fill: p.rail, casing: p.rail };
  if (/path_pedestrian/.test(id)) return { fill: p.path, casing: p.minorCasing };
  if (/motorway/.test(id)) return { fill: p.highway, casing: p.highwayCasing };
  if (/trunk_primary|secondary_tertiary|_link/.test(id)) return { fill: p.major, casing: p.majorCasing };
  if (/minor|street|service_track/.test(id)) return { fill: p.minor, casing: p.minorCasing };
  return null;
}

function paintFor(layer: LayerSpecification, p: MapPalette): Paint {
  const id = layer.id;
  switch (id) {
    case "background":
      return { "background-color": p.land };
    case "park":
      return { "fill-color": p.park, "fill-opacity": 1, "fill-outline-color": p.park };
    case "landuse_residential":
      return { "fill-color": p.residential };
    case "landcover_wood":
      return { "fill-color": p.wood, "fill-opacity": 0.8 };
    case "landcover_grass":
      return { "fill-color": p.grass, "fill-opacity": 0.8 };
    case "landuse_pitch":
    case "landuse_track":
      return { "fill-color": p.pitch };
    case "landuse_cemetery":
      return { "fill-color": p.cemetery };
    case "landuse_hospital":
      return { "fill-color": p.hospital };
    case "landuse_school":
      return { "fill-color": p.school };
    case "road_area_pattern":
    case "landcover_wetland":
      return { "fill-opacity": p.patternOpacity };
    case "landcover_sand":
      return { "fill-color": p.sand };
    case "water":
      return { "fill-color": p.water };
    case "aeroway_fill":
      return { "fill-color": p.aeroway, "fill-opacity": 1 };
    case "aeroway_runway":
    case "aeroway_taxiway":
      return { "line-color": p.runway };
    case "building":
      // Fade buildings in so the city view stays clean and they appear as you zoom to streets
      return {
        "fill-color": p.building,
        "fill-outline-color": p.buildingOutline,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, 0.6, 16, 1],
      };
    case "boundary_2":
    case "boundary_disputed":
      return { "line-color": p.countryBoundary };
    case "boundary_3":
      return { "line-color": p.boundary };
  }

  if (id.startsWith("waterway")) {
    if (layer.type === "symbol") return { "text-color": p.waterLabel, "text-halo-color": p.halo };
    return { "line-color": p.water };
  }
  if (id.startsWith("water_name")) return { "text-color": p.waterLabel, "text-halo-color": p.halo };

  if (layer.type === "line" && /^(road|tunnel|bridge)_/.test(id)) {
    const colors = roadColors(id, p);
    if (!colors) return {};
    return { "line-color": id.includes("casing") ? colors.casing : colors.fill };
  }

  if (layer.type === "symbol") {
    const text = { "text-halo-color": p.halo, "text-halo-width": 1.2, "text-halo-blur": 0.5 };
    if (id === "poi_transit") return { ...text, "text-color": p.transitLabel };
    if (id.startsWith("poi_") || id === "airport") return { ...text, "text-color": p.poiLabel };
    if (id.startsWith("highway-name")) return { ...text, "text-color": p.roadLabel };
    if (id === "label_other") return { ...text, "text-color": p.suburbLabel };
    if (id.startsWith("label_")) return { ...text, "text-color": p.placeLabel };
  }
  return {};
}

function layoutFor(layer: LayerSpecification): Layout {
  if (layer.type !== "symbol") return {};
  const layout: Layout = {};
  if (JSON.stringify(layer.layout?.["text-field"] ?? "").includes("name")) {
    layout["text-field"] = LATIN_NAME;
  }
  // Neighbourhood names in small caps-style, as Google and Protomaps draw them
  if (layer.id === "label_other") {
    layout["text-font"] = ["Noto Sans Regular"];
    layout["text-transform"] = "uppercase";
    layout["text-letter-spacing"] = 0.08;
  }
  if (layer.id.startsWith("poi_") || layer.id === "airport") {
    layout["text-font"] = ["Noto Sans Regular"];
  }
  return layout;
}

function filterFor(layer: LayerSpecification): FilterSpecification | undefined {
  const base = "filter" in layer ? layer.filter : undefined;
  if (layer.id === "poi_transit") return TRANSIT_KEEP as FilterSpecification;
  // Name only real rivers; Bangalore's many named storm drains ("V112", "K109") are noise
  if (layer.id === "waterway_line_label") {
    return ["all", base ?? true, ["==", ["get", "class"], "river"]] as FilterSpecification;
  }
  // Check ref_length exists before comparing it; features without one otherwise log warnings
  if (layer.id === "highway-shield-non-us" && Array.isArray(base)) {
    return ["all", ["has", "ref_length"], ...base.slice(1)] as FilterSpecification;
  }
  if (/^poi_r\d+$/.test(layer.id)) {
    return (base ? ["all", base, POI_KEEP] : POI_KEEP) as FilterSpecification;
  }
  return base;
}

export function buildStyle(palette: MapPalette): StyleSpecification {
  const base = liberty as unknown as StyleSpecification;
  const { ne2_shaded: _unused, ...sources } = base.sources;
  void _unused;

  const layers = base.layers
    .filter((layer) => !DROPPED_LAYERS.has(layer.id))
    .map((layer) => {
      const next = structuredClone(layer) as LayerSpecification & { paint?: Paint; layout?: Layout };
      next.paint = { ...next.paint, ...paintFor(layer, palette) };
      next.layout = { ...next.layout, ...layoutFor(layer) };
      const filter = filterFor(layer);
      if (filter) (next as { filter?: FilterSpecification }).filter = filter;
      return next as LayerSpecification;
    });

  return { ...base, sources, layers };
}

const cache = new Map<MapTheme, StyleSpecification>();

/** The basemap style for a theme; built once per theme and reused. */
export function getMapStyle(theme: MapTheme): StyleSpecification {
  let style = cache.get(theme);
  if (!style) {
    style = buildStyle(PALETTES[theme]);
    cache.set(theme, style);
  }
  return style;
}
