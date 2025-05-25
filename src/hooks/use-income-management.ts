"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { IncomeEntry, IncomeCategory } from "@/types/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import { filterSystemIncomeCategories, isSystemIncomeCategory } from "@/lib/identify-system-categories";

export interface IncomeFilter {
  search?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook for fetching income categories
 * @param includeSystemCategories Whether to include system categories in the returned data
 * @returns Both all categories and user-visible categories (filtered)
 */
export function useIncomeCategories(includeSystemCategories = true) {
  const query = useQuery({
    queryKey: ["incomeCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as IncomeCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Add filtered categories to the result
  const allCategories = query.data || [];
  const userCategories = filterSystemIncomeCategories(allCategories);

  return {
    ...query,
    data: includeSystemCategories ? allCategories : userCategories,
    allCategories,
    userCategories
  };
}

/**
 * Hook for fetching income entries with filtering and pagination
 */
export function useIncomeEntries(page = 1, pageSize = 20, filters: IncomeFilter = {}) {
  return useQuery({
    queryKey: ["incomeEntries", page, pageSize, filters],
    queryFn: async () => {
      // Calculate pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Start building the query
      let query = supabase
        .from("income_entries")
        .select(`
          *,
          income_categories(id, name)
        `, { count: 'exact' });

      // Apply filters
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,source.ilike.%${filters.search}%`);
      }

      if (filters.startDate) {
        query = query.gte("date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("date", filters.endDate);
      }

      // Apply pagination and ordering
      query = query
        .range(from, to)
        .order("date", { ascending: false });

      // Execute the query
      const { data, error, count } = await query;

      if (error) throw error;

      // Process the data to ensure consistent types
      const processedData = data?.map(entry => ({
        ...entry,
        amount: typeof entry.amount === 'string' ? parseFloat(entry.amount) : entry.amount,
        category: entry.income_categories
      })) || [];

      return {
        data: processedData,
        count: count || 0,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0
      };
    },
    keepPreviousData: true,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for income mutations (create, update, delete)
 */
export function useIncomeMutations() {
  const queryClient = useQueryClient();

  // Create income entry mutation
  const createIncomeEntry = useMutation({
    mutationFn: async (values: {
      date: Date;
      category_id: string;
      amount: string;
      source?: string;
      description?: string;
      payment_method?: string;
      account_id?: string;
    }) => {
      const incomeData = {
        date: format(values.date, "yyyy-MM-dd"),
        category_id: values.category_id,
        amount: parseFloat(values.amount),
        source: values.source || null,
        description: values.description || null,
        payment_method: values.payment_method || "cash",
        account_id: values.account_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("income_entries")
        .insert(incomeData)
        .select()
        .single();

      if (error) throw error;

      // If an account is specified, create an account transaction
      if (values.account_id) {
        const transactionData = {
          account_id: values.account_id,
          date: format(values.date, "yyyy-MM-dd"),
          amount: parseFloat(values.amount),
          description: values.description || "Income entry",
          transaction_type: "income",
          reference_id: data.id,
          reference_type: "income_entry",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: transactionError } = await supabase
          .from("account_transactions")
          .insert(transactionData);

        if (transactionError) {
          console.error("Error creating account transaction:", transactionError);
          // We don't throw here to avoid rolling back the income entry
          // Instead, we'll just log the error and continue
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });
      toast.success("Income entry added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add income entry: ${error.message}`);
    },
  });

  // Delete income entry mutation
  const deleteIncomeEntry = useMutation({
    mutationFn: async (entry: IncomeEntry) => {
      // Import the deleteFinancialEntry function dynamically to avoid circular dependencies
      const { deleteFinancialEntry } = await import("@/lib/delete-financial-entry");

      // Use the centralized function to delete the income entry and handle account transactions
      const success = await deleteFinancialEntry("income_entries", entry.id);

      if (!success) {
        throw new Error("Failed to delete income entry");
      }

      return entry.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });

      // Also invalidate budget-related queries
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      // Force refetch to update UI immediately
      queryClient.refetchQueries({ queryKey: ["incomeEntries"] });
      queryClient.refetchQueries({ queryKey: ["accounts"] });
      queryClient.refetchQueries({ queryKey: ["accountTransactions"] });
      queryClient.refetchQueries({ queryKey: ["budgetItems"] });
      queryClient.refetchQueries({ queryKey: ["budgets"] });

      // Toast is already shown in deleteFinancialEntry
    },
    onError: (error) => {
      // Toast is already shown in deleteFinancialEntry, but we'll add a fallback
      if (error.message !== "Failed to delete income entry") {
        toast.error(`Failed to delete income entry: ${error.message}`);
      }
    },
  });

  return {
    createIncomeEntry,
    deleteIncomeEntry
  };
}
