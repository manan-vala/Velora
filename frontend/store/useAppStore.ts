import { create } from "zustand";
import { ParsedData, OptimizationResult } from "@/types";

interface AppState {
  // --- DATA STATE ---
  parsedData: ParsedData | null;
  uploadedFile: File | null;
  optimizationResult: OptimizationResult | null;
  setParsedData: (data: ParsedData) => void;
  setUploadedFile: (file: File | null) => void;
  setOptimizationResult: (res: OptimizationResult) => void;

  optimizationTaskId: string | null;
  optimizationStatus: "idle" | "processing" | "completed" | "failed";
  setOptimizationTaskId: (id: string | null) => void;
  setOptimizationStatus: (status: AppState["optimizationStatus"]) => void;

  // --- UI STATE ---
  activeVehicleId: string | null;
  activeEmployeeId: string | null;
  sidebarOpen: boolean;
  mapTheme: string;

  selectVehicle: (id: string | null) => void;
  selectEmployee: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setMapTheme: (theme: string) => void;

  // --- MAP CONTROL (Command Pattern) ---
  // The map component listens to this state to know where to fly
  mapFocus: { lat: number; lng: number; zoom: number } | null;
  zoom: number;

  setMapFocus: (
    focus: { lat: number; lng: number; zoom: number } | null,
  ) => void;
  setZoom: (zoom: number) => void;

  simulationTargetId: string | null;
  triggerSimulation: (id: string | null) => void;

  mapInstance: google.maps.Map | null;
  setMapInstance: (map: google.maps.Map | null) => void;

  // --- MAP LAYERS ---
  layers: {
    office: boolean;
    employees: boolean;
    vehicles: boolean;
    routes: boolean;
  };
  setLayer: (layer: keyof AppState["layers"], value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial State
  parsedData: null,
  uploadedFile: null,
  optimizationResult: null,
  optimizationTaskId: null,
  optimizationStatus: "idle",
  activeVehicleId: null,
  activeEmployeeId: null,
  sidebarOpen: false,
  mapFocus: null,
  simulationTargetId: null,
  zoom: 13,
  mapTheme: "whiteMap",
  mapInstance: null,
  layers: {
    office: true,
    employees: true,
    vehicles: true,
    routes: false,
  },

  // Actions
  setParsedData: (data) =>
    set((state) => ({
      parsedData: data,
      optimizationResult: null,
      activeVehicleId: null,
      activeEmployeeId: null,
      sidebarOpen: false,
      simulationTargetId: null,
      layers: { ...state.layers, routes: false },
      optimizationTaskId: null,
      optimizationStatus: "idle",
    })),
  setUploadedFile: (file) => set({ uploadedFile: file }),
  setOptimizationResult: (res) => set({ optimizationResult: res }),

  setOptimizationTaskId: (id) => set({ optimizationTaskId: id }),
  setOptimizationStatus: (status) => set({ optimizationStatus: status }),

  selectVehicle: (id) =>
    set({ activeVehicleId: id, activeEmployeeId: null, sidebarOpen: !!id }),
  selectEmployee: (id) => set({ activeEmployeeId: id, activeVehicleId: null }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMapTheme: (theme) => set({ mapTheme: theme }),

  setMapFocus: (focus) => set({ mapFocus: focus }),
  triggerSimulation: (id) => set({ simulationTargetId: id }),
  setZoom: (zoom) => set({ zoom }),
  setMapInstance: (map) => set({ mapInstance: map }),

  setLayer: (layer, value) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: value },
    })),
}));
