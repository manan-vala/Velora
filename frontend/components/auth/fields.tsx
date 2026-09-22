"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/map/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/map/ui/field";
import { Input } from "@/components/map/ui/input";

export function TextField({
  label,
  error,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
  const id = useId();
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id} className="text-sm">
        {label}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-9 text-sm"
        {...props}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

export function PasswordField({
  label,
  error,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id} className="text-sm">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-9 pr-9 text-sm"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
