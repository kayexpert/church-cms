"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Budget } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { FinanceFormContainer } from "@/components/finance/common/finance-form-container";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
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
import { DatePicker } from "@/components/ui/date-picker";

// Form schema
const budgetFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  start_date: z.date({
    required_error: "Start date is required",
  }),
  end_date: z.date({
    required_error: "End date is required",
  }),
  total_amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    {
      message: "Amount must be a positive number",
    }
  ),
  status: z.enum(["draft", "active", "completed", "cancelled"], {
    required_error: "Status is required",
  }),
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: "End date must be after start date",
    path: ["end_date"],
  }
);

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  budget?: Budget | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BudgetForm({ budget, onSuccess, onCancel }: BudgetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!budget;

  // Initialize form
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      title: budget?.title || "",
      description: budget?.description || "",
      start_date: budget ? new Date(budget.start_date) : new Date(),
      end_date: budget ? new Date(budget.end_date) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
      total_amount: budget ? budget.total_amount.toString() : "",
      status: (budget?.status as "draft" | "active" | "completed" | "cancelled") || "draft",
    },
  });

  // Handle form submission
  const onSubmit = async (values: BudgetFormValues) => {
    try {
      setIsSubmitting(true);

      const budgetData = {
        title: values.title,
        description: values.description || null,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        total_amount: parseFloat(values.total_amount),
        status: values.status,
      };

      if (isEditing && budget) {
        // Update existing budget
        const { error } = await supabase
          .from("budgets")
          .update(budgetData)
          .eq("id", budget.id);

        if (error) throw error;
        toast.success("Budget updated successfully");
      } else {
        // Create new budget
        const { error } = await supabase
          .from("budgets")
          .insert(budgetData);

        if (error) throw error;
        toast.success("Budget created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} budget`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FinanceFormContainer
      title={isEditing ? "Edit Budget" : "Create New Budget"}
      description={isEditing ? "Update budget details" : "Define a new budget for your organization"}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Update Budget" : "Create Budget"}
      onSubmit={form.handleSubmit(onSubmit)}
      onCancel={onCancel}
    >
      <Form {...form}>
        <form id="finance-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Budget title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date Field */}
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select start date"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date Field */}
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select end date"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total Amount Field */}
              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        onWheel={preventWheelScroll}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Field */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
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
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description (optional)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </form>
        </Form>
    </FinanceFormContainer>
  );
}
