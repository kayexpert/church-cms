"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { BudgetItem, Account } from "@/types/finance";
import { toast } from "sonner";
import { financeKeys } from "@/lib/query-keys";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-utils";

/**
 * Hook for fetching budget items for a specific budget
 * @param budgetId The ID of the budget to fetch items for
 * @param options Optional parameters including refreshTrigger to force a refresh
 */
export function useBudgetItems(budgetId: string | null, options?: { refreshTrigger?: number }) {
  return useQuery({
    queryKey: [...financeKeys.budgets.items(budgetId || ''), options?.refreshTrigger],
    queryFn: async () => {
      if (!budgetId) return [];

      const { data, error } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
    staleTime: STALE_TIMES.FREQUENT, // 1 minute - reduced to ensure more frequent updates
    gcTime: GC_TIMES.STANDARD, // 10 minutes
    refetchOnWindowFocus: true, // Enable refetch on window focus for better real-time updates
    refetchInterval: false // Disable automatic refetching to prevent infinite loops
  });
}

/**
 * Hook for budget item mutations (create, update, delete)
 */
export function useBudgetItemMutations(budgetId: string) {
  const queryClient = useQueryClient();

  // Create budget item mutation
  const createBudgetItem = useMutation({
    mutationFn: async (values: {
      category_type: 'income' | 'expenditure';
      description?: string;
      amount: number;
      account_id?: string;
    }) => {
      // Prepare the request data
      const requestData = {
        budget_id: budgetId,
        category_type: values.category_type,
        description: values.description || null,
        amount: values.amount,
        account_id: values.category_type === "income" ? values.account_id : null,
      };

      const response = await fetch('/api/finance/budget-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create budget item');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.items(budgetId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.detail(budgetId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });

      // Also invalidate accounts since account balances may have changed
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.all });

      // Invalidate dashboard data since budget changes affect financial overview
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard.all() });

      // Force immediate refetch to ensure UI is updated
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.items(budgetId) });
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.detail(budgetId) });
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to create budget item: ${error.message}`);
    },
  });

  // Update budget item mutation
  const updateBudgetItem = useMutation({
    mutationFn: async ({ id, values }: {
      id: string;
      values: {
        category_type: 'income' | 'expenditure';
        description?: string;
        planned_amount: number;
        actual_amount?: number;
        account_id?: string;
      };
    }) => {
      const budgetItemData = {
        budget_id: budgetId,
        category_type: values.category_type,
        description: values.description || null,
        planned_amount: values.planned_amount,
        actual_amount: values.actual_amount || 0,
        account_id: values.category_type === "income" ? values.account_id : null,
      };

      const { data, error } = await supabase
        .from("budget_items")
        .update(budgetItemData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.items(budgetId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.detail(budgetId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });

      // Also invalidate accounts since account balances may have changed
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.all });

      // Invalidate dashboard data since budget changes affect financial overview
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard.all() });

      // Force immediate refetch to ensure UI is updated
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.items(budgetId) });
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.detail(budgetId) });
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to update budget item: ${error.message}`);
    },
  });

  // Delete budget item mutation
  const deleteBudgetItem = useMutation({
    mutationFn: async (id: string) => {
      // First, check if there are any expenditure entries linked to this budget item
      const { data: linkedExpenditures, error: fetchError } = await supabase
        .from("expenditure_entries")
        .select("id")
        .eq("budget_item_id", id);

      if (fetchError) {
        console.error("Error checking for linked expenditures:", fetchError);
        // Continue with deletion even if we couldn't check for linked expenditures
      } else if (linkedExpenditures && linkedExpenditures.length > 0) {
        console.log(`Found ${linkedExpenditures.length} expenditure entries linked to budget item ${id}`);

        // Delete all linked expenditure entries
        const { error: deleteExpError } = await supabase
          .from("expenditure_entries")
          .delete()
          .eq("budget_item_id", id);

        if (deleteExpError) {
          console.error("Error deleting linked expenditures:", deleteExpError);
          toast.warning("Some linked expenditure entries may not have been deleted");
        } else {
          console.log("Successfully deleted linked expenditure entries");
        }
      }

      // Now delete the budget item
      const { error } = await supabase
        .from("budget_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.items(budgetId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.detail(budgetId) });
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });

      // Also invalidate accounts since account balances may have changed
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts.all });

      // Invalidate expenditure entries since we may have deleted some
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      // Invalidate dashboard data since budget changes affect financial overview
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard.all() });

      // Force immediate refetch to ensure UI is updated
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.items(budgetId) });
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.detail(budgetId) });
      queryClient.refetchQueries({ queryKey: financeKeys.budgets.lists() });
      queryClient.refetchQueries({ queryKey: ["expenditureEntries"] });

      toast.success("Budget item and linked expenditures deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete budget item: ${error.message}`);
    },
  });

  return {
    createBudgetItem,
    updateBudgetItem,
    deleteBudgetItem
  };
}
