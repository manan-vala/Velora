import { sessionToken } from "@/lib/session";
import { forwardToWorker, jsonError, preflight } from "@/lib/worker";

// Task IDs are UUIDs; rejecting anything else keeps callers from reaching other backend paths.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const token = sessionToken(request);
  if (!token) return jsonError(request, 401, "Please sign in to check an optimization.");

  const { taskId } = await params;
  if (!UUID_RE.test(taskId)) {
    return jsonError(request, 400, "Invalid task id.");
  }

  return forwardToWorker(request, `/process-routes/status/${taskId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
