"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AccountTransaction } from "@/types/finance";
import { isOpeningBalanceEntry } from "@/lib/identify-special-income-entries";

/**
 * Custom hook for fetching account transactions
 */
export function useAccountTransactions(accountId: string | null, options: {
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { limit = 50, enabled = true } = options;

  return useQuery({
    queryKey: ["accountTransactions", accountId],
    queryFn: async () => {
      if (!accountId) return [] as AccountTransaction[];

      console.log(`Fetching transactions for account ${accountId}`);

      try {
        // First try to get transactions from the account_tx_table
        const { data: tableData, error: tableError } = await supabase
          .from("account_tx_table")
          .select("*")
          .eq("account_id", accountId)
          .order("date", { ascending: false })
          .limit(limit);

        if (tableError) {
          console.error("Error fetching from account_tx_table:", tableError);

          // Fall back to the view if the table doesn't exist or has an error
          try {
            const { data: viewData, error: viewError } = await supabase
              .from("account_transactions")
              .select("*")
              .eq("account_id", accountId)
              .order("date", { ascending: false })
              .limit(limit);

            if (viewError) {
              console.error("Error fetching from account_transactions view:", viewError);
              throw new Error(`Failed to load account transactions: ${viewError.message}`);
            }

            console.log(`Retrieved ${viewData?.length || 0} transactions from account_transactions view`);
            return (viewData || []) as AccountTransaction[];
          } catch (viewError) {
            console.error("Error fetching from account_transactions view:", viewError);
            if (viewError instanceof Error) {
              throw viewError;
            } else {
              throw new Error("Failed to load account transactions");
            }
          }
        }

        console.log(`Retrieved ${tableData?.length || 0} transactions from account_tx_table`);
        return (tableData || []) as AccountTransaction[];
      } catch (error) {
        console.error("Error in useAccountTransactions:", error);
        throw error;
      }
    },
    enabled: enabled && !!accountId,
    staleTime: 0, // No stale time to ensure fresh data on every render
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refetch every 5 seconds while the component is mounted
    refetchIntervalInBackground: false, // Only refetch when the window is focused
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
    // This ensures that when income or expenditure entries are created/updated,
    // the account transactions are also refreshed
    onSuccess: (data) => {
      console.log(`Successfully fetched ${data.length} transactions for account ${accountId}`);
    }
  });
}

/**
 * Custom hook for fetching account transaction summary
 * Returns totals for inflow, outflow, transfers in, and transfers out
 */
export function useAccountTransactionSummary(accountId: string | null) {
  const { data: transactions = [] as AccountTransaction[], isLoading, error, refetch } = useAccountTransactions(accountId, {
    // Ensure this hook uses the same settings as the main transactions hook
    enabled: !!accountId,
  });

  // Log when summary is being calculated
  console.log(`Calculating transaction summary for account ${accountId}, ${transactions?.length || 0} transactions`);

  // Calculate summary statistics if transactions are available
  const summary = Array.isArray(transactions) ? transactions.reduce(
    (acc, transaction) => {
      // Check if this is an income transaction
      if (transaction.transaction_type === "income") {
        // Skip opening balance entries when calculating inflow
        // Use the comprehensive isOpeningBalanceEntry function to check all possible opening balance formats
        const isOpeningBalance = isOpeningBalanceEntry({
          ...transaction,
          // Add any missing properties that might be needed by isOpeningBalanceEntry
          category_id: transaction.category_id || '',
          created_at: transaction.created_at || '',
          updated_at: transaction.updated_at || ''
        });

        if (!isOpeningBalance) {
          // Include regular income entries (not opening balances)
          acc.totalInflow += transaction.amount;

          // If this is a loan income entry, also track it separately
          if (transaction.description?.includes("Loan from")) {
            acc.totalLoanInflow += transaction.amount;
          }
        }
      } else if (transaction.transaction_type === "expenditure") {
        acc.totalOutflow += Math.abs(transaction.amount);
      } else if (transaction.transaction_type === "transfer_in") {
        acc.totalTransfersIn += transaction.amount;
      } else if (transaction.transaction_type === "transfer_out") {
        acc.totalTransfersOut += Math.abs(transaction.amount);
      }
      return acc;
    },
    {
      totalInflow: 0,
      totalOutflow: 0,
      totalTransfersIn: 0,
      totalTransfersOut: 0,
      totalLoanInflow: 0, // Track loan income separately
    }
  ) : {
    totalInflow: 0,
    totalOutflow: 0,
    totalTransfersIn: 0,
    totalTransfersOut: 0,
    totalLoanInflow: 0,
  };

  return {
    summary,
    isLoading,
    error,
    refetch
  };
}

/**
 * Custom hook for fetching recent account transfers
 */
export function useAccountTransfers(options: {
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: ["accountTransfers", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_transfers")
        .select(`
          *,
          source_account:source_account_id(id, name),
          destination_account:destination_account_id(id, name)
        `)
        .order("date", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
