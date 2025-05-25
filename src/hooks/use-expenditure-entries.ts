"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExpenditureEntries } from "@/services/finance-service";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ExpenditureEntry } from "@/types/finance";

/**
 * Hook for fetching expenditure entries with pagination and filtering
 */
export function useExpenditureEntries(options: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  refreshTrigger?: number;
} = {}) {
  const { refreshTrigger, ...queryOptions } = options;

  return useQuery({
    queryKey: ['expenditureEntries', queryOptions, refreshTrigger],
    queryFn: async () => {
      try {
        // Directly proceed with the query
        const result = await getExpenditureEntries(queryOptions);

        // Basic error checking
        if (result.error) {
          console.error('Error fetching expenditure entries:', result.error);
          throw result.error;
        }

        if (!result.data) {
          console.error('No data returned from expenditure entries query');
          throw new Error('No data returned from expenditure entries query');
        }

        return result;
      } catch (error) {
        console.error('Error in expenditure entries query function:', error);
        throw error;
      }
    },
    select: (response) => {
      if (response && response.data) {
        return response.data;
      }
      return { data: [], count: 0 };
    },
    keepPreviousData: true, // Keep previous data while fetching new data
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3, // Retry failed queries three times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 15000), // Exponential backoff with longer max delay
  });
}

/**
 * Hook for expenditure entry mutations (add, update, delete)
 */
export function useExpenditureEntryMutations() {
  const queryClient = useQueryClient();

  const addExpenditureEntry = useMutation({
    mutationFn: async (newEntry: Omit<ExpenditureEntry, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('expenditure_entries')
        .insert(newEntry)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Expenditure entry added successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['expenditureEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialData'] });
    },
    onError: (error) => {
      console.error('Error adding expenditure entry:', error);
      toast.error('Failed to add expenditure entry');
    }
  });

  const updateExpenditureEntry = useMutation({
    mutationFn: async ({ id, entry }: { id: string; entry: Partial<Omit<ExpenditureEntry, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .from('expenditure_entries')
        .update(entry)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Expenditure entry updated successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['expenditureEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialData'] });
    },
    onError: (error) => {
      console.error('Error updating expenditure entry:', error);
      toast.error('Failed to update expenditure entry');
    }
  });

  const deleteExpenditureEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenditure_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success('Expenditure entry deleted successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['expenditureEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialData'] });
    },
    onError: (error) => {
      console.error('Error deleting expenditure entry:', error);
      toast.error('Failed to delete expenditure entry');
    }
  });

  return {
    addExpenditureEntry,
    updateExpenditureEntry,
    deleteExpenditureEntry
  };
}
