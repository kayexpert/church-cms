"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMessages,
  getMessageById,
  createMessage,
  updateMessage,
  deleteMessage,
  deleteMessages,
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  getMessageLogs
} from "@/services/messaging-service";
import { createEnhancedMessage } from "@/services/enhanced-messaging-service";
import {
  Message,
  MessageWithRecipients,
  MessageRecipient,
  MessageTemplate,
  MessageLog,
  MessageFormValues
} from "@/types/messaging";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-utils";

// Define base keys first to avoid circular references
const MESSAGES_BASE = ['messages'] as const;
const TEMPLATES_BASE = ['message-templates'] as const;
const LOGS_BASE = ['message-logs'] as const;

// Query keys - structured for better cache management
export const QUERY_KEYS = {
  messages: {
    all: MESSAGES_BASE,
    lists: () => [...MESSAGES_BASE, 'list'] as const,
    list: (filters: any) => [...MESSAGES_BASE, 'list', filters] as const,
    details: () => [...MESSAGES_BASE, 'detail'] as const,
    detail: (id: string) => [...MESSAGES_BASE, 'detail', id] as const,
  },
  templates: {
    all: TEMPLATES_BASE,
    lists: () => [...TEMPLATES_BASE, 'list'] as const,
    details: () => [...TEMPLATES_BASE, 'detail'] as const,
    detail: (id: string) => [...TEMPLATES_BASE, 'detail', id] as const,
  },
  logs: {
    all: LOGS_BASE,
    lists: () => [...LOGS_BASE, 'list'] as const,
    list: (filters: any) => [...LOGS_BASE, 'list', filters] as const,
  }
};

/**
 * Hook for fetching messages with pagination and filtering
 */
