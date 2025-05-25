"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { parseDate } from "@/lib/date-utils";

export interface EventTypeOption {
  value: string;
  label: string;
}

export interface AttendanceRecordFormProps {
  selectedDate: string;
  selectedEvent: string;
  eventTypeOptions: EventTypeOption[];
  onDateChange: (date: Date | undefined) => void;
  onEventChange: (value: string) => void;
}

export function AttendanceRecordForm({
  selectedDate,
  selectedEvent,
  eventTypeOptions,
  onDateChange,
  onEventChange
}: AttendanceRecordFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Tracking</CardTitle>
        <CardDescription>Record attendance for church events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Date</label>
            <DatePicker
              value={parseDate(selectedDate)}
              onChange={onDateChange}
              placeholder="dd-MMM-yy"
              disabledDates={(date) =>
                date < new Date(2000, 0, 1) || date > new Date(2100, 11, 31)
              }
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Event Type</label>
            <Select value={selectedEvent} onValueChange={onEventChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
