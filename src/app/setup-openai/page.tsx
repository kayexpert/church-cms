"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SetupOpenAIPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleSetupOpenAI = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/messaging/ai/setup-openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error setting up OpenAI:", error);
      setResult({ success: false, error: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Setup OpenAI Integration</CardTitle>
          <CardDescription>
            Configure OpenAI for message rephrasing functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            This will set up the OpenAI integration with the provided API key for message rephrasing functionality.
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            The API key is pre-configured in the backend for security reasons.
          </p>
          {result && (
            <div className={`p-3 rounded-md mt-4 ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {result.success ? (
                <p>{result.message}</p>
              ) : (
                <p>Error: {result.error}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSetupOpenAI} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Setup OpenAI Integration"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
