"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Budget, BudgetItem } from "@/types/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import { financeKeys } from "@/lib/query-keys";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-utils";

/**
 * Hook for fetching all budgets
 * @param options Optional parameters including refreshTrigger to force a refresh
 */
export function useBudgets(options?: { refreshTrigger?: number }) {
  return useQuery({
    queryKey: [...financeKeys.budgets.lists(), options?.refreshTrigger],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("budgets")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          // Check if the error is because the table doesn't exist
          if (error.code === "PGRST204" || error.message.includes("not found")) {
            console.warn("Budgets table not found. This feature requires database setup.");
            return [];
          }

          throw error;
        }

        return data || [];
      } catch (error) {
        console.error("Error fetching budgets:", error);
        throw error;
      }
    },
    staleTime: STALE_TIMES.FREQUENT, // 1 minute - reduced to ensure more frequent updates
    gcTime: GC_TIMES.STANDARD, // 10 minutes
    refetchOnWindowFocus: true, // Enable refetch on window focus for better real-time updates
    refetchInterval: false // Disable automatic refetching to prevent infinite loops
  });
}

/**
 * Hook for fetching a single budget with its items
 */
export function useBudgetDetails(budgetId: string | null) {
  return useQuery({
    queryKey: financeKeys.budgets.detail(budgetId || ''),
    queryFn: async () => {
      if (!budgetId) return null;

      // Fetch the budget
      const { data: budget, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

      if (budgetError) throw budgetError;

      // Fetch budget items
      const { data: items, error: itemsError } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      return {
        ...budget,
        items: items || []
      };
    },
    enabled: !!budgetId,
    staleTime: STALE_TIMES.FREQUENT, // 1 minute - reduced to ensure more frequent updates
    gcTime: GC_TIMES.STANDARD, // 10 minutes
    refetchOnWindowFocus: true, // Enable refetch on window focus for better real-time updates
    refetchInterval: false // Disable automatic refetching to prevent infinite loops
  });
}

/**
 * Hook for budget mutations (create, update, delete)
 */
export function useBudgetMutations() {
  const queryClient = useQueryClient();

  // Create budget mutation
  const createBudget = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      start_date: Date;
      end_date: Date;
      total_amount: string;
      status: 'draft' | 'active' | 'completed' | 'cancelled';
    }) => {
      const budgetData = {
        title: values.title,
        description: values.description || null,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        total_amount: parseFloat(values.total_amount),
        status: values.status,
      };

      const { data, error } = await supabase
        .from("budgets")
        .insert(budgetData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate only the budget lists query
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });
      toast.success("Budget created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create budget: ${error.message}`);
    },
  });

  // Update budget mutation
  const updateBudget = useMutation({
    mutationFn: async ({ id, values }: {
      id: string;
      values: {
        title: string;
        description?: string;
        start_date: Date;
        end_date: Date;
        total_amount: string;
        status: 'draft' | 'active' | 'completed' | 'cancelled';
      };
    }) => {
      const budgetData = {
        title: values.title,
        description: values.description || null,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        total_amount: parseFloat(values.total_amount),
        status: values.status,
      };

      const { data, error } = await supabase
        .from("budgets")
        .update(budgetData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // More precise invalidation
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.detail(variables.id) });
      toast.success("Budget updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update budget: ${error.message}`);
    },
  });

  // Delete budget mutation
  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // More precise invalidation
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });
      queryClient.removeQueries({ queryKey: financeKeys.budgets.detail(id) });
      toast.success("Budget deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete budget: ${error.message}`);
    },
  });

  return {
    createBudget,
    updateBudget,
    deleteBudget
  };
}
