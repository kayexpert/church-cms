"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { checkDatabaseHealth } from "@/lib/db-enhanced";

interface ConnectionErrorProps {
  error?: Error | string;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function ConnectionError({
  error,
  onRetry,
  title = "Connection Error",
  description = "We're having trouble connecting to our services.",
}: ConnectionErrorProps) {
  // Initialize with null to avoid hydration mismatch
  const [isClient, setIsClient] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<{ healthy: boolean; error?: string } | null>(null);

  // First, detect if we're on the client
  useEffect(() => {
    setIsClient(true);
    setIsOnline(navigator.onLine);
  }, []);

  // Monitor online status - only after client detection
  useEffect(() => {
    if (!isClient) return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isClient]);

  // Check database health - only after client detection
  useEffect(() => {
    if (!isClient || isOnline !== true) return;

    const checkHealth = async () => {
      try {
        const health = await checkDatabaseHealth();
        setDbStatus(health);
      } catch (err) {
        setDbStatus({ healthy: false, error: err instanceof Error ? err.message : String(err) });
      }
    };

    checkHealth();
  }, [isClient, isOnline]);

  const handleRetry = async () => {
    if (!isClient) return;

    setIsRetrying(true);

    try {
      // Check database health first
      const health = await checkDatabaseHealth();
      setDbStatus(health);

      // If database is healthy or we have a custom retry handler, call it
      if (health.healthy || onRetry) {
        onRetry?.();
      }

      // If we don't have a custom retry handler, reload the page
      if (!onRetry) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error during retry:", err);
    } finally {
      setIsRetrying(false);
    }
  };

  const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error");

  // Render a simplified version during SSR to avoid hydration mismatch
  if (!isClient) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-red-200">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">Checking connection status...</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            disabled={true}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Client-side rendering after hydration
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-red-200">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          {isOnline === false ? <WifiOff className="h-5 w-5 text-red-500" /> : <Wifi className="h-5 w-5 text-amber-500" />}
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 break-words">
            {isOnline === false ? (
              <p>You appear to be offline. Please check your internet connection and try again.</p>
            ) : dbStatus?.healthy === false ? (
              <p>Database connection error: {dbStatus.error || "Unable to connect to the database."}</p>
            ) : (
              <p>{errorMessage}</p>
            )}
          </div>
        </div>

        {isOnline !== false && (
          <div className="text-sm text-gray-600">
            <p>This could be due to:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Temporary service disruption</li>
              <li>Network connectivity issues</li>
              <li>Server maintenance</li>
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleRetry}
          disabled={isRetrying || isOnline === false}
          className="w-full"
          variant="default"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
