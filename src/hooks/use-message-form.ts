"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MessageFormValues } from "@/types/messaging";
import { messageSchema } from "@/schemas/messaging-schema";

interface UseMessageFormOptions {
  defaultValues: Partial<MessageFormValues>;
  onSubmit: (values: MessageFormValues) => Promise<void>;
  type: 'quick' | 'group' | 'birthday';
}

/**
 * A custom hook for handling message forms with validation in toast notifications
 */
export function useMessageForm({
  defaultValues,
  onSubmit,
  type,
}: UseMessageFormOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with Zod resolver
  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      content: defaultValues?.content || "",
      type: type,
      frequency: defaultValues?.frequency || "one-time",
      schedule_time: defaultValues?.schedule_time || new Date(),
      end_date: defaultValues?.end_date,
      status: defaultValues?.status || "active",
      recipients: defaultValues?.recipients || {
        type: type === 'quick' ? 'individual' : 'group',
        ids: []
      },
      template_id: defaultValues?.template_id || "none",
      days_before: defaultValues?.days_before || 0
    }
  });

  // Handle form submission with validation in toast notifications
  const handleSubmit = async (values: MessageFormValues) => {
    try {
      setIsSubmitting(true);

      // Validate required fields with toast notifications
      if (!values.name || values.name.trim() === '') {
        toast.error("Message name is required");
        setIsSubmitting(false);
        return;
      }

      if (!values.content || values.content.trim() === '') {
        toast.error("Message content is required");
        setIsSubmitting(false);
        return;
      }

      if (!values.recipients.ids || values.recipients.ids.length === 0) {
        toast.error(type === 'quick'
          ? "At least one recipient is required"
          : "At least one group is required");
        setIsSubmitting(false);
        return;
      }

      // Convert "none" template_id to undefined
      if (values.template_id === 'none') {
        values.template_id = undefined;
      }

      // Submit the form
      await onSubmit(values);

      // Reset the form after successful submission
      form.reset();
    } catch (error) {
      console.error("Error submitting message form:", error);

      // Show error in toast notification
      toast.error("Failed to create message", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    handleSubmit: form.handleSubmit(handleSubmit),
  };
}
