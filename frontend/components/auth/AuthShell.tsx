"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/map/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-theme flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="flex flex-col items-center gap-1">
        <span className="text-xl font-semibold tracking-tight">Velora</span>
        <span className="text-muted-foreground text-xs">Corporate fleet routing</span>
      </Link>

      <Card className="w-full max-w-sm gap-5 py-6 shadow-sm">
        <CardHeader className="gap-1.5 px-6">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-6">{children}</CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">{footer}</p>
    </div>
  );
}
