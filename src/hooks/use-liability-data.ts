"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LiabilityEntry } from "@/types/finance";

export type LiabilityFilter = {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  creditor?: string;
};

/**
 * Custom hook for fetching liability data with pagination and filtering
 */
export function useLiabilityData(
  page = 1,
  pageSize = 10,
  filters: LiabilityFilter = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["liabilityEntries", page, pageSize, filters],
    queryFn: async () => {
      // Start building the query
      let query = supabase
        .from("liability_entries")
        .select(
          `
          *
        `,
          { count: "exact" }
        );

      // Apply filters - optimize by combining filters where possible
      // Build search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const searchTerm = `%${search}%`;

        // Use separate or conditions instead of a single string
        query = query.or(
          `details.ilike.${searchTerm}`,
          `creditor_name.ilike.${searchTerm}`,
          `date.ilike.${searchTerm}`
        );

        // Handle amount search separately to avoid the ::text cast issue
        try {
          // If the search term can be parsed as a number, also search by amount
          const searchNumber = parseFloat(search);
          if (!isNaN(searchNumber)) {
            // Create a new query that includes the original conditions plus the amount condition
            query = query.or(`total_amount.eq.${searchNumber}`);
          }
        } catch (e) {
          // If parsing fails, just continue with the text search
        }
      }

      // Apply status filter
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Apply date range filters
      if (filters.startDate) {
        query = query.gte("date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("date", filters.endDate);
      }

      // Apply creditor filter
      if (filters.creditor) {
        query = query.ilike("creditor_name", `%${filters.creditor}%`);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Execute the query with pagination
      const { data, error, count } = await query
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }) // Sort by creation timestamp to show newest entries first
        .range(from, to);

      if (error) {
        console.error("Error fetching liability data:", error);
        // Return empty data instead of throwing error
        return {
          data: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
        };
      }

      // Format the data - use more efficient processing
      const formattedData = (data || []).map((entry) => {
        // Use the computed column if available, otherwise calculate
        const amountRemaining = typeof entry.amount_remaining === 'number'
          ? entry.amount_remaining
          : Math.max(0, (entry.total_amount || 0) - (entry.amount_paid || 0));

        // Use existing status if available
        const status = entry.status || (() => {
          const amountPaid = entry.amount_paid || 0;
          const totalAmount = entry.total_amount || 0;

          if (amountPaid <= 0) return "unpaid";
          if (amountPaid < totalAmount) return "partial";
          return "paid";
        })();

        return {
          ...entry,
          amount_remaining: amountRemaining,
          status,
        };
      }) as LiabilityEntry[];

      return {
        data: formattedData,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - reasonable for financial data
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Keep previous data while fetching new data
    refetchOnWindowFocus: false, // Disable for better performance
    refetchOnMount: true, // Refetch when component mounts
    retry: 2, // Retry failed requests twice
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000) // Exponential backoff
  });
}

/**
 * Custom hook for fetching a single liability entry
 */
export function useLiabilityEntry(id: string | null) {
  return useQuery({
    queryKey: ["liabilityEntry", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("liability_entries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(`Error fetching liability entry ${id}:`, error);
        throw error;
      }

      // Calculate amount remaining
      const amountPaid = data.amount_paid || 0;
      const totalAmount = data.total_amount || 0;
      const amountRemaining = totalAmount - amountPaid;

      // Determine status if not already set
      let status = data.status;
      if (!status) {
        if (amountPaid <= 0) {
          status = "unpaid";
        } else if (amountPaid < totalAmount) {
          status = "partial";
        } else {
          status = "paid";
        }
      }

      return {
        ...data,
        amount_remaining: amountRemaining,
        status,
      } as LiabilityEntry;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - reasonable for financial data
    refetchOnWindowFocus: false, // Disable for better performance
  });
}