export function useMessages(
  page: number = 1,
  pageSize: number = 10,
  filters: { status?: string; type?: string } = {}
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.messages.list({ page, pageSize, ...filters })],
    queryFn: () => getMessages(page, pageSize, filters),
    staleTime: STALE_TIMES.MEDIUM, // Optimized for better caching
    gcTime: GC_TIMES.LONG, // Keep data longer for better performance
    select: (response) => {
      // Validate the response data
      if (!response.data) {
        return { data: [], count: 0 };
      }

      // Validate each message object
      if (response.data.data && Array.isArray(response.data.data)) {
        // Filter out invalid message objects
        const validMessages = response.data.data.filter(message => !!message?.id);

        // Return the validated data
        return {
          ...response.data,
          data: validMessages
        };
      }

      return response.data;
    },
    onError: (error) => {
      toast.error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * Hook for fetching a single message by ID
 */
export function useMessage(id: string | null) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.messages.detail(id) : QUERY_KEYS.messages.details(),
    queryFn: () => getMessageById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.FREQUENT,
    gcTime: GC_TIMES.STANDARD,
    select: (response) => response.data,
    onError: (error) => {
      toast.error(`Failed to fetch message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * Hook for message mutations (create, update, delete)
 */
export function useMessageMutations() {
  const queryClient = useQueryClient();

  // Function to check if messaging tables exist and create them if they don't
  const checkAndCreateMessagingTables = async () => {
    try {
      const response = await fetch('/api/db/create-messaging-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating messaging tables:', data);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking messaging tables:', error);
      return false;
    }
  };

  // Create message mutation using enhanced service
  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      try {
        // Determine if the message should be sent immediately
        const scheduleTime = new Date(data.schedule_time);
        const now = new Date();
        const shouldSendNow = scheduleTime <= now && data.status === 'active';

        // First, check if messaging tables exist and create them if needed
        let tablesChecked = false;

        try {
          // Try to create the message using the enhanced service
          let response = await createEnhancedMessage(data, shouldSendNow);

          // If there's an error that might be related to missing tables, try to create them
          if (response.error && (
            response.error.message.includes('relation') ||
            response.error.message.includes('does not exist') ||
            response.error.message.includes('undefined')
          ) && !tablesChecked) {
            console.log('Attempting to create messaging tables...');
            const tablesCreated = await checkAndCreateMessagingTables();
            tablesChecked = true;

            if (tablesCreated) {
              // Try again after creating tables
              console.log('Tables created, retrying message creation...');
              response = await createEnhancedMessage(data, shouldSendNow);
            }
          }

          if (response.error) {
            console.error('Error creating message after table check:', response.error);
            throw response.error;
          }

          return response.data;
        } catch (error) {
          // If we haven't checked tables yet and the error suggests missing tables
          if (!tablesChecked && error instanceof Error && (
            error.message.includes('relation') ||
            error.message.includes('does not exist') ||
            error.message.includes('undefined')
          )) {
            console.log('Error suggests missing tables, attempting to create them...');
            const tablesCreated = await checkAndCreateMessagingTables();
            tablesChecked = true;

            if (tablesCreated) {
              // Try again after creating tables
              console.log('Tables created, retrying message creation...');
              const retryResponse = await createEnhancedMessage(data, shouldSendNow);

              if (retryResponse.error) {
                throw retryResponse.error;
              }

              return retryResponse.data;
            }
          }

          // If we get here, either tables check failed or the error is unrelated to missing tables
          throw error;
        }
      } catch (error) {
        console.error('Error in createMessageMutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Message created successfully, invalidating queries:', data);

      // Invalidate all messages queries to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.all });

      // Specifically invalidate the messages list queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.lists() });

      // Invalidate message logs to refresh the logs if any messages were sent
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.logs.all });

      // Force refetch of messages with type 'group' (which includes birthday messages)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.list({ type: 'group' })
      });

      // Also invalidate any queries that might be used for birthday messages
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.list({ type: 'birthday-messages' })
      });

      toast.success("Message created successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating message:", error);

      // Create a more user-friendly error message
      let errorMessage = error.message;

      // Check for common database errors
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        errorMessage = 'The messaging tables do not exist. Please try initializing the messaging tables first.';

        // Show a toast with a button to initialize tables
        toast.error('Failed to create message', {
          description: errorMessage,
          action: {
            label: 'Initialize Tables',
            onClick: async () => {
              try {
                toast.loading('Initializing messaging tables...');
                const success = await checkAndCreateMessagingTables();
                if (success) {
                  toast.success('Messaging tables created successfully. Please try creating your message again.');
                } else {
                  toast.error('Failed to initialize messaging tables. Please contact support.');
                }
              } catch (e) {
                toast.error('Failed to initialize messaging tables. Please contact support.');
              }
            }
          },
          duration: 10000,
        });
        return;
      }

      // Handle other errors
      toast.error(`Failed to create message: ${errorMessage}`);
    }
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MessageFormValues }) => {
      // Convert form values to message and recipients
      const message: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>> = {
        name: data.name,
        content: data.content,
        type: data.type,
        frequency: data.frequency,
        schedule_time: data.schedule_time.toISOString(),
        end_date: data.end_date ? data.end_date.toISOString() : undefined,
        status: data.status
      };

      // Create recipients array
      const recipients: Omit<MessageRecipient, 'id' | 'message_id' | 'created_at'>[] =
        data.recipients.ids.map(id => ({
          recipient_type: data.recipients.type,
          recipient_id: id
        }));

      // Call the service function
      const response = await updateMessage(id, message, recipients);

      if (response.error) {
        throw response.error;
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific message query and messages list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.lists() });
      toast.success("Message updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating message:", error);
      toast.error(`Failed to update message: ${error.message}`);
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteMessage(id);

      if (response.error) {
        throw response.error;
      }

      return id;
    },
    onSuccess: (id) => {
      // Invalidate specific message query and messages list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.detail(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.lists() });
      toast.success("Message deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting message:", error);
      toast.error(`Failed to delete message: ${error.message}`);
    }
  });

  // Delete multiple messages mutation
  const deleteMessagesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await deleteMessages(ids);

      if (response.error) {
        throw response.error;
      }

      return ids;
    },
    onSuccess: (ids) => {
      // Invalidate messages list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.lists() });

      // Invalidate each message detail
      ids.forEach(id => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.detail(id) });
      });

      toast.success(`${ids.length} messages deleted successfully`);
    },
    onError: (error: Error) => {
      console.error("Error deleting messages:", error);
      toast.error(`Failed to delete messages: ${error.message}`);
    }
  });

  return {
    createMessage: createMessageMutation,
    updateMessage: updateMessageMutation,
    deleteMessage: deleteMessageMutation,
    deleteMessages: deleteMessagesMutation
  };
}

/**
 * Hook for fetching message templates
 */
export function useMessageTemplates() {
  return useQuery({
    queryKey: QUERY_KEYS.templates.lists(),
    queryFn: () => getMessageTemplates(),
    staleTime: STALE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    select: (response) => response.data || [],
    onError: (error) => {
      toast.error(`Failed to fetch message templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * Hook for message template mutations (create, update, delete)
 */
export function useMessageTemplateMutations() {
  const queryClient = useQueryClient();

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await createMessageTemplate(template);

      if (response.error) {
        throw response.error;
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates.all });

      // Update localStorage to notify other tabs/pages
      const notification = {
        id: `template-created-${Date.now()}`,
        type: 'success',
        title: 'Template Created',
        message: `Template "${data?.name}" has been created successfully.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('messaging_notification', JSON.stringify(notification));

      toast.success("Template created successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating template:", error);
      toast.error(`Failed to create template: ${error.message}`);
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template }: { id: string; template: Partial<Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>> }) => {
      const response = await updateMessageTemplate(id, template);

      if (response.error) {
        throw response.error;
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates.lists() });

      // Update localStorage to notify other tabs/pages
      const notification = {
        id: `template-updated-${Date.now()}`,
        type: 'success',
        title: 'Template Updated',
        message: `Template "${data?.name}" has been updated successfully.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('messaging_notification', JSON.stringify(notification));

      toast.success("Template updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating template:", error);
      toast.error(`Failed to update template: ${error.message}`);
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteMessageTemplate(id);

      if (response.error) {
        throw response.error;
      }

      return id;
    },
    onSuccess: (id) => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates.detail(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates.lists() });

      // Update localStorage to notify other tabs/pages
      const notification = {
        id: `template-deleted-${Date.now()}`,
        type: 'success',
        title: 'Template Deleted',
        message: 'Template has been deleted successfully.',
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('messaging_notification', JSON.stringify(notification));

      toast.success("Template deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting template:", error);
      toast.error(`Failed to delete template: ${error.message}`);
    }
  });

  return {
    createTemplate: createTemplateMutation,
    updateTemplate: updateTemplateMutation,
    deleteTemplate: deleteTemplateMutation
  };
}

/**
 * Hook for fetching message logs with pagination and filtering
 */
export function useMessageLogs(
  page: number = 1,
  pageSize: number = 10,
  filters: { status?: string; message_id?: string } = {}
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.logs.list({ page, pageSize, ...filters })],
    queryFn: () => getMessageLogs(page, pageSize, filters),
    staleTime: STALE_TIMES.FREQUENT,
    gcTime: GC_TIMES.STANDARD,
    select: (response) => response.data || { data: [], count: 0 },
    onError: (error) => {
      toast.error(`Failed to fetch message logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}
