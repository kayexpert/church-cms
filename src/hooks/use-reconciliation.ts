"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AccountTransaction, Account } from "@/types/finance";
import { financeKeys } from "@/lib/query-keys";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-utils";

/**
 * Custom hook for fetching account balance
 */
export function useAccountBalance(accountId: string | null) {
  return useQuery({
    queryKey: financeKeys.accounts.balance(accountId || ""),
    queryFn: async () => {
      if (!accountId) return null;

      try {
        const response = await fetch(`/api/finance/account-balance?account_id=${accountId}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching account balance:", errorData);
          throw new Error(errorData.error || "Failed to fetch account balance");
        }

        const { data } = await response.json();

        // Validate the data
        if (!data || data.balance === undefined) {
          // Return a default object with balance 0 to prevent UI errors
          return {
            id: accountId,
            name: "Unknown",
            balance: 0
          };
        }

        return data;
      } catch (error) {
        console.error("Exception in useAccountBalance hook:", error);
        throw error;
      }
    },
    enabled: !!accountId,
    staleTime: STALE_TIMES.FREQUENT, // 1 minute - for frequently changing data
    gcTime: GC_TIMES.STANDARD, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });
}

/**
 * Custom hook for fetching reconciliation transactions
 */
export function useReconciliationTransactions(
  accountId: string | null,
  startDate: string | null,
  endDate: string | null,
  reconciliationId: string | null
) {
  const queryClient = useQueryClient();

  // Memoize the formatted dates to prevent unnecessary recalculations
  const { formattedStartDate, formattedEndDate } = useMemo(() => {
    return {
      formattedStartDate: startDate ? startDate.split('T')[0] : null,
      formattedEndDate: endDate ? endDate.split('T')[0] : null
    };
  }, [startDate, endDate]);

  return useQuery({
    queryKey: financeKeys.reconciliation.transactions(accountId || "", startDate, endDate, reconciliationId),
    queryFn: async () => {
      if (!accountId || !formattedStartDate || !formattedEndDate) return [];

      let url = `/api/finance/reconciliation?account_id=${accountId}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`;

      if (reconciliationId) {
        url += `&reconciliation_id=${reconciliationId}`;
      }

      try {
        const response = await fetch(url, {
          // Add cache busting to prevent browser caching
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Request-Time': new Date().getTime().toString()
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching reconciliation transactions:", errorData);
          throw new Error(errorData.error || "Failed to fetch reconciliation transactions");
        }

        const { data } = await response.json();

        if (!data || data.length === 0) {
          return [];
        }

        // Ensure all transactions have the is_reconciled property
        const processedData = data.map(tx => ({
          ...tx,
          is_reconciled: tx.is_reconciled === undefined || tx.is_reconciled === null ? false : tx.is_reconciled,
          reconciliation_id: tx.reconciliation_id || null
        }));

        return processedData as AccountTransaction[];
      } catch (error) {
        console.error("Exception in useReconciliationTransactions hook:", error);
        throw error;
      }
    },
    enabled: !!accountId && !!startDate && !!endDate,
    staleTime: STALE_TIMES.REAL_TIME, // Always refetch on mount for reconciliation data
    gcTime: GC_TIMES.STANDARD, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: (error) => {
      console.error("Error in useReconciliationTransactions hook:", error);
    }
  });
}

/**
 * Custom hook for updating transaction reconciliation status
 */
export function useUpdateReconciliationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      isReconciled,
      reconciliationId,
    }: {
      transactionId: string;
      isReconciled: boolean;
      reconciliationId: string;
    }) => {
      const response = await fetch("/api/finance/reconciliation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          is_reconciled: isReconciled,
          reconciliation_id: reconciliationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update reconciliation status");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Selectively invalidate only the necessary queries
      // This is more efficient than invalidating all finance queries

      // Invalidate specific reconciliation transactions query
      queryClient.invalidateQueries({
        queryKey: financeKeys.reconciliation.transactions(
          "", // We don't know the account ID here, so use a wildcard
          null,
          null,
          variables.reconciliationId
        ),
      });

      // Invalidate specific reconciliation detail
      queryClient.invalidateQueries({
        queryKey: financeKeys.reconciliation.detail(variables.reconciliationId),
      });
    },
  });
}

/**
 * Custom hook for batch updating transaction reconciliation status
 */
export function useBatchUpdateReconciliationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionIds,
      isReconciled,
      reconciliationId,
    }: {
      transactionIds: string[];
      isReconciled: boolean;
      reconciliationId: string;
    }) => {
      const response = await fetch("/api/finance/reconciliation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_ids: transactionIds,
          is_reconciled: isReconciled,
          reconciliation_id: reconciliationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update reconciliation status");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Selectively invalidate only the necessary queries
      // This is more efficient than invalidating all finance queries

      // Invalidate specific reconciliation transactions query
      queryClient.invalidateQueries({
        queryKey: financeKeys.reconciliation.transactions(
          "", // We don't know the account ID here, so use a wildcard
          null,
          null,
          variables.reconciliationId
        ),
      });

      // Invalidate specific reconciliation detail
      queryClient.invalidateQueries({
        queryKey: financeKeys.reconciliation.detail(variables.reconciliationId),
      });
    },
  });
}

/**
 * Custom hook for calculating reconciliation summary
 */
export function useReconciliationSummary(
  transactions: AccountTransaction[] | undefined,
  bankBalance: number
) {
  // Use useMemo to prevent unnecessary recalculations
  return useMemo(() => {
    // Calculate summary from transactions
    const reconciledTransactions = transactions?.filter(tx => tx.is_reconciled) || [];

    // Calculate reconciled amount properly based on transaction type
    const reconciledAmount = reconciledTransactions.reduce((sum, tx) => {
      if (tx.transaction_type === 'income' || tx.transaction_type === 'transfer_in') {
        return sum + tx.amount;
      } else if (tx.transaction_type === 'expenditure' || tx.transaction_type === 'transfer_out') {
        return sum - Math.abs(tx.amount); // Subtract expenditures
      }
      return sum;
    }, 0);

    // Calculate the difference between bank balance and reconciled amount
    // This is the key value that determines if the reconciliation is balanced
    const difference = bankBalance - reconciledAmount;

    // Calculate total amount once to avoid redundant calculations
    const totalAmount = transactions?.reduce((sum, tx) => {
      if (tx.transaction_type === 'income' || tx.transaction_type === 'transfer_in') {
        return sum + tx.amount;
      } else if (tx.transaction_type === 'expenditure' || tx.transaction_type === 'transfer_out') {
        return sum - Math.abs(tx.amount);
      }
      return sum;
    }, 0) || 0;

    return {
      totalTransactions: transactions?.length || 0,
      reconciledTransactions: reconciledTransactions.length,
      totalAmount,
      reconciledAmount,
      difference,
    };
  }, [transactions, bankBalance]);
}
