import { clearedSessionCookie } from "@/lib/session";
import { corsHeaders, crossSiteRejection, preflight } from "@/lib/worker";

// JWTs are stateless, so logging out means dropping the cookie; the app build discards its copy.
export function POST(request: Request) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  const headers = new Headers(corsHeaders(request));
  headers.append("set-cookie", clearedSessionCookie());
  return new Response(null, { status: 204, headers });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
