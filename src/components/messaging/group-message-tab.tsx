"use client";

import { useState, memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageForm } from "@/components/messaging/message-form";
import { MessageList } from "@/components/messaging/message-list";
import { MessageFormValues } from "@/types/messaging";
import { useMessageMutations } from "@/hooks/use-messaging";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

function GroupMessageTabComponent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isCreatingMessage, setIsCreatingMessage] = useState(false);
  const { createMessage } = useMessageMutations();

  const handleSubmit = useCallback(async (values: MessageFormValues) => {
    try {
      // Validate required fields with toast notifications
      if (!values.name || values.name.trim() === '') {
        toast.error("Message name is required");
        return;
      }

      if (!values.content || values.content.trim() === '') {
        toast.error("Message content is required");
        return;
      }

      if (!values.recipients.ids || values.recipients.ids.length === 0) {
        toast.error("At least one group is required");
        return;
      }

      setConfigError(null);
      setIsCreatingMessage(true);

      // Show a loading toast that will be updated with the result
      const loadingToast = toast.loading("Creating group message...");

      const result = await createMessage.mutateAsync(values);

      // Check if there was an error related to SMS configuration
      if (result.error && typeof result.error === 'object' && result.error.noProviderConfigured) {
        setConfigError("No SMS provider configured. Please set up an SMS provider in the messaging settings.");
        toast.error("SMS configuration error", {
          id: loadingToast,
          description: "No SMS provider configured. Please set up an SMS provider in the messaging settings."
        });
      } else if (result.data?.mockWarning) {
        toast.warning("Message created with mock provider", {
          id: loadingToast,
          description: "The message was created but no actual SMS was sent because you're using a mock provider. Configure a real SMS provider in settings."
        });
      } else if (result.data) {
        // Get the bulk send statistics if available
        const stats = result.data.bulkSendStats;

        if (stats && values.status === 'active' && values.schedule_time <= new Date()) {
          // If the message was sent immediately, show detailed stats
          toast.success(
            "Group message sent successfully!",
            {
              id: loadingToast,
              description: `Sent to ${stats.totalSent} of ${stats.totalRecipients} recipients` +
                (stats.totalFailed > 0 ? ` (${stats.totalFailed} failed)` : '') +
                (stats.invalidCount > 0 ? ` (${stats.invalidCount} invalid numbers skipped)` : '')
            }
          );
        } else {
          // If the message was scheduled, show scheduling info
          toast.success("Group message created successfully", {
            id: loadingToast,
            description: values.schedule_time <= new Date() && values.status === 'active'
              ? "Group message was created and will be sent to all active members in the selected groups"
              : "Group message was created and will be sent at the scheduled time"
          });
        }
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error creating group message:", error);
      toast.error("Failed to create group message", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      // Always reset the creating message state
      setIsCreatingMessage(false);

      // Ensure any stuck toast is cleared after a timeout
      setTimeout(() => {
        toast.dismiss();
      }, 5000);
    }
  }, [createMessage, setRefreshTrigger, setConfigError]);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Group Message</h1>
        <p className="text-muted-foreground">
          Send one-time or recurring messages to groups of members (only active members in the group will receive messages)
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

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-medium mb-4">Create Group Message</h2>
          <MessageForm
            onSubmit={handleSubmit}
            isSubmitting={createMessage.isPending || isCreatingMessage}
            type="group"
          />
        </div>

        <div>
          <h2 className="text-xl font-medium mb-4">Group Message History</h2>
          <MessageList
            type="group"
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </Card>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const GroupMessageTab = memo(GroupMessageTabComponent);
