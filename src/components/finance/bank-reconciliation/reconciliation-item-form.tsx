"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { IncomeEntry, ExpenditureEntry } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";

// Form schema
const reconciliationItemFormSchema = z.object({
  transaction_type: z.enum(["income", "expenditure", "manual"], {
    required_error: "Transaction type is required",
  }),
  transaction_id: z.string().optional(),
  date: z.date({
    required_error: "Date is required",
  }),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    {
      message: "Amount must be a positive number",
    }
  ),
  is_cleared: z.boolean().default(false),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // If transaction type is not manual, transaction_id is required
    if (data.transaction_type !== "manual") {
      return !!data.transaction_id;
    }
    return true;
  },
  {
    message: "Transaction is required",
    path: ["transaction_id"],
  }
);

type ReconciliationItemFormValues = z.infer<typeof reconciliationItemFormSchema>;

interface ReconciliationItemFormProps {
  reconciliationId: string;
  incomeEntries: IncomeEntry[];
  expenditureEntries: ExpenditureEntry[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReconciliationItemForm({
  reconciliationId,
  incomeEntries,
  expenditureEntries,
  onSuccess,
  onCancel,
}: ReconciliationItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const form = useForm<ReconciliationItemFormValues>({
    resolver: zodResolver(reconciliationItemFormSchema),
    defaultValues: {
      transaction_type: "income",
      transaction_id: "",
      date: new Date(),
      amount: "",
      is_cleared: false,
      notes: "",
    },
  });

  // Watch transaction type to show appropriate transactions
  const transactionType = form.watch("transaction_type");
  const transactionId = form.watch("transaction_id");

  // Handle transaction selection
  const handleTransactionChange = (value: string) => {
    form.setValue("transaction_id", value);

    // Auto-fill date and amount based on selected transaction
    if (transactionType === "income") {
      const selectedTransaction = incomeEntries.find(entry => entry.id === value);
      if (selectedTransaction) {
        form.setValue("date", new Date(selectedTransaction.date));
        form.setValue("amount", selectedTransaction.amount.toString());
      }
    } else if (transactionType === "expenditure") {
      const selectedTransaction = expenditureEntries.find(entry => entry.id === value);
      if (selectedTransaction) {
        form.setValue("date", new Date(selectedTransaction.date));
        form.setValue("amount", selectedTransaction.amount.toString());
      }
    }
  };

  // Handle transaction type change
  const handleTransactionTypeChange = (value: "income" | "expenditure" | "manual") => {
    form.setValue("transaction_type", value);
    form.setValue("transaction_id", "");

    if (value === "manual") {
      // Reset fields for manual entry
      form.setValue("date", new Date());
      form.setValue("amount", "");
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵'); // Replace the default "GH₵" with just "₵"
  };

  // Handle form submission
  const onSubmit = async (values: ReconciliationItemFormValues) => {
    setIsSubmitting(true);

    try {
      const reconciliationItemData = {
        reconciliation_id: reconciliationId,
        transaction_type: values.transaction_type === "manual" ? "manual" : values.transaction_type,
        transaction_id: values.transaction_type === "manual" ? null : values.transaction_id,
        date: format(values.date, "yyyy-MM-dd"),
        amount: parseFloat(values.amount),
        is_cleared: values.is_cleared,
        notes: values.notes || null,
      };

      const response = await supabase
        .from("reconciliation_items")
        .insert(reconciliationItemData);

      if (response.error) {
        console.error("Error inserting reconciliation item:",
          response.error.message || "Unknown error",
          response.error);
        toast.error("Failed to add reconciliation item. Please try again.");
      } else {
        toast.success("Reconciliation item added successfully");
        onSuccess();
      }
    } catch (err) {
      console.error("Exception in reconciliation item form submission:", err);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transaction Type Field */}
          <FormField
            control={form.control}
            name="transaction_type"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Transaction Type</FormLabel>
                <Select
                  onValueChange={(value) =>
                    handleTransactionTypeChange(value as "income" | "expenditure" | "manual")
                  }
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="income">Income Transaction</SelectItem>
                    <SelectItem value="expenditure">Expenditure Transaction</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Transaction Field (for income and expenditure types) */}
          {transactionType !== "manual" && (
            <FormField
              control={form.control}
              name="transaction_id"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
                  <FormLabel>Transaction</FormLabel>
                  <Select
                    onValueChange={handleTransactionChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a transaction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionType === "income"
                        ? incomeEntries.map((entry) => (
                            <SelectItem key={entry.id} value={entry.id}>
                              {format(new Date(entry.date), "MMM dd, yyyy")} - {entry.income_categories?.name} - {formatCurrency(entry.amount)}
                            </SelectItem>
                          ))
                        : expenditureEntries.map((entry) => (
                            <SelectItem key={entry.id} value={entry.id}>
                              {format(new Date(entry.date), "MMM dd, yyyy")} - {entry.expenditure_categories?.name} - {formatCurrency(entry.amount)}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Date Field */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${
                          !field.value && "text-muted-foreground"
                        }`}
                        disabled={transactionType !== "manual" && !!transactionId}
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    onWheel={preventWheelScroll}
                    {...field}
                    disabled={transactionType !== "manual" && !!transactionId}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Is Cleared Field */}
          <FormField
            control={form.control}
            name="is_cleared"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Cleared</FormLabel>
                  <FormDescription>
                    Check if this item has cleared the bank
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Notes Field */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter notes (optional)"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
