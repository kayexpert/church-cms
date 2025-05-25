"use client";

import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Define standard stale times
const STALE_TIMES = {
  STANDARD: 5 * 60 * 1000, // 5 minutes
  STATIC: 10 * 60 * 1000,  // 10 minutes - for rarely changing data
};

// Define query keys directly to avoid circular dependencies
const FINANCE_BASE_KEY = ['finance'];
const ACCOUNTS_LIST_KEY = [...FINANCE_BASE_KEY, 'accounts', 'list'];
const INCOME_CATEGORIES_KEY = [...FINANCE_BASE_KEY, 'income', 'categories'];
const EXPENDITURE_CATEGORIES_KEY = [...FINANCE_BASE_KEY, 'expenditure', 'categories'];

/**
 * Prefetches common finance data to improve initial load performance
 * @param queryClient The React Query client instance
 */
export async function prefetchFinanceData(queryClient: QueryClient) {
  try {
    console.log("Starting finance data prefetch");

    // Prefetch accounts (used across multiple finance sections)
    if (!queryClient.getQueryData(ACCOUNTS_LIST_KEY)) {
      queryClient.prefetchQuery({
        queryKey: ACCOUNTS_LIST_KEY,
        queryFn: async () => {
          const { data, error } = await supabase
            .from("accounts")
            .select("*")
            .order("name");

          if (error) throw error;
          return data;
        },
        staleTime: STALE_TIMES.STANDARD,
      });
    }

    // Prefetch income categories (used in income management and dashboard)
    if (!queryClient.getQueryData(INCOME_CATEGORIES_KEY)) {
      queryClient.prefetchQuery({
        queryKey: INCOME_CATEGORIES_KEY,
        queryFn: async () => {
          const { data, error } = await supabase
            .from("income_categories")
            .select("*")
            .order("name");

          if (error) throw error;
          return data;
        },
        staleTime: STALE_TIMES.STATIC, // Categories change less frequently
      });
    }

    // Prefetch expenditure categories (used in expenditure management and dashboard)
    if (!queryClient.getQueryData(EXPENDITURE_CATEGORIES_KEY)) {
      queryClient.prefetchQuery({
        queryKey: EXPENDITURE_CATEGORIES_KEY,
        queryFn: async () => {
          const { data, error } = await supabase
            .from("expenditure_categories")
            .select("*")
            .order("name");

          if (error) throw error;
          return data;
        },
        staleTime: STALE_TIMES.STATIC, // Categories change less frequently
      });
    }

    console.log("Finance data prefetch completed successfully");
  } catch (error) {
    console.error("Error prefetching finance data:", error);
    throw error;
  }
}
