import LoginForm from "@/components/auth/LoginForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata = { title: "Sign in — Velora" };

export default function LoginPage() {
  return (
    <RedirectIfSignedIn>
      <LoginForm />
    </RedirectIfSignedIn>
  );
}
