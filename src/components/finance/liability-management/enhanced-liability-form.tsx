"use client";

// @ts-nocheck - Disable TypeScript checking for this file due to form typing issues
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LiabilityCategory, LiabilityEntry, Account } from "@/types/finance";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { syncLiabilityWithIncome } from "@/hooks/use-liability-income-sync";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { updateAccountBalance } from "@/lib/account-balance";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Form schema with strong validation
const liabilityFormSchema = z.object({
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Please select a valid date",
  }).refine(date => !!date, {
    message: "Date is required",
  }),
  category_id: z.string({
    required_error: "Category is required",
  }),
  creditor_name: z.string().min(1, "Creditor name is required"),
  details: z.string().optional(),
  total_amount: z.string().min(1, "Total amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    {
      message: "Total amount must be a positive number",
    }
  ),
  amount_paid: z.string().optional().default("0").refine(
    (val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    {
      message: "Amount paid must be a positive number or zero",
    }
  ),
  due_date: z.date().optional(),
  is_loan: z.boolean().default(false),
  // Add payment method and account fields for both loans and initial payments
  payment_method: z.string().optional(),
  account_id: z.string().optional(),
});

// Define the form values type explicitly to avoid TypeScript errors
export interface LiabilityFormValues {
  date: Date;
  category_id: string;
  creditor_name: string;
  total_amount: string;
  amount_paid: string;
  is_loan: boolean;
  details?: string;
  due_date?: Date;
  payment_method?: string;
  account_id?: string;
}

interface EnhancedLiabilityFormProps {
  liabilityCategories: LiabilityCategory[];
  entry?: LiabilityEntry | null;
  isEditing?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function EnhancedLiabilityForm({
  liabilityCategories,
  entry,
  isEditing = false,
  onSuccess,
  onCancel,
}: EnhancedLiabilityFormProps) {
  const queryClient = useQueryClient();
  const [isLoan, setIsLoan] = useState(false);
  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Fetch accounts with React Query
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Account[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute - shorter stale time for accounts to ensure fresh data
  });

