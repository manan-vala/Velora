"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/hooks/useSession";

/** Admin-only pages. The backend enforces this too; this keeps the UI out of the way. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isAdmin } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login?next=%2Fadmin");
    else if (!isAdmin) router.replace("/visualiser");
  }, [isAdmin, isAuthenticated, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="auth-theme flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-label="Checking your access" />
      </div>
    );
  }

  return <>{children}</>;
}
