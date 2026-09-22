"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField, TextField } from "@/components/auth/fields";
import { SubmitButton, FormError } from "@/components/auth/form-parts";
import { FieldGroup } from "@/components/map/ui/field";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useLogin } from "@/hooks/useSession";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const { redirectAfterAuth } = useAuthRedirect();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (login.isPending) return;
    login.mutate(
      { username: username.trim(), password },
      { onSuccess: redirectAfterAuth },
    );
  };

  const missing = !username.trim() || !password;

  return (
    <AuthShell
      title="Sign in"
      description="Use your Velora account to plan and view routes."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-foreground font-medium underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <FieldGroup className="gap-4">
          <FormError error={login.error} />
          <TextField
            label="Username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
          <PasswordField
            label="Password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <SubmitButton pending={login.isPending} disabled={missing}>
            Sign in
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
