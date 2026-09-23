import { clearedSessionCookie, errorMessage, sessionToken } from "@/lib/session";
import { callWorker, corsHeaders, jsonError, preflight } from "@/lib/worker";

export async function GET(request: Request) {
  const token = sessionToken(request);
  if (!token) return jsonError(request, 401, "Not signed in.");

  const result = await callWorker(request, "/auth/me", {
    headers: { authorization: `Bearer ${token}` },
  });
  if ("error" in result) return result.error;
  const { upstream } = result;
  const body = await upstream.json().catch(() => null);

  const headers = new Headers(corsHeaders(request));
  headers.set("cache-control", "no-store");

  if (upstream.status === 401) {
    // Expired or revoked: drop the cookie so the browser stops sending it.
    headers.append("set-cookie", clearedSessionCookie());
    return Response.json({ detail: "Your session has expired. Please sign in again." }, { status: 401, headers });
  }
  if (!upstream.ok || typeof body?.username !== "string") {
    return jsonError(request, upstream.ok ? 502 : upstream.status, errorMessage(body, "Could not load your session."));
  }
  return Response.json(
    { user: { username: body.username, is_admin: body.is_admin === true } },
    { status: 200, headers },
  );
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
