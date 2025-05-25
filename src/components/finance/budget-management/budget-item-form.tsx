"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BudgetItem, IncomeCategory, ExpenditureCategory, Account, Budget } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/format-currency";
import { BudgetIncomeConfirmationDialog } from "./budget-income-confirmation-dialog";
import { useBudgetItemMutations } from "@/hooks/use-budget-items";

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
import { DialogFooter } from "@/components/ui/dialog";

// Form schema
const budgetItemFormSchema = z.object({
  category_type: z.enum(["income", "expenditure"], {
    required_error: "Category type is required",
  }),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    {
      message: "Amount must be a positive number",
    }
  ),
  account_id: z.string().optional(),
}).refine((data) => {
  // If category_type is income, account_id is required
  return data.category_type !== "income" || !!data.account_id;
}, {
  message: "Account is required for income budget items",
  path: ["account_id"],
});

type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;

interface BudgetItemFormProps {
  budgetId: string;
  budgetTitle: string;
  budgetItem?: BudgetItem;
  defaultCategoryType?: "income" | "expenditure";
  onSuccess: () => void;
  onCancel: () => void;
}

// Use memo to prevent unnecessary re-renders
export const BudgetItemForm = memo(function BudgetItemForm({
  budgetId,
  budgetTitle,
  budgetItem,
  defaultCategoryType,
  onSuccess,
  onCancel,
}: BudgetItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!budgetItem;
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [formValues, setFormValues] = useState<BudgetItemFormValues | null>(null);

  // Fetch accounts with refetch capability
  const { data: accounts = [], isLoading: isLoadingAccounts, refetch: refetchAccounts } = useAccounts();

  // Initialize form
  const form = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemFormSchema),
    defaultValues: {
      category_type: budgetItem?.category_type || defaultCategoryType || "income",
      description: budgetItem?.description || "",
      amount: budgetItem ? budgetItem.planned_amount.toString() : "",
      account_id: budgetItem?.account_id || "",
    },
  });

  // Watch category type to show appropriate categories
  const categoryType = form.watch("category_type");

  // Refresh accounts when the form is opened and verify account exists
  useEffect(() => {
    // Refresh accounts list when the form is mounted
    refetchAccounts().then(() => {
      // Reset account selection if not editing
      if (!isEditing) {
        form.setValue("account_id", "");
        setSelectedAccount(null);
      } else if (budgetItem?.account_id) {
        // Verify the account exists if editing
        const accountExists = accounts.some(a => a.id === budgetItem.account_id);
        if (!accountExists) {
          console.warn("Account not found in accounts list:", budgetItem.account_id);
          form.setValue("account_id", "");
          setSelectedAccount(null);
        }
      }
    });
  }, [refetchAccounts, isEditing, budgetItem, accounts, form]);

  // Handle account selection change (memoized to prevent unnecessary re-renders)
  const handleAccountChange = useCallback((accountId: string) => {
    // Validate the account ID format
    if (accountId && !accountId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error("Invalid account ID format:", accountId);
      toast.error("Invalid account ID format. Please select a valid account.");
      form.setValue("account_id", "");
      setSelectedAccount(null);
      return;
    }

    form.setValue("account_id", accountId);
    const account = accounts.find(a => a.id === accountId);

    if (accountId && !account) {
      console.warn("Selected account not found in accounts list:", accountId);
      toast.warning("The selected account could not be found. Please select a different account.");
    }

    setSelectedAccount(account || null);
  }, [accounts, form]);

  // Handle form submission
  const onSubmit = async (values: BudgetItemFormValues) => {
    try {
      // For income items, check if accounts exist
      if (values.category_type === "income") {
        // Even if UI shows accounts but API returns none, we need to handle this case
        if (accounts.length === 0) {
          toast.error("No accounts available in the database. Please create an account first before adding income budget items.");
          return;
        }

        // For income items that aren't being edited, validate account and show confirmation dialog
        if (!isEditing && values.account_id) {
          // Validate the account ID format
          if (!values.account_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.error("Invalid account ID format:", values.account_id);
            toast.error("Invalid account ID format. Please select a valid account.");
            return;
          }

          // Verify the account exists
          const account = accounts.find(a => a.id === values.account_id);
          if (!account) {
            console.error("Selected account not found in accounts list:", values.account_id);
            toast.error("The selected account could not be found. Please select a different account.");

            // Refresh accounts list to see if it's a stale data issue
            await refetchAccounts();
            return;
          }

          setFormValues(values);
          setShowConfirmationDialog(true);
          return; // Don't proceed until confirmed
        }
      }

      // Otherwise, proceed with submission
      await submitForm(values);
    } catch (error) {
      console.error("Error in form submission:", error);

      // Check if the error is related to account not found
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("account") || errorMessage.includes("Account")) {
        toast.error(`Account error: ${errorMessage}`);
      } else {
        toast.error(`Failed to ${isEditing ? "update" : "add"} budget item: ${errorMessage}`);
      }

      setIsSubmitting(false);
    }
  };

  // Handle confirmation dialog confirmation
  const handleConfirmation = async () => {
    if (!formValues) {
      console.error("No form values available for confirmation");
      toast.error("An error occurred: No form values available");
      setShowConfirmationDialog(false);
      return;
    }

    try {
      console.log("Submitting form after confirmation with values:", formValues);

      // Validate the account_id before submitting
      if (formValues.category_type === "income" && formValues.account_id) {
        const account = accounts.find(a => a.id === formValues.account_id);
        if (!account) {
          console.error("Selected account not found in accounts list:", formValues.account_id);
          toast.error("The selected account could not be found. Please select a different account.");
          return;
        }
      }

      await submitForm(formValues);
      setShowConfirmationDialog(false);
      setFormValues(null);
    } catch (error) {
      console.error("Error after confirmation:", error);

      // Check if the error is related to account not found
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("account") || errorMessage.includes("Account")) {
        toast.error("Account error: The selected account could not be found. Please select a different account.");
      } else {
        toast.error(`Failed to add budget item: ${errorMessage}`);
      }
      // Keep the dialog open if there's an error so the user can try again
    }
  };

  // Handle confirmation dialog cancellation
  const handleCancelConfirmation = () => {
    setShowConfirmationDialog(false);
    setFormValues(null);
    setIsSubmitting(false);
  };

  // Get budget item mutations
  const { updateBudgetItem, createBudgetItem } = useBudgetItemMutations(budgetId);

  // Actual form submission logic
  const submitForm = async (values: BudgetItemFormValues) => {
    try {
      setIsSubmitting(true);

      if (isEditing && budgetItem) {
        // Update existing budget item using the mutation
        await updateBudgetItem.mutateAsync({
          id: budgetItem.id,
          values: {
            category_type: values.category_type,
            description: values.description || undefined,
            planned_amount: parseFloat(values.amount),
            actual_amount: budgetItem.actual_amount || 0,
            account_id: values.category_type === "income" ? values.account_id : undefined,
          }
        });

        toast.success("Budget item updated successfully");
        onSuccess();
      } else {
        // Create new budget item using the mutation
        // Validate the amount
        const amount = parseFloat(values.amount);
        if (isNaN(amount)) {
          throw new Error("Invalid amount value");
        }

        // Validate the account_id for income items
        if (values.category_type === "income" && !values.account_id) {
          throw new Error("Account is required for income budget items");
        }

        // Use the mutation to create the budget item
        try {
          // Show success message with account details if available
          const result = await createBudgetItem.mutateAsync({
            category_type: values.category_type,
            description: values.description || undefined,
            amount: amount,
            account_id: values.category_type === "income" ? values.account_id : undefined,
          });

          // If we have account info in the response, show a more detailed success message
          if (result.account) {
            toast.success(
              `${formatCurrency(result.expenditure.amount)} has been deducted from ${result.account.name}`,
              { duration: 5000 }
            );
          }

          onSuccess();
        } catch (error) {
          console.error("Error creating budget item:", error);
          toast.error(`Failed to create budget item: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      }
    } catch (error) {
      console.error("Error in submitForm:", error);

      // Handle validation errors
      if (error instanceof Error) {
        if (error.message.includes('amount') || error.message.includes('Amount')) {
          toast.error("Please enter a valid amount.");
        } else if (error.message.includes('account') || error.message.includes('Account')) {
          toast.error("Please select a valid account for income budget items.");
        } else {
          toast.error(`Error: ${error.message}`);
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }

      // Don't re-throw, handle it here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Type Field */}
            <FormField
              control={form.control}
              name="category_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expenditure">Expenditure</SelectItem>
                    </SelectContent>
                  </Select>
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account Field - Only shown for income items */}
          {categoryType === "income" && (
            <>
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Source Account</FormLabel>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => refetchAccounts()}
                        className="h-6 px-2 text-xs"
                      >
                        Refresh
                      </Button>
                    </div>
                    <Select
                      onValueChange={(value) => handleAccountChange(value)}
                      defaultValue={field.value}
                      disabled={isLoadingAccounts}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingAccounts ? "Loading accounts..." : "Select source account"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingAccounts ? (
                          <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                        ) : accounts.length > 0 ? (
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
                      <div className="text-xs text-muted-foreground mt-1">
                        Current balance: {formatCurrency(selectedAccount.calculatedBalance !== undefined ? selectedAccount.calculatedBalance : (selectedAccount.balance || 0))}
                      </div>
                    )}
                    {!isLoadingAccounts && accounts.length === 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        No accounts available. Please create an account first.
                      </div>
                    )}
                    <FormDescription>
                      An expenditure entry will be automatically created to allocate funds from this account to the budget.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}



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

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
              ? "Update Item"
              : "Add Item"}
          </Button>
        </DialogFooter>
      </form>
    </Form>

    {/* Confirmation Dialog for Income Budget Items */}
    {formValues && (
      <BudgetIncomeConfirmationDialog
        open={showConfirmationDialog}
        onOpenChange={setShowConfirmationDialog}
        onConfirm={handleConfirmation}
        onCancel={handleCancelConfirmation}
        amount={parseFloat(formValues.amount)}
        account={accounts.find(a => a.id === formValues.account_id) || null}
        budgetTitle={budgetTitle}
      />
    )}
    </>
  );
});