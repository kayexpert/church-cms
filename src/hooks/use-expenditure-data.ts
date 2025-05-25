"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ExpenditureEntry } from "@/types/finance";
import { useExpenditureCategories as useExpenditureCategoriesFromManagement } from "@/hooks/use-expenditure-management";

export type ExpenditureFilter = {
  search?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  liabilityPayment?: boolean;
};

/**
 * Custom hook for fetching expenditure data with pagination and filtering
 */
export function useExpenditureData(
  page = 1,
  pageSize = 10,
  filters: ExpenditureFilter = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["expenditureEntries", page, pageSize, filters],
    queryFn: async () => {
      // Start building the query
      let query = supabase
        .from("expenditure_entries")
        .select(
          `
          *,
          expenditure_categories(id, name),
          account:account_id(id, name)
        `,
          { count: "exact" }
        );

      // Apply filters
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const searchTerm = `%${search}%`;

        // Use separate or conditions instead of a single string
        query = query.or(
          `description.ilike.${searchTerm}`,
          `recipient.ilike.${searchTerm}`
        );

        // Handle amount search separately to avoid the ::text cast issue
        try {
          // If the search term can be parsed as a number, also search by amount
          const searchNumber = parseFloat(search);
          if (!isNaN(searchNumber)) {
            // Create a new query that includes the original conditions plus the amount condition
            query = query.or(`amount.eq.${searchNumber}`);
          }
        } catch (e) {
          // If parsing fails, just continue with the text search
        }
      }

      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.startDate) {
        query = query.gte("date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("date", filters.endDate);
      }

      if (filters.paymentMethod) {
        query = query.eq("payment_method", filters.paymentMethod);
      }

      if (filters.liabilityPayment !== undefined) {
        query = query.eq("liability_payment", filters.liabilityPayment);
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
        console.error("Error fetching expenditure data:", error);
        // Return empty data instead of throwing error
        return {
          data: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
        };
      }

      // Format the data
      const formattedData = (data || []).map((entry) => ({
        ...entry,
        category: entry.expenditure_categories,
        // Ensure account information is properly passed through
        account: entry.account,
      })) as ExpenditureEntry[];

      return {
        data: formattedData,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Keep previous data while fetching new data
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
    retry: 2, // Retry failed requests twice
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000) // Exponential backoff
  });
}

/**
 * Custom hook for fetching expenditure categories
 * @param includeSystemCategories Whether to include system categories in the returned data
 * @returns Both all categories and user-visible categories (filtered)
 */
export function useExpenditureCategories(includeSystemCategories = true) {
  return useExpenditureCategoriesFromManagement(includeSystemCategories);
}

/**
 * Custom hook for fetching a single expenditure entry
 */
export function useExpenditureEntry(id: string | null) {
  return useQuery({
    queryKey: ["expenditureEntry", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("expenditure_entries")
        .select(
          `
          *,
          expenditure_categories(id, name),
          account:account_id(id, name)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error(`Error fetching expenditure entry ${id}:`, error);
        throw error;
      }

      return {
        ...data,
        category: data.expenditure_categories,
        // Ensure account information is properly passed through
        account: data.account,
      } as ExpenditureEntry;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
