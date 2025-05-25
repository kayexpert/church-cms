'use client';

import { useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';

/**
 * A button to manually trigger the cron job for scheduled messages
 * This is useful for testing purposes
 */
function TriggerCronButtonComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTriggerCron = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      toast.info('Triggering server-side scheduled message processing...');

      const response = await fetch('/api/messaging/trigger-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const processedCount = data.details?.processed || 0;
        toast.success(
          processedCount > 0
            ? `Processed ${processedCount} scheduled messages`
            : 'No scheduled messages to process'
        );
      } else {
        toast.error('Failed to process scheduled messages');
        console.error('Error triggering cron job:', data.error);
      }
    } catch (error) {
      console.error('Error triggering cron job:', error);
      toast.error(`Failed to trigger cron job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <Button
      onClick={handleTriggerCron}
      disabled={isLoading}
      variant="outline"
      size="sm"
      title="Manually trigger scheduled message processing (normally runs daily at 8:00 AM UTC)"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Clock className="mr-2 h-4 w-4" />
          Run Cron Job
        </>
      )}
    </Button>
  );
}

// Export memoized component for better performance
export const TriggerCronButton = memo(TriggerCronButtonComponent);
