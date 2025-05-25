"use client";

import { Calendar } from "lucide-react";
import { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";

export interface ChurchDatesFormProps {
  control: Control<any>;
}

export function ChurchDatesForm({ control }: ChurchDatesFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-muted w-10 h-10 rounded-full flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-xl font-medium">Church Dates</h3>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="membershipDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Membership Date</FormLabel>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="dd-MMM-yy"
                  disabledDates={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="baptismDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Baptism Date</FormLabel>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="dd-MMM-yy"
                  disabledDates={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
