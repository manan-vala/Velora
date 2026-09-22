import {
  ParsedData,
  OptimizationStartResponse,
  OptimizationStatusResponse,
} from "@/types";
import { apiFetch, apiJson } from "./client";

// 1. Function to DROP OFF data and get a Task ID
export const startOptimizationJob = async (
  data: ParsedData,
  file: File,
): Promise<string> => {
  const formData = new FormData();
  formData.append("json_data", JSON.stringify(data));
  formData.append("file", file, file.name);

  // Do NOT set Content-Type: the browser adds the multipart boundary.
  const result = await apiJson<OptimizationStartResponse>("/optimize/start", {
    method: "POST",
    body: formData,
  });
  console.log("[API] /optimize/start response:", result);
  return result.task_id;
};

// 2. Function to CHECK STATUS and pick up data if ready
export const checkOptimizationStatus = async (
  taskId: string,
): Promise<OptimizationStatusResponse> => {
  // Unknown or expired job (e.g. the backend restarted): stop polling instead of retrying forever.
  const response = await apiFetch(`/optimize/status/${taskId}`, {}, [404]);

  if (response.status === 404) {
    return { status: "failed", error: "Optimization job not found or expired." };
  }
  return (await response.json()) as OptimizationStatusResponse;
};
