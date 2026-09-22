"use client";

import { useEffect, type ReactNode } from "react";

import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useSession } from "@/hooks/useSession";

/** Signed-in users have no reason to see the login or signup screen. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();
  const { redirectAfterAuth } = useAuthRedirect();

  useEffect(() => {
    if (!isLoading && isAuthenticated) redirectAfterAuth();
  }, [isAuthenticated, isLoading, redirectAfterAuth]);

  return <>{children}</>;
}
