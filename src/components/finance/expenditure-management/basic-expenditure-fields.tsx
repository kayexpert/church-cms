"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ExpenditureCategory } from "@/types/finance";
import { ExpenditureFormValues } from "./enhanced-expenditure-form";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { filterSystemExpenditureCategories } from "@/lib/identify-system-categories";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface BasicExpenditureFieldsProps {
  form: UseFormReturn<ExpenditureFormValues, any>;
  expenditureCategories: ExpenditureCategory[];
  handleAmountChange: (value: string) => void;
}

export function BasicExpenditureFields({
  form,
  expenditureCategories,
  handleAmountChange
}: BasicExpenditureFieldsProps) {
  return (
    <>
      {/* Date Field */}
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-sm font-medium">Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={`w-full pl-3 text-left font-normal ${
                      !field.value && "text-muted-foreground"
                    }`}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category Field */}
      <FormField
        control={form.control}
        name="category_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Category</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {filterSystemExpenditureCategories(expenditureCategories).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description Field */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter description"
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Amount Field */}
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Amount</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  {...field}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onWheel={preventWheelScroll}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Recipient Field */}
      <FormField
        control={form.control}
        name="recipient"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Recipient (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="Enter recipient name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
