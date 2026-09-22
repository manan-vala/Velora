// Server-only: used by the /api/auth/login route handler.

import { errorMessage, sessionResponse, type BackendToken } from "./session";
import { callWorker, crossSiteRejection, jsonError } from "./worker";

export async function readCredentials(
  request: Request,
): Promise<{ username: string; password: string } | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(request, 400, "Expected a JSON body.");
  }
  const { username, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string") {
    return jsonError(request, 400, "Username and password are required.");
  }
  return { username, password };
}

/** Exchanges credentials for a backend token and turns it into a session. */
export async function startSession(request: Request): Promise<Response> {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  const creds = await readCredentials(request);
  if (creds instanceof Response) return creds;

  const result = await callWorker(request, "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(creds).toString(),
  });
  if ("error" in result) return result.error;
  const { upstream } = result;

  const body = await upstream.json().catch(() => null);
  if (upstream.ok && body && typeof (body as BackendToken).access_token === "string") {
    return sessionResponse(request, body as BackendToken);
  }

  const retryAfter = upstream.headers.get("retry-after");
  return jsonError(
    request,
    upstream.ok ? 502 : upstream.status,
    errorMessage(body, "Something went wrong. Please try again."),
    retryAfter ? { "retry-after": retryAfter } : {},
  );
}
