"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { parseDate, toISODateString } from "@/lib/date-utils";

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (date: Date | undefined) => void;
  value?: Date | string | null;
  className?: string;
  placeholder?: string;
}

export function DateInput({
  onChange,
  value,
  className,
  placeholder = "dd-MMM-yy",
  ...props
}: DateInputProps) {
  // Convert value to ISO string format for the input
  const inputValue = React.useMemo(() => {
    if (!value) return '';

    try {
      return toISODateString(value) || '';
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      const newValue = e.target.value;
      const date = newValue ? parseDate(newValue) : undefined;
      onChange(date);
    }
  };

  return (
    <div className="relative">
      <Input
        type="date"
        value={inputValue}
        onChange={handleChange}
        className={cn("w-full", className)}
        placeholder={placeholder}
        {...props}
      />
      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
