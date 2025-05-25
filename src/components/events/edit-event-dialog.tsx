"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateEventSchema, UpdateEventInput } from "@/schemas/event-schema";
import { EventWithCategory, updateEvent } from "@/services/event-service";
import { useEventMutations, useEventCategories } from "@/hooks/useEvents";
import { formatDate } from "@/lib/date-utils";
import { createDateFromYYYYMMDD } from "@/lib/date-utils";

interface EditEventDialogProps {
  event: EventWithCategory;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

export function EditEventDialog({
  event,
  isOpen,
  onClose,
  onEventUpdated,
}: EditEventDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { updateEventMutation } = useEventMutations();
  const { data: categories = [] } = useEventCategories();

  // Initialize form with event values
  const form = useForm<UpdateEventInput>({
    resolver: zodResolver(updateEventSchema),
    defaultValues: {
      title: event.title,
      description: event.description || "",
      date: event.date,
      end_date: event.end_date || "",
      location: event.location || "",
      type: event.type || "",
      organizer: event.organizer || "",
      category_id: event.category_id || "",
      status: event.status || "upcoming",
      recurrence: event.recurrence || "none",
      color: event.color || "",
      department_id: event.department_id || "",
      is_all_day: event.is_all_day || false,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
    },
  });

  // Update form values when event changes
  useEffect(() => {
    form.reset({
      title: event.title,
      description: event.description || "",
      date: event.date,
      end_date: event.end_date || "",
      location: event.location || "",
      type: event.type || "",
      organizer: event.organizer || "",
      category_id: event.category_id || "",
      status: event.status || "upcoming",
      recurrence: event.recurrence || "none",
      color: event.color || "",
      department_id: event.department_id || "",
      is_all_day: event.is_all_day || false,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
    });
  }, [event, form]);

  // Get the is_all_day value from the form
  const isAllDay = form.watch("is_all_day");

  // Handle form submission
  const onSubmit = async (values: UpdateEventInput) => {
    try {
      setIsSubmitting(true);
      console.log("Submitting update with values:", JSON.stringify(values, null, 2));
      console.log("Event ID:", event.id);

      // Make sure required fields are present
      if (!values.title || !values.date) {
        toast.error("Title and date are required");
        setIsSubmitting(false);
        return;
      }

      // Explicitly prepare the data to send
      const updateData = {
        id: event.id,
        event: {
          title: values.title,
          description: values.description || "",
          date: values.date,
          end_date: values.end_date || "",
          location: values.location || "",
          organizer: values.organizer || "",
          // Handle UUID fields properly - null is better than empty string for UUID fields
          category_id: values.category_id && values.category_id.trim() !== "" ? values.category_id : null,
          status: values.status || "upcoming",
          recurrence: values.recurrence || "none",
          is_all_day: values.is_all_day || false,
          start_time: values.start_time || "",
          end_time: values.end_time || "",
          // Include any other fields that might be required
          type: values.type || "",
          color: values.color || "",
          // Handle UUID fields properly
          department_id: values.department_id && values.department_id.trim() !== "" ? values.department_id : null,
        }
      };

      console.log("Prepared update data:", JSON.stringify(updateData, null, 2));

      try {
        // Call the updateEvent function directly
        const result = await updateEvent(event.id, updateData.event);

        console.log("Direct update result:", result);

        if (result.error) {
          console.error("Update returned error:", result.error);
          toast.error(`Update failed: ${result.error.message || 'Unknown error'}`);
          return;
        }

        if (!result.data) {
          console.error("Update returned no data");
          toast.error("Update failed: No data returned");
          return;
        }

        console.log("Update successful with data:", result.data);
        toast.success("Event updated successfully");

        // Trigger a refresh of the events list
        queryClient.invalidateQueries({ queryKey: ['events'] });

        onEventUpdated();
        onClose();
      } catch (updateError) {
        const errorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';
        console.error("Direct update error:", errorMessage);
        toast.error(`Update failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error in onSubmit:", error);
      toast.error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // If dialog is closing, call the onClose function
        // This will allow the close button to work
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        // Disable the close functionality when clicking outside
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        // Disable the close functionality when pressing escape key
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the details of this event
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              console.log("Form submitted");
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter event description"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <DatePicker
                      value={field.value ? createDateFromYYYYMMDD(field.value) : null}
                      onChange={(date) => {
                        if (!date) {
                          field.onChange("");
                          return;
                        }

                        // Create a date string in YYYY-MM-DD format without timezone issues
                        // This ensures the selected date is preserved exactly as shown in the calendar
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateString = `${year}-${month}-${day}`;

                        field.onChange(dateString);
                      }}
                      placeholder="dd-MMM-yy"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <DatePicker
                      value={field.value ? createDateFromYYYYMMDD(field.value) : null}
                      onChange={(date) => {
                        if (!date) {
                          field.onChange("");
                          return;
                        }

                        // Create a date string in YYYY-MM-DD format without timezone issues
                        // This ensures the selected date is preserved exactly as shown in the calendar
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateString = `${year}-${month}-${day}`;

                        field.onChange(dateString);
                      }}
                      placeholder="dd-MMM-yy"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* All Day Switch */}
              <FormField
                control={form.control}
                name="is_all_day"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 md:col-span-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="text-base">All Day Event</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Toggle if this is an all-day event
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* Time Fields Row */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  {/* Start Time */}
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <Input
                              type="time"
                              {...field}
                              className="pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none border-l border-input pl-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="absolute inset-0 cursor-pointer" onClick={() => {
                              const input = document.querySelector(`input[name="${field.name}"]`) as HTMLInputElement;
                              if (input) input.showPicker();
                            }} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* End Time */}
                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <Input
                              type="time"
                              {...field}
                              className="pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none border-l border-input pl-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="absolute inset-0 cursor-pointer" onClick={() => {
                              const input = document.querySelector(`input[name="${field.name}"]`) as HTMLInputElement;
                              if (input) input.showPicker();
                            }} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Location and Organizer Row */}
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Organizer */}
                <FormField
                  control={form.control}
                  name="organizer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organizer</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event organizer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category, Status, Recurrence Row */}
              <div className="grid grid-cols-12 gap-6 md:col-span-2">
                {/* Category - takes full width on mobile, 6/12 columns on desktop */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem className="col-span-12 md:col-span-6">
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{
                                    backgroundColor: category.color || "#4CAF50",
                                  }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status - takes 6/12 columns on mobile, 3/12 columns on desktop */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="col-span-6 md:col-span-3">
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recurrence - takes 6/12 columns on mobile, 3/12 columns on desktop */}
                <FormField
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <FormItem className="col-span-6 md:col-span-3">
                      <FormLabel>Recurrence</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select recurrence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  console.log("Manual update button clicked");
                  const values = form.getValues();
                  console.log("Form values:", values);
                  console.log("Form errors:", form.formState.errors);

                  // Manually trigger the submission
                  onSubmit(values);
                }}
              >
                {isSubmitting ? "Updating..." : "Update Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
