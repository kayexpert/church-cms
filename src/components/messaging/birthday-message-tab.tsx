'use client';

import { useState, useCallback, memo, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Play, Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BirthdayMessageFormValues } from '@/types/birthday-messaging';
import { createBirthdayMessage } from '@/services/birthday-message-service';
import { useMutation } from '@tanstack/react-query';

// Lazy load components for better performance
const BirthdayMessageForm = lazy(() =>
  import('@/components/messaging/birthday-message-form')
    .then(mod => ({ default: mod.BirthdayMessageForm }))
);

const MessageList = lazy(() =>
  import('@/components/messaging/message-list')
    .then(mod => ({ default: mod.MessageList }))
);

const BirthdayMembersList = lazy(() =>
  import('@/components/messaging/birthday-members-list')
    .then(mod => ({ default: mod.BirthdayMembersList }))
);

export function BirthdayMessageTab() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isTestingCron, setIsTestingCron] = useState(false);

  // Use React Query for mutations
  const createMessage = useMutation({
    mutationFn: createBirthdayMessage,
    onSuccess: () => {
      setRefreshTrigger(prev => prev + 1);
    }
  });

  // Memoized loading skeleton component
  const LoadingSkeleton = useCallback(() => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  ), []);

  const handleSubmit = useCallback(async (values: BirthdayMessageFormValues) => {
    try {
      // Clear any previous config errors
      setConfigError(null);

      // Show loading toast
      const loadingToastId = toast.loading("Creating birthday message...");

      // Use our specialized function for birthday messages
      const result = await createBirthdayMessage(values);

      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      if (result.data) {
        // If successful, show success message
        toast.success("Birthday message created successfully", {
          description: "Birthday message will be sent automatically on members' birthdays"
        });
      } else if (result.error) {
        // Check if there was an error related to SMS configuration
        if (typeof result.error === 'object' && result.error.noProviderConfigured) {
          setConfigError("No SMS provider configured. Please set up an SMS provider in the messaging settings.");
          toast.error("SMS configuration error", {
            description: "No SMS provider configured. Please set up an SMS provider in the messaging settings.",
            duration: 8000,
            action: {
              label: 'Settings',
              onClick: () => {
                window.location.href = '/settings?tab=messages';
              }
            }
          });
        } else {
          // Handle other specific errors
          console.error("Error in birthday message creation:", result.error);

          // Create a more user-friendly error message
          const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
          let errorTitle = 'Failed to create birthday message';
          let errorDescription = errorMessage;

          // Map common error messages to user-friendly messages
          if (errorMessage.includes('Failed to parse API response')) {
            errorTitle = 'Server error';
            errorDescription = 'The server returned an invalid response. Please try again later.';
          } else if (errorMessage.includes('No SMS provider configured')) {
            errorTitle = 'SMS provider not configured';
            errorDescription = 'Please set up an SMS provider in the messaging settings.';
          } else if (errorMessage.includes('Invalid request body')) {
            errorTitle = 'Invalid form data';
            errorDescription = 'Please check your form inputs and try again.';
          }

          toast.error(errorTitle, {
            description: errorDescription,
            duration: 8000
          });
        }
      }

      // Increment the refresh trigger to cause the message list to refresh
      setRefreshTrigger(prev => prev + 1);

      // Add a small delay and refresh again to ensure the list is updated
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error creating birthday message:", error);
      toast.error("Failed to create birthday message", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        duration: 8000
      });
    }
  }, []);

  // Function to test the birthday message cron job
  const handleTestCronJob = useCallback(async () => {
    setIsTestingCron(true);

    try {
      // Show loading toast
      const loadingToastId = toast.loading("Running birthday message cron job...", {
        description: "This will check for members with birthdays today and send them birthday messages."
      });

      // Call the test cron endpoint
      const response = await fetch('/api/test/birthday-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          const { totalMessages, totalMembers, successCount, failureCount } = data;

          toast.success("Birthday message cron job completed successfully!", {
            description: `Processed ${totalMessages} message(s) for ${totalMembers} member(s). ${successCount} sent, ${failureCount} failed.`,
            duration: 8000
          });
        } else {
          toast.error("Cron job completed with errors", {
            description: data.error || "Unknown error occurred",
            duration: 8000
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast.error("Failed to run cron job", {
          description: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          duration: 8000
        });
      }

      // Refresh the lists to show any new message logs
      setRefreshTrigger(prev => prev + 1);

    } catch (error) {
      console.error("Error testing cron job:", error);
      toast.error("Failed to run birthday message cron job", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        duration: 8000
      });
    } finally {
      setIsTestingCron(false);
    }
  }, []);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold mb-2">Birthday Messages</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Set up automated birthday messages to be sent to active members
        </p>
      </div>

      {configError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>SMS Configuration Error</AlertTitle>
          <AlertDescription>
            {configError}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6 md:space-y-8">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl font-medium">Create Birthday Message</h2>
            <Button
              onClick={handleTestCronJob}
              disabled={isTestingCron}
              variant="outline"
              size="sm"
              className="w-fit"
            >
              {isTestingCron ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Cron Job...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Test Birthday Cron Job
                </>
              )}
            </Button>
          </div>
          <Suspense fallback={<LoadingSkeleton />}>
            <BirthdayMessageForm
              onSubmit={handleSubmit}
              isSubmitting={createMessage.isPending}
            />
          </Suspense>
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-medium mb-3 md:mb-4">Birthday Message History</h2>
          <Suspense fallback={<LoadingSkeleton />}>
            <MessageList
              type="birthday"
              refreshTrigger={refreshTrigger}
            />
          </Suspense>
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-medium mb-3 md:mb-4">Members with Birthdays</h2>
          <Suspense fallback={<LoadingSkeleton />}>
            <BirthdayMembersList
              refreshTrigger={refreshTrigger}
            />
          </Suspense>
        </div>
      </div>
    </Card>
  );
}
