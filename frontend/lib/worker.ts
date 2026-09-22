// Server-only: used by the API route handlers. WORKER_URL and WORKER_TOKEN have no
// NEXT_PUBLIC_ prefix, so Next never inlines them into client bundles.

export const ANDROID_ORIGIN = "https://localhost";

export function corsHeaders(request: Request): Record<string, string> {
  if (request.headers.get("origin") !== ANDROID_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": ANDROID_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
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
  headers: Record<string, string> = {},
): Response {
  return Response.json(
    { detail },
    { status, headers: { ...corsHeaders(request), ...headers } },
  );
}

/**
 * CSRF guard for state-changing routes. Browsers always send Origin on cross-site POSTs;
 * accept only our own host and the Capacitor app. No Origin means a non-browser caller.
 */
export function crossSiteRejection(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin || origin === ANDROID_ORIGIN) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return null;
  } catch {
    // malformed Origin header: fall through to reject
  }
  return jsonError(request, 403, "Cross-site request rejected.");
}

/**
 * Calls the Worker. Returns the upstream response, or an error Response for failures that
 * are ours (missing config, unreachable, Worker rejected our token/path).
 */
export async function callWorker(
  request: Request,
  path: string,
  init: RequestInit = {},
): Promise<{ upstream: Response } | { error: Response }> {
  const baseUrl = process.env.WORKER_URL;
  const token = process.env.WORKER_TOKEN;
  if (!baseUrl || !token) {
    console.error("[api] WORKER_URL or WORKER_TOKEN is not set");
    return { error: jsonError(request, 500, "Backend gateway is not configured.") };
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
    return { error: jsonError(request, 502, "Backend is unreachable.") };
  }

  // The Worker answers 401/403 in plain text when our token or path config is wrong. The
  // backend's own auth errors are JSON and are the user's to see (e.g. session expired).
  const isJson = upstream.headers.get("content-type")?.includes("application/json");
  if ((upstream.status === 401 || upstream.status === 403) && !isJson) {
    console.error(`[api] Worker rejected the request with ${upstream.status}`);
    return { error: jsonError(request, 502, "Backend gateway is misconfigured.") };
  }

  return { upstream };
}

export async function forwardToWorker(
  request: Request,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const result = await callWorker(request, path, init);
  if ("error" in result) return result.error;
  const { upstream } = result;

  const responseHeaders = new Headers(corsHeaders(request));
  for (const name of ["content-type", "retry-after", "www-authenticate"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
