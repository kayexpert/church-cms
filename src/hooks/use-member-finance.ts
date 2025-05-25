"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { IncomeEntry } from "@/types/finance";

/**
 * Hook to fetch income entries for a specific member
 */
export function useMemberFinance(memberId: string) {
  return useQuery({
    queryKey: ["memberFinance", memberId],
    queryFn: async () => {
      try {
        if (!memberId) {
          return {
            data: [],
            count: 0
          };
        }

        const { data, error, count } = await supabase
          .from("income_entries")
          .select(`
            *,
            income_categories(id, name)
          `, { count: "exact" })
          .eq("member_id", memberId)
          .order("date", { ascending: false });

        if (error) {
          console.error("Error fetching member finance data:", error);
          throw new Error(error.message);
        }

        return {
          data: data || [],
          count: count || 0
        };
      } catch (error) {
        console.error("Error in useMemberFinance:", error);
        toast.error("Failed to load member finance data");
        return {
          data: [],
          count: 0
        };
      }
    },
    enabled: !!memberId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to delete an income entry and update related queries
 */
export function useMemberFinanceMutations() {
  const queryClient = useQueryClient();

  const deleteMemberIncomeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      // Import the deleteFinancialEntry function dynamically to avoid circular dependencies
      const { deleteFinancialEntry } = await import("@/lib/delete-financial-entry");

      // Use the centralized function to delete the income entry and handle account transactions
      const success = await deleteFinancialEntry("income_entries", entryId, queryClient);

      if (!success) {
        throw new Error("Failed to delete income entry");
      }

      return entryId;
    },
    onSuccess: (_, entryId) => {
      toast.success("Income entry deleted successfully");
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["memberFinance"] });
      queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      
      // Force immediate refetch to update UI
      queryClient.refetchQueries({ queryKey: ["memberFinance"] });
      queryClient.refetchQueries({ queryKey: ["incomeEntries"] });
      queryClient.refetchQueries({ queryKey: ["accounts"] });
    },
    onError: (error) => {
      console.error("Error deleting income entry:", error);
      toast.error("Failed to delete income entry");
    }
  });

  return {
    deleteMemberIncomeEntry
  };
}
