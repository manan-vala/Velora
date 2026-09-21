import {
  ParsedData,
  OptimizationStartResponse,
  OptimizationStatusResponse,
} from "@/types";

const apiURL = process.env.NEXT_PUBLIC_MAIN_API_URL || "";

// 1. Function to DROP OFF data and get a Task ID
export const startOptimizationJob = async (
  data: ParsedData,
  file: File,
): Promise<string> => {
  if (!apiURL) {
    throw new Error(
      "API URL is not defined. Please set NEXT_PUBLIC_MAIN_API_URL in your .env file.",
    );
  }

  console.log("[API] Parsed Excel JSON being sent:", data);

  const formData = new FormData();
  formData.append("json_data", JSON.stringify(data));
  formData.append("file", file, file.name);

  // Note: Adjust the endpoint path "/optimize/start" to match your backend
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
  // Note: Adjust the endpoint path "/optimize/status/" to match your backend
  const response = await fetch(`${apiURL}/status/${taskId}`);

  if (!response.ok) throw new Error(`Status Error: ${response.status}`);

  const result: OptimizationStatusResponse = await response.json();
  console.log(`[API] /status/${taskId} response:`, result);
  return result;
};
