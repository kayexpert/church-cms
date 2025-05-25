"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIncomeEntries } from "@/services/finance-service";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { IncomeEntry } from "@/types/finance";
import { AccountBalanceService } from "@/services/account-balance-service";
import { ErrorTracker } from "@/lib/error-tracking";
// Performance monitoring removed
import { syncIncomeEntryWithAccountTransactions } from "@/lib/sync-account-transactions";

/**
 * Hook for fetching income entries with pagination and filtering
 */
export function useIncomeEntries(options: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  refreshTrigger?: number;
} = {}) {
  const { refreshTrigger, ...queryOptions } = options;

  return useQuery({
    queryKey: ['incomeEntries', queryOptions, refreshTrigger],
    queryFn: async () => {
      try {
        // Directly proceed with the query
        const result = await getIncomeEntries(queryOptions);

        // Basic error checking
        if (result.error) {
          console.error('Error fetching income entries:', result.error);
          throw result.error;
        }

        if (!result.data) {
          console.error('No data returned from income entries query');
          throw new Error('No data returned from income entries query');
        }

        return result;
      } catch (error) {
        console.error('Error in income entries query function:', error);
        throw error;
      }
    },
    select: (response) => {
      if (response && response.data) {
        return response.data;
      }
      return { data: [], count: 0 };
    },
    keepPreviousData: true, // Keep previous data while fetching new data
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3, // Retry failed queries three times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 15000), // Exponential backoff with longer max delay
  });
}

/**
 * Hook for income entry mutations (add, update, delete)
 */
