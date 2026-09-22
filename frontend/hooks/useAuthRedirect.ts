"use client";

import { useRouter } from "next/navigation";
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

/**
 * Where a user belongs once signed in: the page they wanted, else the app for their device.
 * ?next is read at call time rather than with useSearchParams, which would make the whole
 * auth screen client-only and render a blank page until the JS arrives.
 */
export function useAuthRedirect() {
  const router = useRouter();

  const redirectAfterAuth = useCallback(() => {
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    router.replace(next ?? (isMobileViewport() ? "/mobile" : "/visualiser"));
  }, [router]);

  return { redirectAfterAuth };
}
