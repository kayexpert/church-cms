"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { createEventSchema, CreateEventInput } from "@/schemas/event-schema";
import { EventCategory } from "@/services/event-service";
import { useEventMutations } from "@/hooks/useEvents";
import { formatDate } from "@/lib/date-utils";
import { createDateFromYYYYMMDD } from "@/lib/date-utils";

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  categories: EventCategory[];
  initialDate?: string;
}

export function CreateEventDialog({
  isOpen,
  onClose,
  onEventCreated,
  categories,
  initialDate,
}: CreateEventDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addEventMutation } = useEventMutations();

  // Initialize form with default values
  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: initialDate || new Date().toISOString().split("T")[0],
      status: "upcoming",
      recurrence: "none",
      is_all_day: false,
      // Always provide default values for time fields to prevent controlled/uncontrolled input warnings
      start_time: "",
      end_time: "",
      location: "",
      organizer: "",
      category_id: "",
    },
  });

  // Get the is_all_day value from the form
  const isAllDay = form.watch("is_all_day");

  // Handle form submission
  const onSubmit = async (values: CreateEventInput) => {
    try {
      setIsSubmitting(true);
      await addEventMutation.mutateAsync(values);
      toast.success("Event created successfully");
      form.reset();
      onEventCreated();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
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
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add a new event to your church calendar
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      placeholder="Select date"
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
                      placeholder="Select end date"
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
