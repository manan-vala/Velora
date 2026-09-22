"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField, TextField } from "@/components/auth/fields";
import { FormError, SubmitButton } from "@/components/auth/form-parts";
import { FieldDescription, FieldGroup } from "@/components/map/ui/field";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useSignup } from "@/hooks/useSession";

// Mirrors the backend rules so mistakes are caught before a round trip.
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD_BYTES = 72;

function validate(username: string, password: string, confirm: string) {
  const errors: { username?: string; password?: string; confirm?: string } = {};
  if (!USERNAME_RE.test(username)) {
    errors.username = "3-32 characters: lowercase letters, digits, '.', '_' or '-'.";
  }
  if (password.length < MIN_PASSWORD) {
    errors.password = `At least ${MIN_PASSWORD} characters.`;
  } else if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    errors.password = `At most ${MAX_PASSWORD_BYTES} bytes.`;
  }
  if (confirm !== password) {
    errors.confirm = "Passwords don't match.";
  }
  return errors;
}

export default function SignupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const signup = useSignup();
  const { redirectAfterAuth } = useAuthRedirect();

  const normalized = username.trim().toLowerCase();
  const errors = validate(normalized, password, confirm);
  const shown = showErrors ? errors : {};

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (signup.isPending || Object.keys(errors).length > 0) return;
    signup.mutate({ username: normalized, password }, { onSuccess: redirectAfterAuth });
  };

  return (
    <AuthShell
      title="Create an account"
      description="Anyone can sign up. Your routes and run history stay private to you."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground font-medium underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <FieldGroup className="gap-4">
          <FormError error={signup.error} />
          <TextField
            label="Username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={shown.username}
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
            error={shown.password}
            autoComplete="new-password"
            required
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={shown.confirm}
            autoComplete="new-password"
            required
          />
          <FieldDescription className="text-xs">
            Usernames are stored in lowercase.
          </FieldDescription>
          <SubmitButton pending={signup.isPending}>Create account</SubmitButton>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
