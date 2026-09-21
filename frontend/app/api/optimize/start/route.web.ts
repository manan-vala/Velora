import { forwardToWorker, jsonError, preflight } from "@/lib/worker";

// Vercel rejects function bodies above ~4.5 MB with an opaque error; fail clearly first.
const MAX_BODY_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return jsonError(request, 413, "Upload is too large (max 4 MB).");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(request, 400, "Expected multipart form data.");
  }

  const jsonData = form.get("json_data");
  const file = form.get("file");
  if (typeof jsonData !== "string" || !(file instanceof File)) {
    return jsonError(request, 400, "Both json_data and file are required.");
  }

  const upstreamForm = new FormData();
  upstreamForm.append("json_data", jsonData);
  upstreamForm.append("file", file, file.name);

  return forwardToWorker(request, "/process-routes/start", {
    method: "POST",
    body: upstreamForm,
  });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
