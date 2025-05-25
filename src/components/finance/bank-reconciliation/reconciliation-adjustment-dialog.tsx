"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, RefreshCw } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { IncomeCategory, ExpenditureCategory } from "@/types/finance";
import { useExpenditureCategories } from "@/hooks/use-expenditure-management";
import { useIncomeCategories } from "@/hooks/use-income-management";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { financeKeys } from "@/lib/query-keys";

// Define the form schema
const formSchema = z.object({
  adjustmentType: z.enum(["income", "expenditure"]),
  category_id: z.string({
    required_error: "Please select a category",
  }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  date: z.date(),
  description: z.string().min(3, {
    message: "Description must be at least 3 characters",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface ReconciliationAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  reconciliationId: string;
  difference: number;
  onSuccess: () => void;
  fetchLatestReconciliation?: () => Promise<any>;
}

export function ReconciliationAdjustmentDialog({
  open,
  onOpenChange,
  accountId,
  reconciliationId,
  difference,
  onSuccess,
  fetchLatestReconciliation,
}: ReconciliationAdjustmentDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingCategories, setIsRefreshingCategories] = useState(false);

  // Determine the suggested adjustment type based on the difference
  // CORRECTED LOGIC:
  // If difference is positive (bank > book), we need an expenditure entry to increase book balance
  // If difference is negative (bank < book), we need an income entry to decrease book balance
  const suggestedAdjustmentType = difference > 0 ? "expenditure" : "income";

  // Log the difference for debugging
  console.log('Reconciliation adjustment dialog received difference:', {
    difference,
    suggestedAdjustmentType,
    accountId,
    reconciliationId,
    adjustmentLogic: difference > 0
      ? "Bank balance > Book balance: Using expenditure to increase book balance"
      : "Book balance > Bank balance: Using income to decrease book balance"
  });

  // Fetch income categories (exclude system categories)
  const { data: incomeCategories = [] } = useIncomeCategories(false);

  // Fetch expenditure categories (exclude system categories)
  const { data: expenditureCategories = [] } = useExpenditureCategories(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adjustmentType: suggestedAdjustmentType,
      amount: Math.abs(difference).toFixed(2),
      date: new Date(),
      description: `Reconciliation adjustment for account ${accountId.slice(0, 8)}`,
    },
  });

  // Watch the adjustment type to determine which categories to show
  const adjustmentType = useWatch({
    control: form.control,
    name: "adjustmentType",
    defaultValue: suggestedAdjustmentType,
  });

  // Function to refresh categories
  const handleRefreshCategories = async () => {
    setIsRefreshingCategories(true);
    try {
      // Invalidate and refetch the appropriate category queries
      if (adjustmentType === "income") {
        await queryClient.invalidateQueries({ queryKey: ["incomeCategories"] });
        await queryClient.refetchQueries({ queryKey: ["incomeCategories"] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["expenditureCategories"] });
        await queryClient.refetchQueries({ queryKey: ["expenditureCategories"] });
      }
      toast.success(`${adjustmentType === "income" ? "Income" : "Expenditure"} categories refreshed`);
    } catch (error) {
      console.error("Error refreshing categories:", error);
      toast.error("Failed to refresh categories");
    } finally {
      setIsRefreshingCategories(false);
    }
  };

  // Set a default category when categories are loaded or adjustment type changes
  useEffect(() => {
    if (adjustmentType === "income" && incomeCategories.length > 0) {
      // Find a reconciliation category or use the first one
      const reconciliationCategory = incomeCategories.find(
        cat => cat.name.toLowerCase().includes("reconciliation")
      );
      form.setValue("category_id", reconciliationCategory?.id || incomeCategories[0].id);
    } else if (adjustmentType === "expenditure" && expenditureCategories.length > 0) {
      // Find a reconciliation category or use the first one
      const reconciliationCategory = expenditureCategories.find(
        cat => cat.name.toLowerCase().includes("reconciliation")
      );
      form.setValue("category_id", reconciliationCategory?.id || expenditureCategories[0].id);
    }
  }, [adjustmentType, incomeCategories, expenditureCategories, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    // Variable to store the new book balance for use throughout the function
    let updatedBookBalance = 0;

    try {
      const amount = parseFloat(values.amount);
      const formattedDate = format(values.date, "yyyy-MM-dd");

      // Use the selected category ID from the form
      const categoryId = values.category_id;

      // Create the adjustment entry based on the selected type
      if (values.adjustmentType === "income") {
        // Create an income entry
        // We'll use the description and payment_method to identify reconciliation adjustments
        // since the reconciliation_id column might not exist in the schema
        const { data: incomeData, error: incomeError } = await supabase
          .from("income_entries")
          .insert({
            account_id: accountId,
            amount,
            date: formattedDate,
            description: `[RECONCILIATION] ${values.description} (Reconciliation ID: ${reconciliationId})`,
            category_id: categoryId,
            payment_method: "reconciliation" // This field identifies it as a reconciliation adjustment
          })
          .select();

        if (incomeError) {
          throw new Error(`Failed to create income adjustment: ${incomeError.message}`);
        }

        // We don't need to sync with account transactions
        // Just mark the transaction as reconciled
        if (incomeData && incomeData[0]) {
          // Mark the transaction as reconciled
          await supabase
            .from("transaction_reconciliations")
            .upsert({
              transaction_id: incomeData[0].id,
              reconciliation_id: reconciliationId,
              is_reconciled: true,
              reconciled_at: new Date().toISOString(),
            });

          console.log(`Marked income entry ${incomeData[0].id} as reconciled`);
        }
      } else {
        // Create an expenditure entry
        // We'll use the description and payment_method to identify reconciliation adjustments
        // since the reconciliation_id column might not exist in the schema
        const { data: expenditureData, error: expenditureError } = await supabase
          .from("expenditure_entries")
          .insert({
            account_id: accountId,
            amount,
            date: formattedDate,
            description: `[RECONCILIATION] ${values.description} (Reconciliation ID: ${reconciliationId})`,
            category_id: categoryId,
            payment_method: "reconciliation" // This field identifies it as a reconciliation adjustment
          })
          .select();

        if (expenditureError) {
          throw new Error(`Failed to create expenditure adjustment: ${expenditureError.message}`);
        }

        // We don't need to sync with account transactions
        // Just mark the transaction as reconciled
        if (expenditureData && expenditureData[0]) {
          // Mark the transaction as reconciled
          await supabase
            .from("transaction_reconciliations")
            .upsert({
              transaction_id: expenditureData[0].id,
              reconciliation_id: reconciliationId,
              is_reconciled: true,
              reconciled_at: new Date().toISOString(),
            });

          console.log(`Marked expenditure entry ${expenditureData[0].id} as reconciled`);
        }
      }

      // Recalculate the account balance and update the book balance correctly
      try {
        console.log(`Updating balances for account ${accountId} after adjustment...`);
        console.log(`Adjustment type: ${values.adjustmentType}, Amount: ${amount}`);

        // First, get the current reconciliation data to have the current book balance
        const { data: currentReconciliation, error: reconcFetchError } = await supabase
          .from("bank_reconciliations")
          .select("book_balance, bank_balance, id, account_id")
          .eq("id", reconciliationId)
          .single();

        if (reconcFetchError) {
          console.error(`Error fetching current reconciliation data:`, reconcFetchError);
          throw new Error(`Failed to fetch reconciliation data: ${reconcFetchError.message}`);
        }

        console.log("Current reconciliation data:", {
          id: currentReconciliation.id,
          account_id: currentReconciliation.account_id,
          book_balance: currentReconciliation.book_balance,
          bank_balance: currentReconciliation.bank_balance,
          difference: currentReconciliation.bank_balance - currentReconciliation.book_balance
        });

        // Calculate the new book balance based on the adjustment type and amount
        updatedBookBalance = currentReconciliation.book_balance;

        // CORRECTED LOGIC:
        // For expenditure entries, add the amount to the book balance (increases book balance)
        // For income entries, subtract the amount from the book balance (decreases book balance)
        // This is because:
        // - When bank > book (positive difference), we create an expenditure to increase book balance
        // - When bank < book (negative difference), we create an income to decrease book balance
        if (values.adjustmentType === "expenditure") {
          updatedBookBalance += amount;
          console.log(`Adding expenditure amount ${amount} to book balance ${currentReconciliation.book_balance} -> ${updatedBookBalance}`);
        } else {
          updatedBookBalance -= amount;
          console.log(`Subtracting income amount ${amount} from book balance ${currentReconciliation.book_balance} -> ${updatedBookBalance}`);
        }

        console.log(`New calculated book balance: ${updatedBookBalance}`);
        console.log(`Calculation details:
          - Original book balance: ${currentReconciliation.book_balance}
          - Adjustment type: ${values.adjustmentType}
          - Adjustment amount: ${amount}
          - New book balance: ${updatedBookBalance}
          - Bank balance: ${currentReconciliation.bank_balance}
          - New difference: ${currentReconciliation.bank_balance - updatedBookBalance}
        `);

        // Update the book_balance in the reconciliation record
        // Note: We're not using has_manual_adjustments as it might not exist in the schema
        const { data: updateResult, error: reconcUpdateError } = await supabase
          .from("bank_reconciliations")
          .update({
            book_balance: updatedBookBalance,
            updated_at: new Date().toISOString()
          })
          .eq("id", reconciliationId)
          .select();

        if (reconcUpdateError) {
          console.error(`Error updating book_balance for reconciliation ${reconciliationId}:`, reconcUpdateError);
          throw new Error(`Failed to update reconciliation book balance: ${reconcUpdateError.message}`);
        }

        console.log(`Reconciliation ${reconciliationId} book_balance updated to: ${updatedBookBalance}`);
        console.log("Update result:", updateResult);

        // We don't need to recalculate the account balance
        // We only care about the book balance in the reconciliation, which we've already updated
        console.log("Book balance successfully updated to:", updatedBookBalance);
      } catch (error) {
        console.error("Error updating balances:", error);
        toast.warning("Adjustment created but balances may not be accurate");
      }

      // Comprehensive query invalidation to ensure UI is updated
      try {
        console.log("Invalidating and refetching queries to update UI...");

        // First, invalidate all finance-related queries
        queryClient.invalidateQueries({
          queryKey: ['finance'],
          refetchType: 'all'
        });

        // Specifically invalidate account queries
        queryClient.invalidateQueries({
          queryKey: financeKeys.accounts.all,
          refetchType: 'all'
        });

        // Specifically invalidate the account details query
        queryClient.invalidateQueries({
          queryKey: financeKeys.accounts.detail(accountId),
          refetchType: 'all'
        });

        // Specifically invalidate all reconciliation queries
        queryClient.invalidateQueries({
          queryKey: financeKeys.reconciliation.all,
          refetchType: 'all'
        });

        // Specifically invalidate this specific reconciliation
        queryClient.invalidateQueries({
          queryKey: financeKeys.reconciliation.detail(reconciliationId),
          refetchType: 'all'
        });

        // Invalidate transactions for this reconciliation
        queryClient.invalidateQueries({
          queryKey: financeKeys.reconciliation.transactions(
            accountId,
            null,
            null,
            reconciliationId
          ),
          refetchType: 'all'
        });

        // Force immediate refetch of critical data
        await Promise.all([
          queryClient.refetchQueries({ queryKey: financeKeys.accounts.detail(accountId) }),
          queryClient.refetchQueries({ queryKey: financeKeys.reconciliation.detail(reconciliationId) }),
          queryClient.refetchQueries({ queryKey: financeKeys.reconciliation.transactions(
            accountId,
            null,
            null,
            reconciliationId
          ) })
        ]);

        console.log("Successfully invalidated and refetched queries");

        // If we have a function to fetch the latest reconciliation data, call it
        if (fetchLatestReconciliation) {
          console.log("Fetching latest reconciliation data after adjustment");
          const result = await fetchLatestReconciliation();
          console.log("Fetch result:", result ? "Success" : "No data returned");
        }
      } catch (queryError) {
        console.error("Error invalidating or refetching queries:", queryError);
        // Continue with the process even if query invalidation fails
      }

      // Show success message with details about the adjustment
      // Format the currency for display
      const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
      });
      const formattedBalance = formatter.format(updatedBookBalance).replace('GH₵', '₵');

      toast.success(`Reconciliation adjustment created successfully. Book balance updated to ${formattedBalance}.`);

      // Close the dialog
      onOpenChange(false);

      // Add a small delay to ensure database updates are complete
      setTimeout(() => {
        // Force a hard refresh of all related data
        queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation.all });
        queryClient.invalidateQueries({ queryKey: financeKeys.accounts.all });

        // Call onSuccess to refresh the UI
        onSuccess();

        // If we have a function to fetch the latest reconciliation data, call it again
        if (fetchLatestReconciliation) {
          fetchLatestReconciliation().then(() => {
            console.log("Fetched latest reconciliation data after timeout");
          });
        }
      }, 1000);
    } catch (error) {
      console.error("Error creating reconciliation adjustment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Reconciliation Adjustment</DialogTitle>
          <DialogDescription>
            Create an adjustment entry to balance the reconciliation.
            The suggested adjustment is pre-filled based on the current difference.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Adjustment Type</FormLabel>
                  <FormDescription>
                    Select adjustment type:
                    {difference > 0 ?
                      " Bank balance is higher than book balance - expenditure entry recommended" :
                      " Book balance is higher than bank balance - income entry recommended"}
                  </FormDescription>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <RadioGroupItem value="income">
                        <FormLabel className="font-normal ml-2">
                          Income (decreases book balance)
                        </FormLabel>
                      </RadioGroupItem>
                      <RadioGroupItem value="expenditure">
                        <FormLabel className="font-normal ml-2">
                          Expenditure (increases book balance)
                        </FormLabel>
                      </RadioGroupItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Field - dynamically shows income or expenditure categories */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Category</FormLabel>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {adjustmentType === "income" ? (
                          incomeCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          expenditureCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleRefreshCategories}
                            disabled={isRefreshingCategories}
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${isRefreshingCategories ? 'animate-spin' : ''}`}
                            />
                            <span className="sr-only">Refresh Categories</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Refresh categories list</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
