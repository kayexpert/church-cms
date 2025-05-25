"use client";

import { memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { MessageFormValues } from "@/types/messaging";
import { messageSchema } from "@/schemas/messaging-schema";
import { useMessageTemplates } from "@/hooks/use-messaging";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MessageCharacterCounter } from "@/components/messaging/message-character-counter";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";

interface MessageFormProps {
  onSubmit: (values: MessageFormValues) => Promise<void>;
  isSubmitting: boolean;
  type: 'quick' | 'group';
  initialValues?: Partial<MessageFormValues>;
}

function MessageFormComponent({ onSubmit, isSubmitting, type, initialValues }: MessageFormProps) {
  const { data: templates = [] } = useMessageTemplates();

  // Use React Query for members data
  const { data: members = [] } = useQuery({
    queryKey: ['members', 'active', 'with-phone'],
    queryFn: async () => {
      const { data } = await supabase
        .from('members')
        .select('id, first_name, last_name, primary_phone_number, status')
        .order('first_name');

      // Log the total number of members and how many have phone numbers
      const totalMembers = data?.length || 0;
      const activeMembers = data?.filter(m => m.status === 'active').length || 0;
      const membersWithPhone = data?.filter(m => m.primary_phone_number).length || 0;
      const validMembers = data?.filter(m => m.status === 'active' && m.primary_phone_number).length || 0;

      console.log(`Members stats: Total=${totalMembers}, Active=${activeMembers}, With Phone=${membersWithPhone}, Valid=${validMembers}`);

      // Filter for active members with phone numbers and map to the format needed for the dropdown
      return (data || [])
        .filter(member => member.status === 'active' && member.primary_phone_number)
        .map(member => ({
          value: member.id,
          label: `${member.first_name} ${member.last_name}`
        }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use React Query for groups data
  const { data: groups = [] } = useQuery({
    queryKey: ['covenant_families'],
    queryFn: async () => {
      const { data } = await supabase
        .from('covenant_families')
        .select('id, name')
        .order('name');

      return (data || []).map(group => ({
        value: group.id,
        label: group.name
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize form with default values or initial values if provided
  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      name: initialValues?.name || "",
      content: initialValues?.content || "",
      type: type,
      frequency: initialValues?.frequency || "one-time",
      schedule_time: initialValues?.schedule_time || new Date(),
      end_date: initialValues?.end_date,
      status: initialValues?.status || "active",
      recipients: initialValues?.recipients || {
        type: type === 'quick' ? 'individual' : 'group',
        ids: []
      },
      template_id: initialValues?.template_id || "none"
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
  const handleSubmit = useCallback(async (values: MessageFormValues) => {
    try {
      // Convert "none" template_id to undefined
      if (values.template_id === 'none') {
        values.template_id = undefined;
      }

      await onSubmit(values);
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
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

      if (errors.recipients?.ids) {
        toast.error(type === 'quick'
          ? "At least one recipient is required"
          : "At least one group is required");
        return;
      }

      // Show a generic error if there are other validation errors
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    // If validation passes, submit the form
    form.handleSubmit(handleSubmit)(e);
  }, [form, handleSubmit, type]);

  return (
    <Form {...form}>
      <form onSubmit={onFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm md:text-base">Message Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter message name" {...field} />
                </FormControl>
                {/* Error messages are now shown in toast notifications */}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm md:text-base">Frequency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="one-time">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {/* Error messages are now shown in toast notifications */}
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="schedule_time"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-sm md:text-base">Schedule Time</FormLabel>
                <div className="flex flex-col space-y-2">
                  <DatePicker
                    value={field.value}
                    onChange={(date) => {
                      if (date) {
                        // Preserve the time from the current value
                        const hours = field.value ? field.value.getHours() : 0;
                        const minutes = field.value ? field.value.getMinutes() : 0;
                        date.setHours(hours, minutes);
                        field.onChange(date);
                      } else {
                        field.onChange(new Date());
                      }
                    }}
                    placeholder="Select date"
                  />
                  <Input
                    type="time"
                    value={field.value ? format(field.value, "HH:mm") : ""}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(field.value);
                      newDate.setHours(parseInt(hours, 10));
                      newDate.setMinutes(parseInt(minutes, 10));
                      field.onChange(newDate);
                    }}
                  />
                </div>
                {/* Error messages are now shown in toast notifications */}
              </FormItem>
            )}
          />

          {form.watch("frequency") !== "one-time" && (
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date (Optional)</FormLabel>
                  <div className="flex items-center space-x-2">
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="No end date"
                      disabledDates={(date) => date < new Date()}
                    />
                    {field.value && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(null)}
                        type="button"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    When to stop sending recurring messages
                  </FormDescription>
                  {/* Error messages are now shown in toast notifications */}
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="recipients.type"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Input
                    type="hidden"
                    {...field}
                    value={type === 'quick' ? 'individual' : 'group'}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recipients.ids"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel className="text-sm md:text-base">
                  {type === 'quick' ? 'Recipients' : 'Groups'}
                </FormLabel>
                <FormControl>
                  <MultiSelect
                    options={type === 'quick' ? members : groups}
                    selected={field.value}
                    onChange={field.onChange}
                    placeholder={type === 'quick' ? 'Select members' : 'Select groups'}
                  />
                </FormControl>
                <FormDescription className="text-xs md:text-sm">
                  {type === 'quick'
                    ? 'Select one or more members to receive this message (only active members will receive messages)'
                    : 'Select one or more groups to receive this message (only active members in the group will receive messages)'}
                </FormDescription>
                {/* Error messages are now shown in toast notifications */}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Message Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active (Send immediately if scheduled now)</SelectItem>
                    <SelectItem value="scheduled">Scheduled (Will be sent at scheduled time)</SelectItem>
                    <SelectItem value="inactive">Inactive (Will not be sent)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Set the status of this message. Only active or scheduled messages will be sent.
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
              {/* Error messages are now shown in toast notifications */}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm md:text-base">Message Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter message content"
                  className="min-h-24 md:min-h-32"
                  {...field}
                />
              </FormControl>
              <MessageCharacterCounter
                content={field.value}
                onChange={(value) => field.onChange(value)}
              />
              <FormDescription className="text-xs md:text-sm">
                The content of the message to be sent
              </FormDescription>
              {/* Error messages are now shown in toast notifications */}
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {form.getValues('schedule_time') <= new Date() && form.getValues('status') === 'active'
                ? 'Creating & Sending...'
                : 'Creating...'}
            </>
          ) : (
            'Create Message'
          )}
        </Button>
      </form>
    </Form>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const MessageForm = memo(MessageFormComponent);