export function useIncomeEntryMutations() {
  const queryClient = useQueryClient();

  const addIncomeEntry = useMutation({
    mutationFn: async (newEntry: Omit<IncomeEntry, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const { data, error } = await supabase
          .from('income_entries')
          .insert(newEntry)
          .select();

        if (error) throw error;

        // If an account is specified, ensure the transaction is recorded and balance is updated
        if (data && data[0] && data[0].account_id) {
          const entry = data[0];

          // Use our dedicated sync function to ensure the income entry is properly recorded
          await syncIncomeEntryWithAccountTransactions(entry.id);
          console.log(`Income entry ${entry.id} synced with account transactions`);
        }

        return data;
      } catch (error) {
        console.error('Error adding income entry:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Income entry added successfully');
      // Use the AccountBalanceService to invalidate all relevant queries
      AccountBalanceService.invalidateAllFinanceQueries(queryClient);
    },
    onError: (error) => {
      ErrorTracker.logError({
        operation: 'addIncomeEntry',
        component: 'useIncomeEntries',
        error
      });
      toast.error('Failed to add income entry');
    }
  });

  const updateIncomeEntry = useMutation({
    mutationFn: async ({ id, entry }: { id: string; entry: Partial<Omit<IncomeEntry, 'id' | 'created_at' | 'updated_at'>> }) => {
      try {
        // First, get the original entry to compare changes
        const { data: originalEntry, error: fetchError } = await supabase
          .from('income_entries')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        // Update the entry
        const { data, error } = await supabase
          .from('income_entries')
          .update(entry)
          .eq('id', id)
          .select();

        if (error) throw error;

        // If we have data and account_id has changed or amount has changed, update account balances
        if (data && data[0]) {
          const updatedEntry = data[0];

          // Handle account changes
          if (originalEntry.account_id !== updatedEntry.account_id) {
            // If account changed, update both old and new account

            // Remove from old account if it exists
            if (originalEntry.account_id) {
              // Delete the transaction from the old account
              const { error: deleteError } = await supabase
                .from("account_transactions")
                .delete()
                .eq("reference_id", id)
                .eq("reference_type", "income_entry");

              if (deleteError) {
                console.error("Error deleting old transaction:", deleteError);
              }

              // Recalculate the old account balance
              await AccountBalanceService.recalculateBalance(originalEntry.account_id);
            }

            // Add to new account if it exists
            if (updatedEntry.account_id) {
              // Use our dedicated sync function to ensure the income entry is properly recorded
              await syncIncomeEntryWithAccountTransactions(updatedEntry.id);
              console.log(`Income entry ${updatedEntry.id} synced with account transactions`);
            }
          }
          // If only amount changed but account is the same
          else if (originalEntry.account_id &&
                  updatedEntry.account_id &&
                  (originalEntry.amount !== updatedEntry.amount ||
                   originalEntry.date !== updatedEntry.date ||
                   originalEntry.description !== updatedEntry.description)) {

            // Use our dedicated sync function to ensure the income entry is properly recorded
            await syncIncomeEntryWithAccountTransactions(updatedEntry.id);
            console.log(`Income entry ${updatedEntry.id} synced with account transactions`);
          }
        }

        return data;
      } catch (error) {
        ErrorTracker.logError({
          operation: 'updateIncomeEntry',
          component: 'useIncomeEntries',
          error,
          context: { id, entry }
        });
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Income entry updated successfully');
      // Use the AccountBalanceService to invalidate all relevant queries
      AccountBalanceService.invalidateAllFinanceQueries(queryClient);
    },
    onError: (error) => {
      ErrorTracker.logError({
        operation: 'updateIncomeEntry',
        component: 'useIncomeEntries',
        error
      });
      toast.error('Failed to update income entry');
    }
  });

  const deleteIncomeEntry = useMutation({
    mutationFn: async (id: string) => {
      console.log("Starting income entry deletion process for ID:", id);

      // First, get the income entry to check if it's a loan
      const { data: incomeEntry, error: fetchError } = await supabase
        .from('income_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error("Error fetching income entry:", fetchError);
        throw fetchError;
      }

      console.log("Found income entry:", incomeEntry);

      // Check if this is a loan income entry
      let isLoanEntry = false;
      let liabilityId = null;

      // First check payment_details for liability_id
      if (incomeEntry && incomeEntry.payment_details) {
        try {
          // Try to parse payment_details if it's a string
          const paymentDetails = typeof incomeEntry.payment_details === 'string'
            ? JSON.parse(incomeEntry.payment_details)
            : incomeEntry.payment_details;

          // Check if payment_details contains liability_id
          if (paymentDetails && paymentDetails.source === 'liability' && paymentDetails.liability_id) {
            console.log("Found liability ID in payment_details:", paymentDetails.liability_id);
            liabilityId = paymentDetails.liability_id;
            isLoanEntry = true;
          }
        } catch (e) {
          console.error("Error parsing payment_details:", e);
        }
      }

      // If no liability ID found in payment_details, check the description
      if (!liabilityId && incomeEntry && incomeEntry.description) {
        // Check if this is a loan entry by description
        if (incomeEntry.description.includes('Loan from')) {
          isLoanEntry = true;
          console.log("This is a loan income entry, checking for liability ID in description...");

          // Try to extract the liability ID from the description if it exists
          const match = incomeEntry.description.match(/Liability ID: ([a-f0-9-]+)/i);
          if (match && match[1]) {
            liabilityId = match[1];
            console.log("Found liability ID in description:", liabilityId);
          }
        }
      }

      if (liabilityId) {
        console.log("Found liability ID:", liabilityId);

        // First, find and delete all expenditure entries related to this liability
        console.log("Finding and deleting related expenditure entries...");
        const { data: relatedExpenditures, error: expendituresFetchError } = await supabase
          .from('expenditure_entries')
          .select('id')
          .eq('liability_id', liabilityId);

        if (expendituresFetchError) {
          console.error('Error fetching related expenditures:', expendituresFetchError);
        } else if (relatedExpenditures && relatedExpenditures.length > 0) {
          console.log(`Found ${relatedExpenditures.length} related expenditure entries to delete`);

          // Delete all related expenditure entries
          const { error: expendituresDeleteError } = await supabase
            .from('expenditure_entries')
            .delete()
            .eq('liability_id', liabilityId);

          if (expendituresDeleteError) {
            console.error('Error deleting related expenditures:', expendituresDeleteError);
          } else {
            console.log("Related expenditure entries deleted successfully");
            // Invalidate expenditure queries
            queryClient.invalidateQueries({ queryKey: ['expenditureEntries'] });
          }
        } else {
          console.log("No related expenditure entries found");
        }

        // Now delete the liability itself
        console.log("Deleting related liability...");
        const { error: liabilityError } = await supabase
          .from('liability_entries')
          .delete()
          .eq('id', liabilityId);

        if (liabilityError) {
          console.error('Error deleting related liability:', liabilityError);
          // Don't throw here, we still want to delete the income entry
        } else {
          console.log("Related liability deleted successfully");
          // Invalidate liability queries
          queryClient.invalidateQueries({ queryKey: ['liabilityEntries'] });
        }
      }

      // Get account_id before deleting for balance update
      const accountId = incomeEntry?.account_id;
      const amount = incomeEntry?.amount || 0;

      // Check if this is a reconciliation adjustment BEFORE deleting the entry
      let isReconciliationAdjustment = false;
      let reconciliationId: string | null = null;

      // Check for reconciliation indicators
      if (incomeEntry) {
        // Check if it's a reconciliation adjustment by description
        const isReconciliationByDescription = incomeEntry.description && (
          incomeEntry.description.includes("[RECONCILIATION]") ||
          incomeEntry.description.includes("Reconciliation adjustment") ||
          incomeEntry.description.toLowerCase().includes("reconcil")
        );

        // Check if it's a reconciliation adjustment by payment method
        const isReconciliationByPaymentMethod = incomeEntry.payment_method === "reconciliation";

        // Check if it has a reconciliation_id field
        const hasReconciliationId = !!incomeEntry.reconciliation_id;

        isReconciliationAdjustment = isReconciliationByDescription || isReconciliationByPaymentMethod || hasReconciliationId;

        console.log(`Checking if income entry is a reconciliation adjustment:`, {
          id,
          description: incomeEntry.description,
          paymentMethod: incomeEntry.payment_method,
          hasReconciliationId,
          isReconciliationAdjustment
        });

        // If it's a reconciliation adjustment, try to find the reconciliation ID
        if (isReconciliationAdjustment) {
          // Method 1: Direct reconciliation_id field
          if (incomeEntry.reconciliation_id) {
            reconciliationId = incomeEntry.reconciliation_id;
            console.log(`Found reconciliation ID ${reconciliationId} directly in income entry`);
          }

          // Method 2: Extract from description
          if (!reconciliationId && incomeEntry.description) {
            // Try to extract reconciliation ID from description
            const reconcIdMatch = incomeEntry.description.match(/reconciliation id:\s*([a-f0-9-]+)/i);
            if (reconcIdMatch && reconcIdMatch[1]) {
              reconciliationId = reconcIdMatch[1];
              console.log(`Extracted reconciliation ID ${reconciliationId} from description`);
            } else {
              // Try to extract account ID from description
              const accountMatch = incomeEntry.description.match(/account\s+([a-f0-9-]+)/i);
              if (accountMatch && accountMatch[1]) {
                const extractedAccountId = accountMatch[1];
                console.log(`Extracted account ID ${extractedAccountId} from description`);

                // Find the most recent reconciliation for this account
                const { data: recentReconciliation, error: reconcError } = await supabase
                  .from("bank_reconciliations")
                  .select("id")
                  .eq("account_id", extractedAccountId)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (!reconcError && recentReconciliation) {
                  reconciliationId = recentReconciliation.id;
                  console.log(`Found most recent reconciliation ID ${reconciliationId} for account ${extractedAccountId}`);
                }
              }
            }
          }

          // Method 3: Check transaction_reconciliations table
          if (!reconciliationId) {
            const { data: reconciliationLink, error: linkError } = await supabase
              .from("transaction_reconciliations")
              .select("reconciliation_id")
              .eq("transaction_id", id)
              .maybeSingle();

            if (!linkError && reconciliationLink) {
              reconciliationId = reconciliationLink.reconciliation_id;
              console.log(`Found reconciliation ID ${reconciliationId} in transaction_reconciliations table`);
            }
          }

          // Method 4: Check reconciliation_items table
          if (!reconciliationId) {
            const { data: reconciliationItem, error: itemError } = await supabase
              .from("reconciliation_items")
              .select("reconciliation_id")
              .eq("transaction_id", id)
              .maybeSingle();

            if (!itemError && reconciliationItem) {
              reconciliationId = reconciliationItem.reconciliation_id;
              console.log(`Found reconciliation ID ${reconciliationId} in reconciliation_items table`);
            }
          }

          // Method 5: Last resort - use most recent reconciliation
          if (!reconciliationId) {
            const { data: recentReconciliations, error: recentError } = await supabase
              .from("bank_reconciliations")
              .select("id")
              .order("created_at", { ascending: false })
              .limit(1);

            if (!recentError && recentReconciliations && recentReconciliations.length > 0) {
              reconciliationId = recentReconciliations[0].id;
              console.log(`Using most recent reconciliation ID ${reconciliationId} as fallback`);
            }
          }
        }
      }

      // Now delete the income entry
      console.log("Deleting the income entry itself...");
      const { error } = await supabase
        .from('income_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting income entry:", error);
        throw error;
      }

      // If there was an account, update its balance
      if (accountId) {
        try {
          // Delete the account transaction
          const { error: txDeleteError } = await supabase
            .from("account_tx_table") // Changed from account_transactions to account_tx_table
            .delete()
            .eq("reference_id", id)
            .eq("reference_type", "income_entry");

          if (txDeleteError) {
            console.error("Error deleting account transaction:", txDeleteError);
            // Continue with balance recalculation even if transaction deletion fails
          } else {
            console.log("Successfully deleted account transaction for income entry:", id);
          }

          // Recalculate the account balance
          const newBalance = await AccountBalanceService.recalculateBalance(accountId);
          console.log(`Account ${accountId} balance recalculated to:`, newBalance);
        } catch (error) {
          console.error("Error handling account transaction cleanup:", error);
          // Don't throw here, we still want to return success for the income entry deletion
        }
      }

      // If this was a reconciliation adjustment, update the reconciliation book balance
      if (isReconciliationAdjustment && reconciliationId) {
        try {
          console.log(`Updating reconciliation book balance for deleted income adjustment...`);

          // Dynamically import the update function to avoid circular dependencies
          const { updateReconciliationBookBalanceAfterDeletion } = await import("@/lib/update-reconciliation-book-balance");

          // Call the function to update the book balance
          const success = await updateReconciliationBookBalanceAfterDeletion(
            reconciliationId,
            'income_entries',
            incomeEntry.amount,
            queryClient
          );

          if (success) {
            console.log(`Successfully updated reconciliation book balance after deleting income adjustment`);
          } else {
            console.error(`Failed to update reconciliation book balance after deleting income adjustment`);
          }
        } catch (error) {
          console.error("Error updating reconciliation book balance:", error);
          // Don't throw here, we still want to return success for the income entry deletion
        }
      }

      console.log("Income entry deleted successfully");
      return id;
    },
    onSuccess: (id) => {
      toast.success('Income entry deleted successfully');

      // Use the AccountBalanceService to invalidate all relevant queries
      // Make sure to invalidate all finance queries to ensure UI is updated
      AccountBalanceService.invalidateAllFinanceQueries(queryClient, {
        all: true
      });

      // Force immediate refetch of critical data
      queryClient.refetchQueries({ queryKey: ["accounts"] });
      queryClient.refetchQueries({ queryKey: ["accountTransactions"] });
      queryClient.refetchQueries({ queryKey: ["incomeEntries"] });

      // Also refetch new query structure
      queryClient.refetchQueries({ queryKey: ['finance', 'accounts'] });
      queryClient.refetchQueries({ queryKey: ['finance', 'income'] });
    },
    onError: (error) => {
      ErrorTracker.logError({
        operation: 'deleteIncomeEntry',
        component: 'useIncomeEntries',
        error
      });
      toast.error('Failed to delete income entry');
    }
  });

  return {
    addIncomeEntry,
    updateIncomeEntry,
    deleteIncomeEntry
  };
}
