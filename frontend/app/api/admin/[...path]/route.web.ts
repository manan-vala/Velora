import { sessionToken } from "@/lib/session";
import { crossSiteRejection, forwardToWorker, jsonError, preflight } from "@/lib/worker";

// Only the shapes the backend admin API actually exposes, so nothing else is reachable
// through this proxy: users, users/<name>, users/<name>/{password,revoke,restore}.
const SEGMENT = /^[a-z0-9._-]{1,64}$/i;
const ACTIONS = new Set(["password", "revoke", "restore"]);

function backendPath(segments: string[]): string | null {
  if (segments[0] !== "users" || !segments.every((s) => SEGMENT.test(s))) return null;
  if (segments.length === 1) return "/admin/users";
  if (segments.length === 2) return `/admin/users/${segments[1]}`;
  if (segments.length === 3 && ACTIONS.has(segments[2])) return `/admin/users/${segments[1]}/${segments[2]}`;
  return null;
}

async function proxy(request: Request, params: Promise<{ path: string[] }>, method: "GET" | "POST" | "DELETE") {
  if (method !== "GET") {
    const rejected = crossSiteRejection(request);
    if (rejected) return rejected;
  }

  const token = sessionToken(request);
  if (!token) return jsonError(request, 401, "Please sign in.");

  const path = backendPath((await params).path ?? []);
  if (!path) return jsonError(request, 404, "Unknown admin endpoint.");

  const init: RequestInit = { method, headers: { authorization: `Bearer ${token}` } };
  if (method === "POST") {
    const body = await request.text();
    if (body) {
      init.body = body;
      init.headers = { ...init.headers, "content-type": "application/json" };
    }
  }
  return forwardToWorker(request, path, init);
}

export function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "GET");
}

export function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "POST");
}

export function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "DELETE");
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
