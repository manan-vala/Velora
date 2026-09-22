// Server-only session helpers for the API route handlers.
// The web app's session is the backend JWT stored in an httpOnly cookie, so page scripts
// never see the token. The Capacitor app can't rely on cross-site cookies; it receives the
// token in the login response and sends it back as an Authorization header.

import { ANDROID_ORIGIN, corsHeaders } from "./worker";

export const SESSION_COOKIE = "velora_session";

export interface BackendToken {
  access_token: string;
  expires_in: number;
  username: string;
}

function cookieAttributes(maxAgeSeconds: number): string {
  const parts = [
    "Path=/api",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; ${cookieAttributes(maxAgeSeconds)}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

/** The caller's JWT: an explicit Bearer header (app build) wins over the session cookie (web). */
export function sessionToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  return readCookie(request, SESSION_COOKIE);
}

export function isAppClient(request: Request): boolean {
  return request.headers.get("origin") === ANDROID_ORIGIN;
}

/** Builds the login/signup success response: cookie for the web, token in the body for the app. */
export function sessionResponse(request: Request, token: BackendToken): Response {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  const body: Record<string, unknown> = { user: { username: token.username }, expiresAt };
  if (isAppClient(request)) body.token = token.access_token;

  const headers = new Headers(corsHeaders(request));
  headers.set("content-type", "application/json");
  headers.set("cache-control", "no-store");
  if (!isAppClient(request)) {
    headers.append("set-cookie", sessionCookie(token.access_token, token.expires_in));
  }
  return new Response(JSON.stringify(body), { status: 200, headers });
}

/** Turns a FastAPI error body into one readable sentence for the forms. */
export function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string") {
      const msg = first.msg.replace(/^Value error, /, "");
      return msg.charAt(0).toUpperCase() + msg.slice(1) + ".";
    }
  }
  return fallback;
}
