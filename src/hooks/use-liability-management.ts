"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LiabilityEntry, LiabilityCategory } from "@/types/finance";
import { toast } from "sonner";
import { format } from "date-fns";

export interface LiabilityFilter {
  search?: string;
  status?: string;
  categoryId?: string;
}

/**
 * Hook for fetching liability categories
 */
export function useLiabilityCategories() {
  return useQuery({
    queryKey: ["liabilityCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liability_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as LiabilityCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for fetching liability entries with filtering and pagination
 */
export function useLiabilityEntries(page = 1, pageSize = 20, filters: LiabilityFilter = {}) {
  return useQuery({
    queryKey: ["liabilityEntries", page, pageSize, filters],
    queryFn: async () => {
      // Calculate pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Start building the query
      let query = supabase
        .from("liability_entries")
        .select(`
          *,
          liability_categories(id, name)
        `, { count: 'exact' });

      // Apply filters
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.search) {
        query = query.or(`creditor_name.ilike.%${filters.search}%,details.ilike.%${filters.search}%`);
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
        total_amount: typeof entry.total_amount === 'string' ? parseFloat(entry.total_amount) : entry.total_amount,
        amount_paid: typeof entry.amount_paid === 'string' ? parseFloat(entry.amount_paid) : entry.amount_paid,
        amount_remaining: typeof entry.amount_remaining === 'string' ? parseFloat(entry.amount_remaining) : entry.amount_remaining,
        is_loan: entry.is_loan === 'true' || entry.is_loan === true,
        category: entry.liability_categories
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
 * Hook for fetching liability entries that can be paid (unpaid or partial)
 */
export function useLiabilityEntriesForPayment() {
  return useQuery({
    queryKey: ["liabilityEntriesForPayment"],
    queryFn: async () => {
      try {
        // Fetch liability entries with status unpaid or partial
        const { data, error } = await supabase
          .from("liability_entries")
          .select(`
            *,
            liability_categories(id, name)
          `)
          .or("status.eq.unpaid,status.eq.partial")
          .order("date", { ascending: false });

        if (error) throw error;

        // Process the data to ensure consistent types
        const processedData = data?.map(entry => ({
          ...entry,
          total_amount: typeof entry.total_amount === 'string' ? parseFloat(entry.total_amount) : entry.total_amount,
          amount_paid: typeof entry.amount_paid === 'string' ? parseFloat(entry.amount_paid) : entry.amount_paid,
          amount_remaining: typeof entry.amount_remaining === 'string' ? parseFloat(entry.amount_remaining) : entry.amount_remaining,
          is_loan: entry.is_loan === 'true' || entry.is_loan === true,
          category: entry.liability_categories
        })) || [];

        return processedData;
      } catch (error) {
        console.error("Error fetching liability entries for payment:", error);
        return [];
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for liability mutations (create, update, delete)
 */
export function useLiabilityMutations() {
  const queryClient = useQueryClient();

  // Create liability mutation
  const createLiability = useMutation({
    mutationFn: async (values: {
      date: Date;
      category_id: string;
      creditor_name: string;
      details?: string;
      total_amount: string;
      amount_paid: string;
      due_date?: Date;
      is_loan: boolean;
      payment_method?: string;
      account_id?: string;
    }) => {
      // Calculate amount remaining and status
      const totalAmount = parseFloat(values.total_amount);
      const amountPaid = values.amount_paid ? parseFloat(values.amount_paid) : 0;
      const amountRemaining = Math.max(0, totalAmount - amountPaid);

      // Determine status
      let status: 'unpaid' | 'partial' | 'paid';
      if (amountPaid <= 0) {
        status = 'unpaid';
      } else if (amountPaid < totalAmount) {
        status = 'partial';
      } else {
        status = 'paid';
      }

      const liabilityData = {
        date: format(values.date, "yyyy-MM-dd"),
        category_id: values.category_id,
        creditor_name: values.creditor_name,
        details: values.details || null,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        amount_remaining: amountRemaining,
        due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
        status,
        is_loan: values.is_loan,
        last_payment_date: amountPaid > 0 ? format(new Date(), "yyyy-MM-dd") : null
      };

      const { data, error } = await supabase
        .from("liability_entries")
        .insert(liabilityData)
        .select()
        .single();

      if (error) throw error;

      // Store payment details in localStorage if it's a loan
      if (values.is_loan && typeof window !== 'undefined' && data?.id) {
        try {
          localStorage.setItem(`liability_data_${data.id}`, JSON.stringify({
            payment_method: values.payment_method || "cash",
            account_id: values.account_id || ""
          }));
        } catch (e) {
          console.error("Error storing liability data in localStorage:", e);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.invalidateQueries({ queryKey: ["liabilityEntriesForPayment"] });
      toast.success("Liability added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add liability: ${error.message}`);
    },
  });

  // Delete liability mutation
  const deleteLiabilityMutation = useMutation({
    mutationFn: async (entry: LiabilityEntry) => {
      const { error } = await supabase
        .from("liability_entries")
        .delete()
        .eq("id", entry.id);

      if (error) throw error;
      return entry.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.invalidateQueries({ queryKey: ["liabilityEntriesForPayment"] });
      
      // Remove from localStorage if exists
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`liability_data_${id}`);
        } catch (e) {
          console.error("Error removing liability data from localStorage:", e);
        }
      }
    },
    onError: (error) => {
      toast.error(`Failed to delete liability: ${error.message}`);
    },
  });

  return {
    createLiability,
    deleteLiabilityMutation
  };
}
