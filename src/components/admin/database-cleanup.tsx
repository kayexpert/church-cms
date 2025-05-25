"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Database Cleanup Component
 * Provides a UI for cleaning up and optimizing the database
 */
export function DatabaseCleanup() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    details?: any;
  } | null>(null);

  const runDatabaseCleanup = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      // Call the cleanup-database API
      const response = await fetch("/api/db/cleanup-database");
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Database cleanup completed successfully"
        });
        toast.success("Database cleanup completed successfully");
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to clean up database",
          details: data.details || data
        });
        toast.error("Failed to clean up database");
      }
    } catch (error) {
      console.error("Error during database cleanup:", error);
      setResult({
        success: false,
        error: "An unexpected error occurred",
        details: error
      });
      toast.error("An unexpected error occurred during database cleanup");
    } finally {
      setIsRunning(false);
    }
  };

  const fixAssetDisposalFunction = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      // Call the fix-dispose-asset-function API
      const response = await fetch("/api/db/fix-dispose-asset-function");
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Asset disposal function fixed successfully"
        });
        toast.success("Asset disposal function fixed successfully");
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to fix asset disposal function",
          details: data.details || data
        });
        toast.error("Failed to fix asset disposal function");
      }
    } catch (error) {
      console.error("Error fixing asset disposal function:", error);
      setResult({
        success: false,
        error: "An unexpected error occurred",
        details: error
      });
      toast.error("An unexpected error occurred while fixing asset disposal function");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <span>Database Maintenance</span>
        </CardTitle>
        <CardDescription>
          Optimize database performance and clean up temporary tables
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">What this will do:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Remove temporary and backup tables</li>
            <li>Optimize database tables for better performance</li>
            <li>Update statistics for the query planner</li>
            <li>Verify and create necessary indexes</li>
            <li>Fix the asset disposal function</li>
          </ul>
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {result.success ? "Success" : "Error"}
            </AlertTitle>
            <AlertDescription>
              {result.success ? result.message : result.error}
              {!result.success && result.details && (
                <pre className="mt-2 p-2 bg-destructive/10 rounded text-xs overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runDatabaseCleanup}
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize Database
              </>
            )}
          </Button>
          <Button
            onClick={fixAssetDisposalFunction}
            disabled={isRunning}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Fix Asset Disposal Function
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
