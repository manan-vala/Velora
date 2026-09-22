import { startSession } from "@/lib/auth-routes";
import { preflight } from "@/lib/worker";

export function POST(request: Request) {
  return startSession(request, "/auth/register");
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
