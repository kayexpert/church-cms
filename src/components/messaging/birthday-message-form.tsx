'use client';

import { useState, useEffect, memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { MessageCharacterCounter } from "@/components/messaging/message-character-counter";
import { useMessageTemplates } from "@/hooks/use-messaging";
import { BirthdayMessageFormValues } from "@/types/birthday-messaging";

// Define a schema for birthday messages
const birthdayMessageSchema = z.object({
  name: z.string().min(1, "Message name is required"),
  content: z.string().min(1, "Message content is required"),
  days_before: z.number().int().min(0).max(30).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  template_id: z.union([z.literal("none"), z.string().uuid("Invalid UUID format")]).optional(),
});

interface BirthdayMessageFormProps {
  onSubmit: (values: BirthdayMessageFormValues) => Promise<void>;
  isSubmitting: boolean;
  initialValues?: Partial<BirthdayMessageFormValues>;
}

function BirthdayMessageFormComponent({ onSubmit, isSubmitting, initialValues }: BirthdayMessageFormProps) {
  const { data: templates = [] } = useMessageTemplates();

  // Initialize form with default values or initial values if provided
  const form = useForm<BirthdayMessageFormValues>({
    resolver: zodResolver(birthdayMessageSchema),
    defaultValues: {
      name: initialValues?.name || "Birthday Wishes",
      content: initialValues?.content || "Happy Birthday! Wishing you a blessed and joyful day.",
      days_before: initialValues?.days_before || 0,
      status: initialValues?.status || "active",
      template_id: initialValues?.template_id || "none",
    }
  });

  // Handle template selection - memoized to prevent unnecessary re-renders
  const handleTemplateChange = useCallback((templateId: string) => {
    if (templateId && templateId !== 'none') {
      const selectedTemplate = templates.find(t => t.id === templateId);
      if (selectedTemplate) {
        form.setValue('content', selectedTemplate.content);
      }
    }
  }, [templates, form]);

  // Handle form submission - memoized to prevent unnecessary re-renders
  const handleSubmit = useCallback(async (values: BirthdayMessageFormValues) => {
    try {
      // Convert "none" template_id to undefined
      if (values.template_id === 'none') {
        values.template_id = undefined;
      }

      // Set default days_before if not provided
      if (values.days_before === undefined) {
        values.days_before = 0;
      }

      // Ensure days_before is a number
      values.days_before = Number(values.days_before);

      // Log the values being submitted
      console.log("Submitting birthday message form with values:", values);

      // Submit the form
      await onSubmit(values);

      // Reset the form on success
      form.reset();

      // Show success toast
      toast.success("Birthday message created successfully", {
        description: "The message will be sent to members on their birthdays."
      });
    } catch (error) {
      console.error("Error submitting form:", error);

      // Show error toast
      toast.error("Failed to create birthday message", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  }, [onSubmit, form]);

  // Custom submit handler that shows validation errors in toast notifications
  const onFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Trigger validation
    const isValid = await form.trigger();

    if (!isValid) {
      // Get all validation errors
      const errors = form.formState.errors;

      // Check for specific errors and show toast notifications
      if (errors.name) {
        toast.error("Message name is required");
        return;
      }

      if (errors.content) {
        toast.error("Message content is required");
        return;
      }

      // Show a generic error if there are other validation errors
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    // If validation passes, submit the form
    form.handleSubmit(handleSubmit)(e);
  }, [form, handleSubmit]);

  return (
    <Form {...form}>
      <form onSubmit={onFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter message name" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="days_before"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days Before Birthday</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>{field.value} {field.value === 1 ? 'day' : 'days'} before</span>
                      <span className="text-sm text-muted-foreground">
                        {field.value === 0 ? 'On birthday' : `${field.value} ${field.value === 1 ? 'day' : 'days'} before`}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={30}
                      step={1}
                      value={[field.value || 0]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Set how many days before the birthday to send the message (0 = on the birthday)
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="template_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message Template (Optional)</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleTemplateChange(value);
                }}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select a template to pre-fill the message content
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter message content"
                  className="min-h-32"
                  {...field}
                />
              </FormControl>
              <MessageCharacterCounter
                content={field.value}
                onChange={(value) => field.onChange(value)}
              />
              <FormDescription>
                You can use {'{name}'} as a placeholder for the member's name
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Whether this message is active and will be sent
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === 'active'}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? 'active' : 'inactive')
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {form.getValues('status') === 'active'
                ? 'Creating & Sending...'
                : 'Creating...'}
            </>
          ) : (
            'Create Birthday Message'
          )}
        </Button>
      </form>
    </Form>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const BirthdayMessageForm = memo(BirthdayMessageFormComponent);
