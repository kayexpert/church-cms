"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * A button component that allows users to manually trigger the processing of scheduled messages
 * This processes messages directly from the client
 */
function ProcessScheduledMessagesButtonComponent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleProcessMessages = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setStatus(null);

    try {
      // First, check for any stuck messages in 'processing' state
      try {
        const stuckResponse = await fetch('/api/messaging/check-stuck-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (stuckResponse.ok) {
          const stuckData = await stuckResponse.json();
          if (stuckData.fixed > 0) {
            console.log(`Fixed ${stuckData.fixed} stuck messages`);
            toast.info(`Fixed ${stuckData.fixed} stuck messages`);
          }
        }
      } catch (stuckError) {
        console.log('Error checking for stuck messages, continuing with normal processing:', stuckError);
      }

      // Call the API endpoint to process scheduled messages
      const response = await fetch('/api/messaging/process-scheduled-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Set success status
      if (data.processed > 0) {
        const successMessage = `Processed ${data.processed} messages`;
        setStatus(`✅ ${successMessage}`);
        toast.success(successMessage);
      } else {
        setStatus('✓ No messages to process');
        toast.info('No scheduled messages to process');
      }
    } catch (error) {
      console.error('Error processing scheduled messages:', error);

      // Set error status
      const errorMessage = error instanceof Error ? error.message : "Failed to process";
      setStatus(`❌ Error: ${errorMessage}`);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);

      // Clear status after 5 seconds
      setTimeout(() => {
        setStatus(null);
      }, 5000);
    }
  }, [isProcessing]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleProcessMessages}
        disabled={isProcessing}
        className="flex items-center gap-1"
        title="Process scheduled messages directly from the client"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4" />
            <span>Process Messages</span>
          </>
        )}
      </Button>

      {status && (
        <span className="text-sm text-muted-foreground">{status}</span>
      )}
    </div>
  );
}

// Export memoized component for better performance
export const ProcessScheduledMessagesButton = memo(ProcessScheduledMessagesButtonComponent);
