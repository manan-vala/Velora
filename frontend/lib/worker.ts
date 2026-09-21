// Server-only: used by the API route handlers. WORKER_URL and WORKER_TOKEN have no
// NEXT_PUBLIC_ prefix, so Next never inlines them into client bundles.

const ANDROID_ORIGIN = "https://localhost";

export function corsHeaders(request: Request): Record<string, string> {
  if (request.headers.get("origin") !== ANDROID_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": ANDROID_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonError(
  request: Request,
  status: number,
  detail: string,
): Response {
  return Response.json({ detail }, { status, headers: corsHeaders(request) });
}

export async function forwardToWorker(
  request: Request,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const baseUrl = process.env.WORKER_URL;
  const token = process.env.WORKER_TOKEN;
  if (!baseUrl || !token) {
    console.error("[api] WORKER_URL or WORKER_TOKEN is not set");
    return jsonError(request, 500, "Backend gateway is not configured.");
  }

  const headers = new Headers(init.headers);
  headers.set("x-auth-token", token);

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[api] Worker request failed:", err);
    return jsonError(request, 502, "Backend is unreachable.");
  }

  // A Worker 401/403 means our token or path config is wrong, not that the user must log in.
  if (upstream.status === 401 || upstream.status === 403) {
    console.error(`[api] Worker rejected the request with ${upstream.status}`);
    return jsonError(request, 502, "Backend gateway is misconfigured.");
  }

  const responseHeaders = new Headers(corsHeaders(request));
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
