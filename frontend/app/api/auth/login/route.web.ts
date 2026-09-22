import { startSession } from "@/lib/auth-routes";
import { preflight } from "@/lib/worker";

export function POST(request: Request) {
  return startSession(request, "/auth/login");
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
