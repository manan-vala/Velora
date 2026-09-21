import { create } from "zustand";
import { ParsedData, OptimizationResponse } from "@/types";

interface AppState {
    mapTheme: "light" | "dark";
    setMapTheme: (theme: "light" | "dark") => void;
  // --- DATA STATE ---
  parsedData: ParsedData | null;
  optimizationResult: OptimizationResponse | null;
  uploadedFile: File | null;
  
  // --- OPTIMIZATION JOB STATE ---
  optimizationTaskId: string | null;
  optimizationStatus: "idle" | "processing" | "completed" | "failed";

  setParsedData: (data: ParsedData) => void;
  setUploadedFile: (file: File | null) => void;
  setOptimizationResult: (res: OptimizationResponse) => void;
  setOptimizationTaskId: (id: string | null) => void;
  setOptimizationStatus: (status: "idle" | "processing" | "completed" | "failed") => void;

  // --- UI STATE ---
  activeVehicleId: string | null;
  activeEmployeeId: string | null;
  sidebarOpen: boolean;

  selectVehicle: (id: string | null) => void;
  selectEmployee: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;

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
  toggleLayer: (layer: keyof AppState["layers"]) => void;
  setLayer: (layer: keyof AppState["layers"], value: boolean) => void; // Added for automatic route toggling

  // --- HELP WIDGET UI STATE ---
  helpFaqOpenIndex: number | null;
  setHelpFaqOpenIndex: (index: number | null) => void;
}

export const useMobileStore = create<AppState>((set) => ({
    mapTheme: "light",
    setMapTheme: (theme) => set({ mapTheme: theme }),
  // Initial State
  parsedData: null,
  optimizationResult: null,
  uploadedFile: null,
  optimizationTaskId: null,
  optimizationStatus: "idle",
  activeVehicleId: null,
  activeEmployeeId: null,
  sidebarOpen: false,
  mapFocus: null,
  simulationTargetId: null,
  zoom: 13,
  mapInstance: null,
  layers: {
    office: true,
    employees: true,
    vehicles: true,
    routes: false,
  },
  helpFaqOpenIndex: null,

  // Actions
  setParsedData: (data) => set({ parsedData: data }),
  setUploadedFile: (file) => set({ uploadedFile: file }),
  setOptimizationResult: (res) => set({ optimizationResult: res }),
  setOptimizationTaskId: (id) => set({ optimizationTaskId: id }),
  setOptimizationStatus: (status) => set({ optimizationStatus: status }),

  selectVehicle: (id) =>
    set({ activeVehicleId: id, activeEmployeeId: null, sidebarOpen: !!id }),
  selectEmployee: (id) => set({ activeEmployeeId: id, activeVehicleId: null }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setMapFocus: (focus) => set({ mapFocus: focus }),
  triggerSimulation: (id) => set({ simulationTargetId: id }),
  setZoom: (zoom) => set({ zoom }),
  setMapInstance: (map) => set({ mapInstance: map }),

  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),
    
  setLayer: (layer, value) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: value },
    })),

  setHelpFaqOpenIndex: (index) => set({ helpFaqOpenIndex: index }),
}));