import SignupForm from "@/components/auth/SignupForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata = { title: "Create an account — Velora" };

export default function SignupPage() {
  return (
    <RedirectIfSignedIn>
      <SignupForm />
    </RedirectIfSignedIn>
  );
}
