"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/map/ui/alert";
import { Button } from "@/components/map/ui/button";
import { ApiError } from "@/lib/client";

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;

  let message = "Something went wrong. Please try again.";
  if (error instanceof ApiError) {
    message = error.message;
    if (error.status === 429 && error.retryAfter) {
      const minutes = Math.ceil(error.retryAfter / 60);
      message = `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
    }
  } else if (error instanceof TypeError) {
    message = "Can't reach the server. Check your connection and try again.";
  }

  return (
    <Alert variant="destructive" className="py-2.5 text-sm">
      <AlertCircle className="size-4" />
      <AlertDescription className="text-sm">{message}</AlertDescription>
    </Alert>
  );
}

export function SubmitButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending || disabled} className="h-9 w-full text-sm">
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
