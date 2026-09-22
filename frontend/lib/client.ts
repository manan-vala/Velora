// Client-side HTTP helper for the Vercel API routes.
//
// Web build: the session is an httpOnly cookie, sent automatically; no token is stored here.
// App build (Capacitor static export): cross-site cookies don't survive, so login hands the
// token to the client and it travels as an Authorization header. The WebView's origin is
// private to the app, so localStorage is the practical place to keep it.

// The API root: "/api" on the web, "https://<vercel-domain>/api" in the packaged app.
export const API_ROOT = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");

const TOKEN_KEY = "velora.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string) {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // private mode or storage disabled
  }
}

export function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Without storage the app build just asks for login again next launch.
  }
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // non-JSON error body
  }
  return fallback;
}

/** `allowStatuses` are returned to the caller instead of throwing (e.g. an expected 404). */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  allowStatuses: number[] = [],
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = storedToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.ok || allowStatuses.includes(response.status)) return response;

  const message = await readError(response, `Request failed (${response.status}).`);
  if (response.status === 401) throw new UnauthorizedError(message);
  const retryAfter = Number(response.headers.get("retry-after"));
  throw new ApiError(response.status, message, Number.isFinite(retryAfter) ? retryAfter : undefined);
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  return (await response.json()) as T;
}
