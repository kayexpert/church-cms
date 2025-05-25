"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function MigratePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/migrate-income-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run migration");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Database Migration Tool</CardTitle>
          <CardDescription>
            Use this tool to run database migrations for maintenance tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="font-medium mb-2">Income Entries Migration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This migration will remove liability IDs from income entry descriptions and store them in the payment_details field instead.
            </p>
            <Button
              onClick={runMigration}
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? "Running Migration..." : "Run Migration"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Migration Completed</AlertTitle>
                <AlertDescription>
                  Processed {(result as any).totalProcessed} entries
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-2 text-sm font-medium">Results</div>
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify((result as any).results, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
