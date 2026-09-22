import { Suspense } from "react";

import SignupForm from "@/components/auth/SignupForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata = { title: "Create an account — Velora" };

export default function SignupPage() {
  return (
    <Suspense>
      <RedirectIfSignedIn>
        <SignupForm />
      </RedirectIfSignedIn>
    </Suspense>
  );
}
