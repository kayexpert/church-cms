"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessagingConfiguration, MessagingConfigFormValues } from "@/types/messaging";

// SMS Provider Configuration Hooks

/**
 * Hook to fetch all SMS provider configurations
 */
export function useMessagingConfigurations() {
  return useQuery({
    queryKey: ["messagingConfigurations"],
    queryFn: async () => {
      try {
        console.log('Fetching messaging configurations...');
        const response = await fetch("/api/messaging/config");

        // Log the raw response for debugging
        const responseText = await response.text();
        console.log('Raw response:', responseText);

        // Parse the response
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          throw new Error(`Failed to parse response: ${responseText}`);
        }

        if (!response.ok) {
          console.error('Error response:', data);
          throw new Error(data.message || data.error || "Failed to fetch messaging configurations");
        }

        console.log('Fetched configurations:', data.data);
        return data.data as MessagingConfiguration[];
      } catch (error) {
        console.error('Error in messaging configurations query:', error);
        throw error;
      }
    },
    // Set a short staleTime to ensure fresh data but avoid too many refetches
    staleTime: 5000, // 5 seconds
    // Retry failed requests
    retry: 2,
    // Log errors
    onError: (error) => {
      console.error('Error in messaging configurations query:', error);
    }
  });
}

/**
 * Hook to create, update, and delete SMS provider configurations
 */
export function useMessagingConfigMutations() {
  const queryClient = useQueryClient();

  const createMessagingConfig = useMutation({
    mutationFn: async (config: MessagingConfigFormValues) => {
      try {
        console.log('Creating messaging configuration with:', config);
        const response = await fetch("/api/messaging/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        // Log the raw response for debugging
        const responseText = await response.text();
        console.log('Raw response from create:', responseText);

        // Parse the response
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing create response:', parseError);
          throw new Error(`Failed to parse create response: ${responseText}`);
        }

        if (!response.ok) {
          console.error('Error response from create:', data);
          throw new Error(data.message || data.error || data.details || "Failed to create messaging configuration");
        }

        console.log('Created configuration:', data.data);
        return data.data as MessagingConfiguration;
      } catch (error) {
        console.error('Error in createMessagingConfig mutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Create mutation succeeded with data:', data);
      // Force invalidate the query to ensure the UI updates
      queryClient.invalidateQueries({ queryKey: ["messagingConfigurations"] });
      toast.success("SMS provider configuration created successfully");
    },
    onError: (error) => {
      console.error('Create mutation error:', error);
      toast.error(`Error creating SMS provider configuration: ${error.message}`);
    },
  });

  const updateMessagingConfig = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: MessagingConfigFormValues }) => {
      const response = await fetch(`/api/messaging/config/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update messaging configuration");
      }

      const data = await response.json();
      return data.data as MessagingConfiguration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messagingConfigurations"] });
      toast.success("SMS provider configuration updated successfully");
    },
    onError: (error) => {
      toast.error(`Error updating SMS provider configuration: ${error.message}`);
    },
  });

  const deleteMessagingConfig = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/messaging/config/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete messaging configuration");
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messagingConfigurations"] });
      toast.success("SMS provider configuration deleted successfully");
    },
    onError: (error) => {
      toast.error(`Error deleting SMS provider configuration: ${error.message}`);
    },
  });

  const testMessagingConfig = useMutation({
    mutationFn: async ({ config, phoneNumber }: { config: MessagingConfigFormValues; phoneNumber: string }) => {
      const response = await fetch("/api/messaging/config/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config, phoneNumber }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to test messaging configuration");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Test message sent successfully");
    },
    onError: (error) => {
      toast.error(`Error testing SMS provider configuration: ${error.message}`);
    },
  });

  return {
    createMessagingConfig,
    updateMessagingConfig,
    deleteMessagingConfig,
    testMessagingConfig,
  };
}

/**
 * Hook for message rephrasing and shortening functionality
 */
export function useMessageShortener() {
  const shortenMessage = useMutation({
    mutationFn: async (message: string) => {
      try {
        // Try the AI rephrasing endpoint first
        const rephraseResponse = await fetch("/api/messaging/ai/rephrase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        // Parse the response
        const rephraseData = await rephraseResponse.json();

        // If the rephrase endpoint succeeds, use its result
        if (rephraseResponse.ok && rephraseData.message) {
          console.log("Rephrased message:", rephraseData.message);
          return rephraseData.message as string;
        }

        // If rephrase fails or returns no message, log the error and try the fallback
        if (!rephraseResponse.ok) {
          console.error("Rephrase endpoint error:", rephraseData.error || "Unknown error");
        }

        // Try the fallback API
        const fallbackResponse = await fetch("/api/messaging/ai/shorten-fallback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        const fallbackData = await fallbackResponse.json();

        if (!fallbackResponse.ok) {
          console.error("Fallback endpoint error:", fallbackData.error || "Unknown error");
          throw new Error(fallbackData.error || fallbackData.message || "Failed to process message");
        }

        console.log("Fallback message:", fallbackData.message);
        return fallbackData.message as string;
      } catch (error) {
        console.error("Error in message processing mutation:", error);

        // If all APIs fail, use client-side fallback
        if (typeof message === 'string' && message.length > 160) {
          const truncated = message.substring(0, 157) + '...';
          console.log("Using client-side fallback:", truncated);
          return truncated;
        }

        throw error;
      }
    },
    onError: (error) => {
      toast.error(`Error processing message: ${error.message}`);
    },
    onSuccess: (data) => {
      toast.success("Message processed successfully");
    },
  });

  return {
    shortenMessage,
  };
}
