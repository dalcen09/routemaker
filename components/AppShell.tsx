"use client";

import { ReactNode } from "react";
import { CustomerProvider } from "@/lib/CustomerContext";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/useAuth";

function Inner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <CustomerProvider user={user ?? null}>{children}</CustomerProvider>;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Inner>{children}</Inner>
    </AuthGuard>
  );
}
