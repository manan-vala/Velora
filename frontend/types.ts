// types.ts
export type TimeHHMMSS = string;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Employee {
  employee_id: string;
  priority: number;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  earliest_pickup: TimeHHMMSS;
  latest_drop: TimeHHMMSS;
  vehicle_preference: string;
  sharing_preference: string;
  // ... add other fields
  [key: string]: string | number | boolean | null | undefined;
}

export interface Vehicle {
  vehicle_id: string;
  fuel_type: string;
  vehicle_type: string;
  capacity: number;
  cost_per_km: number;
  avg_speed_kmph: number;
  current_lat: number;
  current_lng: number;
  available_from: TimeHHMMSS;
  category: string;
  // ... add other fields
  [key: string]: string | number | boolean | null | undefined;
}

export interface MetaInfo {
  generated_at: string;
  source_files: string[];
  format: string;
}

export interface Metadata {
  test_case_id: string;
  city: string;
  distance_method: string;
  allow_external_maps: boolean;
  priority_1_max_delay_min: number;
  priority_2_max_delay_min: number;
  priority_3_max_delay_min: number;
  priority_4_max_delay_min: number;
  priority_5_max_delay_min: number;
  objective_cost_weight: number;
  objective_time_weight: number;
}

export interface Baseline {
  employee_id: string;
  baseline_cost: number;
  baseline_time_min: number;
}

export interface ParsedData {
  employees: Employee[];
  vehicles: Vehicle[];
  filename?: string;
  meta_info?: MetaInfo;
  metadata?: Metadata;
  baseline?: Baseline[];
}

// Optimization Types
export interface RouteStep {
  step: number;
  location: string;
  arrival_time: string;
  departure_time?: string;
}

export interface RouteGeometry {
  segment_id: string;
  geometry: string; // Encoded polyline
}

export interface OptimizedRoute {
  vehicle_id: string;
  vehicle_type: string;
  capacity: number;
  avg_speed_kmph: number;
  total_cost: number;
  total_time_minutes: number;
  total_steps: number;
  route_sequence: RouteStep[];
  route_geometry: RouteGeometry[];
}

// Alias for backward compatibility if needed, though OptimizedRoute is preferred
export type VehicleRoute = OptimizedRoute;

export interface OptimizationSummary {
  total_cost_all_vehicles: number;
  total_algo_time_seconds: number;
  total_vehicle_time_minutes: number;
}

export interface OptimizationResponse {
  status: string;
  metadata: {
    processed_pairs: number;
    time_taken: string;
  };
  data: OptimizationResult;
}

export interface OptimizationStartResponse {
  task_id: string;
  message?: string;
}

export interface ViolationDetail {
  employee_id: string;
  type: string;
  limit: number;
  actual: number;
}

export interface OptimizationResult {
  vehicles: OptimizedRoute[];
  summary: OptimizationSummary;
  soft_violation_details?: ViolationDetail[];
  hard_violation_details?: ViolationDetail[];
}

export interface OptimizationStatusResponse {
  status: "processing" | "completed" | "failed";
  result?: OptimizationResponse;
  error?: string;
}
