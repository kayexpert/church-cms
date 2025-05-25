"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ExpenditureEntry, ExpenditureCategory } from "@/types/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import { syncAccountBalance, ensureAccountTransaction, invalidateAccountQueries } from "@/lib/account-sync-utils";
import { syncExpenditureEntryWithAccountTransactions } from "@/lib/sync-expenditure-transactions";
import { filterSystemExpenditureCategories, isSystemExpenditureCategory } from "@/lib/identify-system-categories";

export interface ExpenditureFilter {
  search?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook for fetching expenditure categories
 * @param includeSystemCategories Whether to include system categories in the returned data
 * @returns Both all categories and user-visible categories (filtered)
 */
export function useExpenditureCategories(includeSystemCategories = true) {
  const query = useQuery({
    queryKey: ["expenditureCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenditure_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as ExpenditureCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Add filtered categories to the result
  const allCategories = query.data || [];
  const userCategories = filterSystemExpenditureCategories(allCategories);

  return {
    ...query,
    data: includeSystemCategories ? allCategories : userCategories,
    allCategories,
    userCategories
  };
}

/**
 * Hook for fetching expenditure entries with filtering and pagination
 */
export function useExpenditureEntries(page = 1, pageSize = 20, filters: ExpenditureFilter = {}) {
  return useQuery({
    queryKey: ["expenditureEntries", page, pageSize, filters],
    queryFn: async () => {
      // Calculate pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Start building the query
      let query = supabase
        .from("expenditure_entries")
        .select(`
          *,
          expenditure_categories(id, name)
        `, { count: 'exact' });

      // Apply filters
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,recipient.ilike.%${filters.search}%`);
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
        category: entry.expenditure_categories
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
 * Hook for expenditure mutations (create, update, delete)
 */
export function useExpenditureMutations() {
  const queryClient = useQueryClient();

  // Create expenditure entry mutation
  const createExpenditureEntry = useMutation({
    mutationFn: async (values: {
      date: Date;
      category_id: string;
      amount: string;
      recipient?: string;
      description?: string;
      payment_method?: string;
      account_id?: string;
      liability_id?: string;
    }) => {
      const expenditureData = {
        date: format(values.date, "yyyy-MM-dd"),
        category_id: values.category_id,
        amount: parseFloat(values.amount),
        recipient: values.recipient || null,
        description: values.description || null,
        payment_method: values.payment_method || "cash",
        account_id: values.account_id || null,
        liability_id: values.liability_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("expenditure_entries")
        .insert(expenditureData)
        .select()
        .single();

      if (error) throw error;

      // If an account is specified, ensure the transaction is recorded and balance is updated
      if (values.account_id) {
        try {
          // Use the dedicated sync function to ensure the expenditure entry is properly recorded
          await syncExpenditureEntryWithAccountTransactions(data.id);

          console.log(`Expenditure entry ${data.id} synced with account transactions`);
        } catch (syncError) {
          console.error("Error syncing expenditure entry with account transactions:", syncError);

          // Fall back to the old method if the sync function fails
          await ensureAccountTransaction(
            values.account_id,
            parseFloat(values.amount),
            format(values.date, "yyyy-MM-dd"),
            values.description || "Expenditure entry",
            'expenditure',
            data.id,
            'expenditure_entry'
          );

          // Sync account balance
          await syncAccountBalance(
            values.account_id,
            parseFloat(values.amount),
            'create',
            'expenditure',
            queryClient
          );
        }
      }

      // If this is a liability payment, update the liability
      if (values.liability_id) {
        // First, get the current liability
        const { data: liability, error: liabilityError } = await supabase
          .from("liability_entries")
          .select("*")
          .eq("id", values.liability_id)
          .single();

        if (liabilityError) {
          console.error("Error fetching liability:", liabilityError);
        } else if (liability) {
          // Calculate new amounts
          const amountPaid = (parseFloat(liability.amount_paid) || 0) + parseFloat(values.amount);
          const amountRemaining = Math.max(0, parseFloat(liability.total_amount) - amountPaid);

          // Determine new status
          let status: 'unpaid' | 'partial' | 'paid';
          if (amountPaid <= 0) {
            status = 'unpaid';
          } else if (amountPaid < parseFloat(liability.total_amount)) {
            status = 'partial';
          } else {
            status = 'paid';
          }

          // Update the liability
          const { error: updateError } = await supabase
            .from("liability_entries")
            .update({
              amount_paid: amountPaid,
              amount_remaining: amountRemaining,
              status,
              last_payment_date: format(values.date, "yyyy-MM-dd"),
              updated_at: new Date().toISOString()
            })
            .eq("id", values.liability_id);

          if (updateError) {
            console.error("Error updating liability:", updateError);
          }
        }
      }

      // If this expenditure is linked to a budget item, update the budget item
      if (data.budget_item_id) {
        try {
          // Import the updateBudgetItemForExpenditure function dynamically to avoid circular dependencies
          const { updateBudgetItemForExpenditure } = await import("@/lib/update-budget-item-for-expenditure");

          // Update the budget item
          const success = await updateBudgetItemForExpenditure(data.id, queryClient);

          if (!success) {
            console.warn(`Failed to update budget item for expenditure ${data.id}`);
          }
        } catch (budgetUpdateError) {
          console.error("Error updating budget item for expenditure:", budgetUpdateError);
        }
      }

      return data;
    },
    onSuccess: () => {
      // Use the centralized function to invalidate all relevant queries
      invalidateAccountQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Expenditure entry added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add expenditure entry: ${error.message}`);
    },
  });

  // Delete expenditure entry mutation
  const deleteExpenditureEntry = useMutation({
    mutationFn: async (entry: ExpenditureEntry) => {
      // If this was a liability payment, we need to update the liability first
      if (entry.liability_id) {
        // First, get the current liability
        const { data: liability, error: liabilityError } = await supabase
          .from("liability_entries")
          .select("*")
          .eq("id", entry.liability_id)
          .single();

        if (liabilityError) {
          console.error("Error fetching liability:", liabilityError);
        } else if (liability) {
          // Calculate new amounts
          const amountPaid = Math.max(0, (parseFloat(liability.amount_paid) || 0) - parseFloat(entry.amount));
          const amountRemaining = Math.max(0, parseFloat(liability.total_amount) - amountPaid);

          // Determine new status
          let status: 'unpaid' | 'partial' | 'paid';
          if (amountPaid <= 0) {
            status = 'unpaid';
          } else if (amountPaid < parseFloat(liability.total_amount)) {
            status = 'partial';
          } else {
            status = 'paid';
          }

          // Update the liability
          const { error: updateError } = await supabase
            .from("liability_entries")
            .update({
              amount_paid: amountPaid,
              amount_remaining: amountRemaining,
              status,
              updated_at: new Date().toISOString()
            })
            .eq("id", entry.liability_id);

          if (updateError) {
            console.error("Error updating liability:", updateError);
          }
        }
      }

      // Import the deleteFinancialEntry function dynamically to avoid circular dependencies
      const { deleteFinancialEntry } = await import("@/lib/delete-financial-entry");

      // Use the centralized function to delete the expenditure entry and handle account transactions
      const success = await deleteFinancialEntry("expenditure_entries", entry.id);

      if (!success) {
        throw new Error("Failed to delete expenditure entry");
      }

      return entry.id;
    },
    onSuccess: () => {
      // Use the centralized function to invalidate all relevant queries
      invalidateAccountQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      // Toast is already shown in deleteFinancialEntry
    },
    onError: (error) => {
      // Toast is already shown in deleteFinancialEntry, but we'll add a fallback
      if (error.message !== "Failed to delete expenditure entry") {
        toast.error(`Failed to delete expenditure entry: ${error.message}`);
      }
    },
  });

  return {
    createExpenditureEntry,
    deleteExpenditureEntry
  };
}
