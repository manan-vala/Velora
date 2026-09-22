"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Only same-site paths, so ?next= can't bounce anyone to another origin. */
export function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

/** Where a user belongs once signed in: the page they wanted, else the app for their device. */
export function useAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const redirectAfterAuth = useCallback(() => {
    router.replace(next ?? (isMobileViewport() ? "/mobile" : "/visualiser"));
  }, [next, router]);

  return { redirectAfterAuth, next };
}
