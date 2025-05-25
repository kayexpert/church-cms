'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BirthdayMessageForm } from '@/components/messaging/birthday-message-form';
import { MessageList } from '@/components/messaging/message-list';
import { BirthdayMembersList } from '@/components/messaging/birthday-members-list';
import { BirthdayMessageFormValues } from '@/types/birthday-messaging';
import { createBirthdayMessage } from '@/services/birthday-message-service';
import { useMutation } from '@tanstack/react-query';

export function BirthdayMessageTab() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [configError, setConfigError] = useState<string | null>(null);

  // Use React Query for mutations
  const createMessage = useMutation({
    mutationFn: createBirthdayMessage,
    onSuccess: () => {
      setRefreshTrigger(prev => prev + 1);
    }
  });

  const handleSubmit = async (values: BirthdayMessageFormValues) => {
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
  };

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
          <h2 className="text-lg md:text-xl font-medium mb-3 md:mb-4">Create Birthday Message</h2>
          <BirthdayMessageForm
            onSubmit={handleSubmit}
            isSubmitting={createMessage.isPending}
          />
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-medium mb-3 md:mb-4">Birthday Message History</h2>
          <MessageList
            type="birthday"
            refreshTrigger={refreshTrigger}
          />
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-medium mb-3 md:mb-4">Members with Birthdays</h2>
          <BirthdayMembersList
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </Card>
  );
}