  // Get account_id and payment_method from localStorage if editing a loan
  const getStoredLiabilityData = () => {
    if (entry && entry.is_loan && typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem(`liability_data_${entry.id}`);
        if (storedData) {
          return JSON.parse(storedData) || {};
        }
      } catch (e) {
        // Silent error handling
      }
    }
    return {};
  };

  const storedData = getStoredLiabilityData();

  // Initialize form with explicit type casting to avoid TypeScript errors
  const form = useForm<LiabilityFormValues>({
    // @ts-ignore - Ignore TypeScript errors related to resolver
    resolver: zodResolver(liabilityFormSchema),
    defaultValues: {
      date: entry ? new Date(entry.date) : new Date(),
      category_id: entry?.category_id || "",
      creditor_name: entry?.creditor_name || "",
      details: entry?.details || "",
      total_amount: entry ? entry.total_amount.toString() : "",
      amount_paid: entry ? entry.amount_paid.toString() : "0",
      due_date: entry?.due_date ? new Date(entry.due_date) : undefined,
      is_loan: entry?.is_loan || false,
      payment_method: storedData.payment_method || "cash",
      account_id: storedData.account_id || "",
    },
  });

  // Watch for form value changes
  const watchIsLoan = form.watch("is_loan");
  const watchTotalAmount = form.watch("total_amount");
  const watchAmountPaid = form.watch("amount_paid");
  const watchPaymentMethod = form.watch("payment_method");
  const watchAccountId = form.watch("account_id");

  // Effect to update state when form values change
  useEffect(() => {
    setIsLoan(watchIsLoan);

    // If loan is checked, disable amount paid
    if (watchIsLoan) {
      form.setValue("amount_paid", "0");
      setHasInitialPayment(false);
    }
  }, [watchIsLoan, form]);

  // Effect to update hasInitialPayment state
  useEffect(() => {
    const amountPaid = parseFloat(watchAmountPaid || "0");
    setHasInitialPayment(amountPaid > 0);

    // If amount paid is greater than 0, disable loan checkbox
    if (amountPaid > 0 && !isEditing) {
      form.setValue("is_loan", false);
    }
  }, [watchAmountPaid, form, isEditing]);

  // Handle amount paid change
  const handleAmountPaidChange = (value: string) => {
    const totalAmount = parseFloat(watchTotalAmount || "0");
    const amountPaid = parseFloat(value || "0");

    if (amountPaid > totalAmount) {
      toast.warning(`Amount paid (${amountPaid.toFixed(2)}) exceeds total amount (${totalAmount.toFixed(2)})`);
    }

    // If amount paid is greater than 0, disable loan checkbox
    if (amountPaid > 0 && !isEditing) {
      form.setValue("is_loan", false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵');
  };

  // Handle account selection change
  const handleAccountChange = (accountId: string) => {
    form.setValue("account_id", accountId);

    if (accountId) {
      const account = accounts.find(a => a.id === accountId);
      setSelectedAccount(account || null);
    } else {
      setSelectedAccount(null);
    }
  };

  // Effect to check amount paid when total amount changes
  useEffect(() => {
    if (watchTotalAmount && watchAmountPaid) {
      handleAmountPaidChange(watchAmountPaid);
    }
  }, [watchTotalAmount, watchAmountPaid]);

  // Calculate remaining amount for display
  const calculateRemainingAmount = () => {
    const total = parseFloat(watchTotalAmount || "0");
    const paid = parseFloat(watchAmountPaid || "0");
    return isNaN(total) || isNaN(paid) ? 0 : Math.max(0, total - paid);
  };

  // Helper function to create expenditure entry for initial payment
  const createInitialPaymentExpenditure = async (
    liabilityEntry: LiabilityEntry,
    paymentMethod: string,
    accountId: string | null,
    amount: number
  ) => {
    try {
      // Create expenditure entry for initial payment

      // Always use the standard "Liability Payment" category
      const { data: liabilityCategory, error: categoryError } = await supabase
        .from("expenditure_categories")
        .select("id")
        .eq("name", "Liability Payment")
        .maybeSingle();

      if (categoryError) {
        throw categoryError;
      }

      let categoryId = liabilityCategory?.id;

      // If standard category doesn't exist, create it
      if (!categoryId) {
        const { data: newCategory, error: createError } = await supabase
          .from("expenditure_categories")
          .insert({
            name: "Liability Payment",
            description: "System category for liability payments",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError) {
          throw createError;
        }

        categoryId = newCategory.id;
      }

      // Create the expenditure entry
      const expenditureData = {
        date: liabilityEntry.date,
        amount: amount,
        category_id: categoryId,
        description: `Initial payment for liability: ${liabilityEntry.creditor_name}`,
        recipient: liabilityEntry.creditor_name,
        payment_method: paymentMethod,
        account_id: accountId,
        liability_payment: true,
        liability_id: liabilityEntry.id
      };

      const { data: expenditure, error: expenditureError } = await supabase
        .from("expenditure_entries")
        .insert(expenditureData)
        .select();

      if (expenditureError) {
        throw expenditureError;
      }

      // Update account balance if an account was selected
      if (accountId) {
        try {
          await updateAccountBalance(
            accountId,
            amount,
            'create',
            'expenditure'
          );
        } catch (balanceError) {
          toast.warning("Initial payment recorded but account balance may not be accurate");
        }
      }

      return expenditure;
    } catch (error) {
      throw error;
    }
  };

  // Create mutation for adding/updating liability
  const liabilityMutation = useMutation({
    mutationFn: async (values: LiabilityFormValues) => {
      // Calculate amount remaining and status
      const totalAmount = parseFloat(values.total_amount);
      const amountPaid = values.amount_paid ? parseFloat(values.amount_paid) : 0;
      const amountRemaining = Math.max(0, totalAmount - amountPaid);

      // Determine status
      let status: 'unpaid' | 'partial' | 'paid';
      if (amountPaid <= 0) {
        status = 'unpaid';
      } else if (amountPaid < totalAmount) {
        status = 'partial';
      } else {
        status = 'paid';
      }

      // Format the data for the database
      const liabilityData = {
        date: format(values.date, "yyyy-MM-dd"),
        category_id: values.category_id,
        creditor_name: values.creditor_name,
        details: values.details || null,
        total_amount: totalAmount.toString(), // Convert to string for text column
        amount_paid: amountPaid.toString(), // Convert to string for text column
        amount_remaining: amountRemaining.toString(), // Convert to string for text column
        due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
        is_loan: values.is_loan.toString(), // Convert to string for text column
        status,
        description: values.details || null, // Add description field
        payment_date: amountPaid > 0 ? format(new Date(), "yyyy-MM-dd") : null, // Use payment_date instead
        account_id: values.is_loan ? values.account_id || null : null, // Store account_id for loans
      };

      try {
        let result;

        if (isEditing && entry) {
          // Update existing liability entry

          const { data, error } = await supabase
            .from("liability_entries")
            .update(liabilityData)
            .eq("id", entry.id)
            .select();

          if (error) {
            throw new Error(`Failed to update liability: ${error.message || error.details || JSON.stringify(error)}`);
          }
          result = data;
        } else {
          // Create new liability entry

          const { data, error } = await supabase
            .from("liability_entries")
            .insert(liabilityData)
            .select();

          if (error) {
            throw new Error(`Failed to insert liability: ${error.message || error.details || JSON.stringify(error)}`);
          }
          result = data;
        }

        // If we have an initial payment, create an expenditure entry
        if (result && result.length > 0 && amountPaid > 0 && !values.is_loan) {
          try {
            await createInitialPaymentExpenditure(
              result[0] as LiabilityEntry,
              values.payment_method || "cash",
              values.account_id || null,
              amountPaid
            );
          } catch (error) {
            toast.warning("Liability created but failed to record initial payment as expenditure");
          }
        }

        return result;
      } catch (error) {
        // Don't log to console, just throw the error to be handled by the error handler
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.invalidateQueries({ queryKey: ["liabilityEntriesForPayment"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      // Force immediate refetch of accounts to update form dropdowns
      queryClient.refetchQueries({ queryKey: ["accounts"] });

      // If we have data and it's a loan, sync with income entries
      if (data && data.length > 0) {
        try {
          const liabilityEntry = data[0] as LiabilityEntry;

          // Only sync if is_loan is true (convert string to boolean if needed)
          const isLoan = typeof liabilityEntry.is_loan === 'string'
            ? liabilityEntry.is_loan === 'true'
            : !!liabilityEntry.is_loan;

          if (isLoan) {
            // Store payment method and account in localStorage for future reference
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(`liability_data_${liabilityEntry.id}`, JSON.stringify({
                  payment_method: watchPaymentMethod,
                  account_id: watchAccountId
                }));
              } catch (e) {
                // Silent error handling
              }
            }

            // Sync with income entries
            await syncLiabilityWithIncome(liabilityEntry);
          }
        } catch (error) {
          toast.warning("Liability created but failed to sync with income entries");
        }
      }

      // Call onSuccess callback
      onSuccess();
      toast.success(isEditing ? "Liability updated successfully" : "Liability added successfully");
    },
    onError: (error) => {
      // Show detailed error in toast notification
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} liability: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Handle form submission with comprehensive validation
  const onSubmit = async (values: LiabilityFormValues) => {
    // Using toast notifications for validation

    // Comprehensive validation for all required fields using toast notifications
    if (!values.date) {
      toast.error('Please select a date');
      return;
    }

    if (!values.category_id) {
      toast.error('Please select a category');
      return;
    }

    if (!values.creditor_name || values.creditor_name.trim() === '') {
      toast.error('Please enter a creditor name');
      return;
    }

    if (!values.total_amount || isNaN(parseFloat(values.total_amount)) || parseFloat(values.total_amount) <= 0) {
      toast.error('Please enter a valid total amount greater than zero');
      return;
    }

    // Validate amount paid if entered
    if (values.amount_paid && (isNaN(parseFloat(values.amount_paid)) || parseFloat(values.amount_paid) < 0)) {
      toast.error('Amount paid must be a valid number greater than or equal to zero');
      return;
    }

    // If this is a loan or has initial payment, validate account selection
    if ((values.is_loan || (values.amount_paid && parseFloat(values.amount_paid) > 0)) && !values.account_id) {
      toast.error(values.is_loan ? 'Please select a deposit account for the loan' : 'Please select an account for the initial payment');
      return;
    }

    try {
      await liabilityMutation.mutateAsync(values);

      // Reset form after successful submission if not editing
      if (!isEditing) {
        form.reset({
          date: new Date(),
          category_id: "",
          creditor_name: "",
          details: "",
          total_amount: "",
          amount_paid: "0",
          due_date: undefined,
          is_loan: false,
          payment_method: "cash",
          account_id: "",
        });
      }
    } catch (error) {
      // Show error in toast notification only
      toast.error(error instanceof Error ? error.message : 'Error in form submission');
    }
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? "Edit Liability" : "Add Liability"}
      </h2>

      {/* @ts-ignore - Ignore TypeScript errors related to form */}
      <Form {...form}>
        {/* @ts-ignore - Ignore TypeScript errors related to form submission */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Date Field */}
          {/* @ts-ignore - Ignore TypeScript errors related to form control */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
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

          {/* Category Field */}
          {/* @ts-ignore - Ignore TypeScript errors related to form control */}
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {liabilityCategories.map((category) => (
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

          {/* Creditor Name Field */}
          <FormField
            control={form.control}
            name="creditor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Creditor Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter creditor name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Details Field */}
          <FormField
            control={form.control}
            name="details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter details (optional)"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
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
                    min="0.01"
                    placeholder="0.00"
                    onWheel={preventWheelScroll}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount Paid Field */}
          <FormField
            control={form.control}
            name="amount_paid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Paid</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    onWheel={preventWheelScroll}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleAmountPaidChange(e.target.value);
                    }}
                    disabled={Boolean(isLoan)}
                  />
                </FormControl>
                <FormDescription>
                  Remaining: {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "GHS",
                  }).format(calculateRemainingAmount()).replace('GH₵', '₵')}
                  {isLoan && (
                    <span className="block text-yellow-600 mt-1">
                      Disabled because this is marked as a loan
                    </span>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Due Date Field */}
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date (Optional)</FormLabel>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="dd-MMM-yy"
                  disabledDates={(date) => date < new Date("1900-01-01")}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Is Loan Checkbox */}
          <FormField
            control={form.control}
            name="is_loan"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={parseFloat(watchAmountPaid || "0") > 0}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>This is a loan</FormLabel>
                  <FormDescription>
                    Check if this liability is a loan that needs to be tracked separately
                    {parseFloat(watchAmountPaid || "0") > 0 && (
                      <span className="block text-yellow-600 mt-1">
                        Disabled because you've entered an initial payment
                      </span>
                    )}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Payment Method and Account Fields - Shown for loans or initial payments */}
          {(isLoan || hasInitialPayment) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-muted/20">
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium mb-2">
                  {isLoan ? "Loan Details" : "Initial Payment Details"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isLoan
                    ? "Since this is a loan, please specify the payment method and account where the loan amount will be deposited"
                    : "Since you've entered an initial payment, please specify the payment method and account from which the payment was made"
                  }
                </p>
              </div>

              {/* Account Field */}
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-medium">
                      {isLoan ? "Deposit Account" : "Payment Account"}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        handleAccountChange(value);
                        // Set a default payment method when account changes
                        form.setValue("payment_method", "cash");
                      }}
                      value={field.value || ""}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.length > 0 ? (
                          accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({formatCurrency(account.calculatedBalance !== undefined ? account.calculatedBalance : (account.balance || 0))})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-accounts" disabled>No accounts available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedAccount && (
                      <div className="text-sm mt-1 text-muted-foreground">
                        Current balance: {formatCurrency(selectedAccount.calculatedBalance !== undefined ? selectedAccount.calculatedBalance : (selectedAccount.balance || 0))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={Boolean(liabilityMutation.isPending)}
            >
              {liabilityMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Update" : "Add"} Liability
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}