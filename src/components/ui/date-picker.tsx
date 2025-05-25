"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFormContext } from "react-hook-form";
import { FormControl } from "@/components/ui/form";
import { formatDate } from "@/lib/date-utils";

interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  popoverAlign?: "start" | "center" | "end";
  showOutsideDays?: boolean;
  disabledDates?: (date: Date) => boolean;
  initialFocus?: boolean;
}

/**
 * Standardized date picker component using Shadcn UI
 * Features:
 * - Calendar popup for date selection
 * - dd-MMM-yy format display
 * - Consistent styling across the application
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "dd-MMM-yy",
  disabled = false,
  className,
  popoverAlign = "start",
  showOutsideDays = true,
  disabledDates,
  initialFocus = true,
}: DatePickerProps) {
  // Add state to control the open/close state of the Popover
  const [open, setOpen] = React.useState(false);

  // Format the date for display
  const formattedDate = React.useMemo(() => {
    if (!value) return null;
    return formatDate(value);
  }, [value]);

  // Check if we're inside a form context
  const formContext = useFormContext();
  const inFormContext = !!formContext;

  // Create a wrapped onChange handler that closes the popover
  const handleDateSelect = (date: Date | null) => {
    onChange?.(date);
    // Close the popover when a date is selected
    setOpen(false);
  };

  // Create the button element
  const buttonElement = (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {formattedDate || placeholder}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {inFormContext ? (
          <FormControl>{buttonElement}</FormControl>
        ) : (
          buttonElement
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={popoverAlign}>
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={handleDateSelect}
          disabled={disabled || disabledDates}
          initialFocus={initialFocus}
          showOutsideDays={showOutsideDays}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Year picker component for selecting a year
 */
export function YearPicker({
  value,
  onChange,
  placeholder = "yyyy",
  disabled = false,
  className,
}: Omit<DatePickerProps, "disabledDates" | "showOutsideDays" | "initialFocus" | "popoverAlign">) {
  // Add state to control the open/close state of the Popover
  const [open, setOpen] = React.useState(false);

  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);
  }, []);

  // Format the year for display
  const formattedYear = React.useMemo(() => {
    if (!value) return null;
    return value.getFullYear().toString();
  }, [value]);

  // Check if we're inside a form context
  const formContext = useFormContext();
  const inFormContext = !!formContext;

  // Create the button element
  const buttonElement = (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {formattedYear || placeholder}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {inFormContext ? (
          <FormControl>{buttonElement}</FormControl>
        ) : (
          buttonElement
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="h-[240px] overflow-y-auto p-2">
          <div className="grid grid-cols-4 gap-2">
            {years.map((year) => (
              <Button
                key={year}
                variant={value?.getFullYear() === year ? "default" : "outline"}
                className="h-8"
                onClick={() => {
                  const newDate = value ? new Date(value) : new Date();
                  newDate.setFullYear(year);
                  onChange?.(newDate);
                  // Close the popover when a year is selected
                  setOpen(false);
                }}
                disabled={disabled}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Month picker component for selecting a month
 */
export function MonthPicker({
  value,
  onChange,
  placeholder = "MMM yyyy",
  disabled = false,
  className,
}: Omit<DatePickerProps, "disabledDates" | "showOutsideDays" | "initialFocus" | "popoverAlign">) {
  // Add state to control the open/close state of the Popover
  const [open, setOpen] = React.useState(false);

  const months = React.useMemo(() => {
    return [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
  }, []);

  // Format the month for display
  const formattedMonth = React.useMemo(() => {
    if (!value) return null;
    return format(value, "MMMM yyyy");
  }, [value]);

  // Check if we're inside a form context
  const formContext = useFormContext();
  const inFormContext = !!formContext;

  // Create the button element
  const buttonElement = (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {formattedMonth || placeholder}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {inFormContext ? (
          <FormControl>{buttonElement}</FormControl>
        ) : (
          buttonElement
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-2">
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => (
              <Button
                key={month}
                variant={value?.getMonth() === index ? "default" : "outline"}
                className="h-8"
                onClick={() => {
                  const newDate = value ? new Date(value) : new Date();
                  newDate.setMonth(index);
                  onChange?.(newDate);
                  // Close the popover when a month is selected
                  setOpen(false);
                }}
                disabled={disabled}
              >
                {month.substring(0, 3)}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
