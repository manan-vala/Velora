"use client";

import Link from "next/link";

import { useSession } from "@/hooks/useSession";

/** Landing-page entry point: sign in, or straight into the app once signed in. */
export default function AuthNavLink() {
  const { user, isLoading } = useSession();
  if (isLoading) return null;

  return (
    <Link
      href={user ? "/visualiser" : "/login"}
      className="font-sans text-sm md:text-base text-[#0a0a0a] no-underline transition-opacity duration-300 ease-in-out hover:opacity-70"
    >
      {user ? "Open app" : "Sign in"}
    </Link>
  );
}
