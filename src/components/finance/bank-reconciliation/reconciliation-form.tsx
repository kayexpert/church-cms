"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { BankReconciliation, Account } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { useAccountBalance } from "@/hooks/use-reconciliation";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DatePicker } from "@/components/ui/date-picker";

// Form schema
const reconciliationFormSchema = z.object({
  account_id: z.string({
    required_error: "Account is required",
  }),
  start_date: z.date({
    required_error: "Start date is required",
  }),
  end_date: z.date({
    required_error: "End date is required",
  }),
  bank_balance: z.string().min(1, "Bank balance is required").refine(
    (val) => !isNaN(parseFloat(val)),
    {
      message: "Bank balance must be a number",
    }
  ),
  book_balance: z.string().min(1, "Book balance is required").refine(
    (val) => !isNaN(parseFloat(val)),
    {
      message: "Book balance must be a number",
    }
  ),
  notes: z.string().optional(),
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: "End date must be after start date",
    path: ["end_date"],
  }
);

type ReconciliationFormValues = z.infer<typeof reconciliationFormSchema>;

interface ReconciliationFormProps {
  accounts: Account[];
  reconciliation?: BankReconciliation | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReconciliationForm({
  accounts,
  reconciliation,
  onSuccess,
  onCancel
}: ReconciliationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    reconciliation?.account_id || null
  );
  const isEditing = !!reconciliation;

  // Fetch account balance when an account is selected
  const {
    data: accountData,
    isLoading: isLoadingBalance,
    error: balanceError
  } = useAccountBalance(selectedAccountId);

  // Initialize form
  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationFormSchema),
    defaultValues: {
      account_id: reconciliation?.account_id || "",
      start_date: reconciliation ? new Date(reconciliation.start_date) : new Date(new Date().setDate(1)), // First day of current month
      end_date: reconciliation ? new Date(reconciliation.end_date) : new Date(),
      bank_balance: reconciliation ? reconciliation.bank_balance.toString() : "",
      book_balance: reconciliation ? reconciliation.book_balance.toString() : "",
      notes: reconciliation?.notes || "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: ReconciliationFormValues) => {
    try {
      setIsSubmitting(true);

      // Calculate the difference between bank and book balance
      const bankBalance = parseFloat(values.bank_balance);
      const bookBalance = parseFloat(values.book_balance);
      const difference = bankBalance - bookBalance;

      // Fix date handling to ensure exact dates are used without timezone issues
      // Use the date directly without any timezone adjustments
      const reconciliationData = {
        account_id: values.account_id,
        // Format dates directly without creating new Date objects to avoid timezone shifts
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        bank_balance: bankBalance,
        book_balance: bookBalance,
        difference: difference,
        status: 'in_progress', // Always start as in progress
        notes: values.notes || null,
      };

      console.log("Creating reconciliation with dates:", {
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
      });

      if (isEditing && reconciliation) {
        // Update existing reconciliation
        const { error } = await supabase
          .from("bank_reconciliations")
          .update(reconciliationData)
          .eq("id", reconciliation.id);

        if (error) {
          console.error("Error updating reconciliation:", error);
          toast.error("Failed to update reconciliation. Please try again.");
          return;
        }
        toast.success("Reconciliation updated successfully");
      } else {
        // Create new reconciliation
        const { error } = await supabase
          .from("bank_reconciliations")
          .insert(reconciliationData);

        if (error) {
          console.error("Error creating reconciliation:", error);
          toast.error("Failed to create reconciliation. Please try again.");
          return;
        }
        toast.success("Reconciliation created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error in reconciliation form submission:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} reconciliation. Please check your connection and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Reconciliation" : "Create New Reconciliation"}</CardTitle>
        <CardDescription>
          {isEditing ? "Update reconciliation details" : "Start a new bank reconciliation process"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Field */}
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Account</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedAccountId(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} {account.account_number ? `(${account.account_number})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAccountId && accountData && accountData.balance !== undefined && (
                      <FormDescription className="flex items-center mt-2 text-sm">
                        Current balance: <span className="font-medium ml-1">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "GHS",
                            minimumFractionDigits: 2,
                          }).format(accountData.balance).replace('GH₵', '₵')}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-1"
                          onClick={() => {
                            // Update the book balance field with the current account balance
                            form.setValue("book_balance", accountData.balance.toString());
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </FormDescription>
                    )}
                    {isLoadingBalance && selectedAccountId && (
                      <FormDescription className="mt-2 text-sm">
                        Loading account balance...
                      </FormDescription>
                    )}
                    {balanceError && (
                      <FormDescription className="mt-2 text-sm text-destructive">
                        Error loading balance: {balanceError.message}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => {
                            // Manually enter balance
                            toast.info("Please enter the balance manually");
                          }}
                        >
                          Enter manually
                        </Button>
                      </FormDescription>
                    )}
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

              {/* Bank Balance Field */}
              <FormField
                control={form.control}
                name="bank_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Balance</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          onWheel={preventWheelScroll}
                          {...field}
                        />
                      </FormControl>
                      {selectedAccountId && accountData && accountData.balance !== undefined && (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => {
                            // Update the bank balance field with the current account balance
                            form.setValue("bank_balance", accountData.balance.toString());
                          }}
                        >
                          Use Current
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      Balance as shown on your bank statement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Book Balance Field */}
              <FormField
                control={form.control}
                name="book_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Book Balance</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          onWheel={preventWheelScroll}
                          {...field}
                        />
                      </FormControl>
                      {selectedAccountId && accountData && accountData.balance !== undefined && (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => {
                            // Update the book balance field with the current account balance
                            form.setValue("book_balance", accountData.balance.toString());
                          }}
                        >
                          Use Current
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      Balance as per your accounting records
                    </FormDescription>
                    <FormMessage />
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

            <CardFooter className="flex justify-between px-0 pb-0">
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                  ? "Update Reconciliation"
                  : "Create Reconciliation"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
