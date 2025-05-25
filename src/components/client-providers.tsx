"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { MessagingProvider } from "@/contexts/messaging-context";
import { PageConnectionBoundary } from "@/components/page-connection-boundary";

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <PageConnectionBoundary>
      <AuthProvider>
        <QueryProvider>
          <MessagingProvider>
            {children}
          </MessagingProvider>
        </QueryProvider>
      </AuthProvider>
    </PageConnectionBoundary>
  );
}
