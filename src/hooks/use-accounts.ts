"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Account } from "@/types/finance";
import { toast } from "sonner";
import { calculateAccountBalance } from "@/lib/calculate-account-balance";

/**
 * Custom hook for fetching accounts with calculated balances
 */
export function useAccounts(options: {
  sortField?: "name" | "balance";
  sortDirection?: "asc" | "desc";
  refreshInterval?: number;
  enabled?: boolean;
} = {}) {
  const {
    sortField = "name",
    sortDirection = "asc",
    refreshInterval = 30000, // Default to 30 seconds
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ["accounts", sortField, sortDirection],
    queryFn: async () => {
      // First, get all accounts
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order(sortField, { ascending: sortDirection === "asc" });

      if (error) throw error;

      // Check if we have any accounts
      if (!data || data.length === 0) {
        console.warn("No accounts found in the database");
        return [];
      }

      // For each account, fetch transactions and calculate the correct balance
      const accountsWithCalculatedBalances = await Promise.all(
        data.map(async (account) => {
          // Fetch transactions for this account
          const { data: transactions, error: txError } = await supabase
            .from("account_transactions")
            .select("*")
            .eq("account_id", account.id);

          if (txError) {
            console.error(`Error fetching transactions for account ${account.id}:`, txError);
            return account;
          }

          // Use our centralized utility to calculate the balance
          const calculatedBalance = calculateAccountBalance(account, transactions || []);

          // Return account with calculated balance
          return {
            ...account,
            calculatedBalance
          };
        })
      );

      return accountsWithCalculatedBalances as (Account & { calculatedBalance: number })[];
    },
    refetchInterval: refreshInterval,
    staleTime: 0, // No stale time to ensure fresh data on every render
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled,
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Custom hook for fetching a single account with calculated balance
 */
export function useAccount(id: string | null) {
  return useQuery({
    queryKey: ["account", id],
    queryFn: async () => {
      if (!id) return null;

      // Get the account
      const { data: account, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        // If the account doesn't exist, return null instead of throwing
        if (error.code === 'PGRST116') {
          console.warn(`Account with ID ${id} not found`);
          return null;
        }
        throw error;
      }

      // Fetch transactions for this account
      const { data: transactions, error: txError } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", id);

      if (txError) {
        console.error(`Error fetching transactions for account ${id}:`, txError);
        return account;
      }

      // Use our centralized utility to calculate the balance
      const calculatedBalance = calculateAccountBalance(account, transactions || []);

      // Return account with calculated balance
      return {
        ...account,
        calculatedBalance
      } as Account & { calculatedBalance: number };
    },
    enabled: !!id,
    staleTime: 0, // No stale time to ensure fresh data on every render
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true // Refetch when window regains focus
  });
}
