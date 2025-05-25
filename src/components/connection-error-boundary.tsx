"use client";

import { useState, useEffect, ReactNode, useCallback, memo } from "react";
import { ConnectionError } from "@/components/ui/connection-error";
import { checkDatabaseHealth } from "@/lib/db-enhanced";
import { useDebounceCallback } from "@/lib/performance-utils";

interface ConnectionErrorBoundaryProps {
  children: ReactNode;
}

// Memoized component to prevent unnecessary re-renders
export const ConnectionErrorBoundary = memo(function ConnectionErrorBoundary({ children }: ConnectionErrorBoundaryProps) {
  // Initialize with null to avoid hydration mismatch
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Memoized health check function with debouncing to prevent excessive calls
  const checkHealth = useCallback(async () => {
    if (!isClient || isOnline === false) return;

    try {
      const health = await checkDatabaseHealth();

      if (!health.healthy) {
        setError(new Error(health.error || "Database connection error"));
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [isClient, isOnline]);

  // Debounced health check to prevent excessive API calls
  const debouncedCheckHealth = useDebounceCallback(checkHealth, 1000, [checkHealth]);

  // First, detect if we're on the client
  useEffect(() => {
    setIsClient(true);
    setIsOnline(navigator.onLine);
  }, []);

  // Monitor online status - only run after initial client detection
  useEffect(() => {
    if (!isClient) return;

    const handleOnline = useCallback(() => {
      setIsOnline(true);
      // Check database health when we come back online (debounced)
      debouncedCheckHealth();
    }, [debouncedCheckHealth]);

    const handleOffline = useCallback(() => setIsOnline(false), []);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial health check (debounced)
    debouncedCheckHealth();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isClient, debouncedCheckHealth]);

  // Memoized retry handler
  const handleRetry = useCallback(async () => {
    setError(null);
    await checkHealth();
  }, [checkHealth]);

  // Always render children on the server to avoid hydration mismatch
  if (!isClient) {
    return <>{children}</>;
  }

  // Only show error UI on the client after hydration
  if (isOnline === false) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <ConnectionError
          title="You're Offline"
          description="Please check your internet connection and try again."
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <ConnectionError
          error={error}
          title="Connection Error"
          description="We're having trouble connecting to our services."
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return <>{children}</>;
});
