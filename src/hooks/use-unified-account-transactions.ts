"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AccountTransaction } from "@/types/finance";
import { 
  getAccountTransactions, 
  createAccountTransaction, 
  updateAccountTransaction, 
  deleteAccountTransaction 
} from "@/lib/account-transactions-utils";
import { calculateTransactionSummary } from "@/lib/calculate-account-balance";
import { financeKeys } from "@/lib/query-keys";

/**
 * Custom hook for fetching and managing account transactions
 * This provides a unified interface for working with account transactions
 * regardless of which table they're stored in
 */
export function useUnifiedAccountTransactions(accountId: string | null, options: {
  limit?: number;
  enabled?: boolean;
  startDate?: string;
  endDate?: string;
} = {}) {
  const { 
    limit = 100, 
    enabled = true,
    startDate,
    endDate
  } = options;
  
  const queryClient = useQueryClient();

  // Query for fetching transactions
  const {
    data: transactions,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: financeKeys.accounts.transactions(accountId || '', { limit, startDate, endDate }),
    queryFn: async () => {
      if (!accountId) return [] as AccountTransaction[];

      const { data, error } = await getAccountTransactions(accountId, {
        limit,
        startDate,
        endDate
      });

      if (error) {
        console.error("Error in useUnifiedAccountTransactions:", error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && !!accountId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Calculate transaction summary
  const summary = transactions ? calculateTransactionSummary(transactions) : {
    totalInflow: 0,
    totalOutflow: 0,
    totalTransfersIn: 0,
    totalTransfersOut: 0,
    totalLoanInflow: 0,
  };

  // Mutation for creating a transaction
  const createTransactionMutation = useMutation({
    mutationFn: async (newTransaction: Omit<AccountTransaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await createAccountTransaction(newTransaction);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate the transactions query to refetch the data
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.transactions(accountId || '') });
      // Also invalidate the account balance query
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.balance(accountId || '') });
    },
  });

  // Mutation for updating a transaction
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, transaction }: { 
      id: string; 
      transaction: Partial<Omit<AccountTransaction, 'id' | 'created_at' | 'updated_at'>> 
    }) => {
      const { data, error } = await updateAccountTransaction(id, transaction);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate the transactions query to refetch the data
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.transactions(accountId || '') });
      // Also invalidate the account balance query
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.balance(accountId || '') });
    },
  });

  // Mutation for deleting a transaction
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { success, error } = await deleteAccountTransaction(id);
      if (error) throw error;
      return success;
    },
    onSuccess: () => {
      // Invalidate the transactions query to refetch the data
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.transactions(accountId || '') });
      // Also invalidate the account balance query
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.balance(accountId || '') });
    },
  });

  return {
    transactions,
    summary,
    isLoading,
    error,
    refetch,
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
  };
}
