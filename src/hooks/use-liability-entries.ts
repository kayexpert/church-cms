"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLiabilityEntries } from "@/services/finance-service";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LiabilityEntry } from "@/types/finance";

/**
 * Hook for fetching liability entries with pagination and filtering
 */
export function useLiabilityEntries(options: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  refreshTrigger?: number;
} = {}) {
  const { refreshTrigger, ...queryOptions } = options;

  return useQuery({
    queryKey: ['liabilityEntries', queryOptions, refreshTrigger],
    queryFn: async () => {
      try {
        // Directly proceed with the query
        const result = await getLiabilityEntries(queryOptions);

        // Basic error checking
        if (result.error) {
          console.error('Error fetching liability entries:', result.error);
          throw result.error;
        }

        if (!result.data) {
          console.error('No data returned from liability entries query');
          throw new Error('No data returned from liability entries query');
        }

        return result;
      } catch (error) {
        console.error('Error in liability entries query function:', error);
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
 * Hook for liability entry mutations (add, update, delete)
 */
export function useLiabilityEntryMutations() {
  const queryClient = useQueryClient();

  const addLiabilityEntry = useMutation({
    mutationFn: async (newEntry: Omit<LiabilityEntry, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('liability_entries')
        .insert(newEntry)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Liability entry added successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['liabilityEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialData'] });
    },
    onError: (error) => {
      console.error('Error adding liability entry:', error);
      toast.error('Failed to add liability entry');
    }
  });

  const updateLiabilityEntry = useMutation({
    mutationFn: async ({ id, entry }: { id: string; entry: Partial<Omit<LiabilityEntry, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .from('liability_entries')
        .update(entry)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Liability entry updated successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['liabilityEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialData'] });
    },
    onError: (error) => {
      console.error('Error updating liability entry:', error);
      toast.error('Failed to update liability entry');
    }
  });

  const deleteLiabilityEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('liability_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success('Liability entry deleted successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['liabilityEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialData'] });
    },
    onError: (error) => {
      console.error('Error deleting liability entry:', error);
      toast.error('Failed to delete liability entry');
    }
  });

  const makeLiabilityPayment = useMutation({
    mutationFn: async ({
      liabilityId,
      paymentAmount,
      paymentDate,
      accountId,
      description
    }: {
      liabilityId: string;
      paymentAmount: number;
      paymentDate: string;
      accountId: string;
      description?: string;
    }) => {
      // Start a transaction
      const { data: liability, error: fetchError } = await supabase
        .from('liability_entries')
        .select('*')
        .eq('id', liabilityId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new amount paid and remaining
      const newAmountPaid = Number(liability.amount_paid || 0) + paymentAmount;
      const newAmountRemaining = Number(liability.total_amount) - newAmountPaid;

      // Determine new status
      let newStatus = liability.status;
      if (newAmountRemaining <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      // Update liability entry
      const { error: updateError } = await supabase
        .from('liability_entries')
        .update({
          amount_paid: newAmountPaid,
          amount_remaining: newAmountRemaining,
          status: newStatus,
          last_payment_date: paymentDate
        })
        .eq('id', liabilityId);

      if (updateError) throw updateError;

      // Create expenditure entry for the payment
      const { error: expenditureError } = await supabase
        .from('expenditure_entries')
        .insert({
          amount: paymentAmount,
          date: paymentDate,
          description: description || `Payment for liability: ${liability.creditor_name}`,
          account_id: accountId,
          liability_payment: true,
          liability_id: liabilityId
        });

      if (expenditureError) throw expenditureError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['liabilityEntries'] });
      queryClient.invalidateQueries({ queryKey: ['expenditureEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialData'] });
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  });

  return {
    addLiabilityEntry,
    updateLiabilityEntry,
    deleteLiabilityEntry,
    makeLiabilityPayment
  };
}
