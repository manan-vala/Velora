import {
  ParsedData,
  OptimizationStartResponse,
  OptimizationStatusResponse,
} from "@/types";

// Web calls its own Vercel API routes; the app build sets the absolute Vercel URL.
const apiURL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/optimize";

// 1. Function to DROP OFF data and get a Task ID
export const startOptimizationJob = async (
  data: ParsedData,
  file: File,
): Promise<string> => {
  console.log("[API] Parsed Excel JSON being sent:", data);

  const formData = new FormData();
  formData.append("json_data", JSON.stringify(data));
  formData.append("file", file, file.name);

  const response = await fetch(`${apiURL}/start`, {
    method: "POST",
    body: formData, // Do NOT set Content-Type, browser handles boundary automatically
  });

  if (!response.ok)
    throw new Error(`Error: ${response.status} ${response.statusText}`);

  const result: OptimizationStartResponse = await response.json();
  console.log("[API] /start response:", result);
  return result.task_id;
};

// 2. Function to CHECK STATUS and pick up data if ready
export const checkOptimizationStatus = async (
  taskId: string,
): Promise<OptimizationStatusResponse> => {
  const response = await fetch(`${apiURL}/status/${taskId}`);

  if (!response.ok) throw new Error(`Status Error: ${response.status}`);

  const result: OptimizationStatusResponse = await response.json();
  console.log(`[API] /status/${taskId} response:`, result);
  return result;
};
