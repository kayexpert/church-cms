"use client";

import { useState, useEffect, ReactNode, useCallback } from "react";
import { ConnectionError } from "@/components/ui/connection-error";

interface PageConnectionBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function PageConnectionBoundary({ children, fallback }: PageConnectionBoundaryProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Define callbacks at component level (not inside useEffect)
  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);

  // First, detect if we're on the client
  useEffect(() => {
    setIsClient(true);
    setIsOnline(navigator.onLine);
  }, []);

  // Monitor online status - only run after initial client detection
  useEffect(() => {
    if (!isClient) return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isClient, handleOnline, handleOffline]);

  // Always render children on the server to avoid hydration mismatch
  if (!isClient) {
    return <>{children}</>;
  }

  // Only show error UI on the client after hydration
  if (isOnline === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <ConnectionError
          title="You're Offline"
          description="Please check your internet connection and try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return <>{children}</>;
}
