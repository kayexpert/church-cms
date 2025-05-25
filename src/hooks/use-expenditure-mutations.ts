"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ExpenditureEntry } from "@/types/finance";
import { toast } from "sonner";

/**
 * Custom hook for expenditure mutations (add, update, delete)
 */
export function useExpenditureMutations() {
  const queryClient = useQueryClient();

  // Add expenditure mutation
  const addExpenditureMutation = useMutation({
    mutationFn: async (newEntry: Omit<ExpenditureEntry, "id">) => {
      const { data, error } = await supabase
        .from("expenditure_entries")
        .insert(newEntry)
        .select()
        .single();

      if (error) {
        console.error("Error adding expenditure entry:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all expenditure queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      // Also invalidate liability queries if this might be a liability payment
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });

      // Force immediate refetch of accounts to refresh account balances
      queryClient.invalidateQueries({
        queryKey: ["accounts"],
        refetchType: 'all'
      });

      // Also invalidate account transactions
      queryClient.invalidateQueries({
        queryKey: ["accountTransactions"],
        refetchType: 'all'
      });

      toast.success("Expenditure added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add expenditure: ${error.message}`);
    },
  });

  // Update expenditure mutation
  const updateExpenditureMutation = useMutation({
    mutationFn: async (entry: ExpenditureEntry) => {
      const { id, ...updateData } = entry;

      const { data, error } = await supabase
        .from("expenditure_entries")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating expenditure entry:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all expenditure queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      // Also invalidate liability queries if this might be a liability payment
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });

      // Force immediate refetch of accounts to refresh account balances
      queryClient.invalidateQueries({
        queryKey: ["accounts"],
        refetchType: 'all'
      });

      // Also invalidate account transactions
      queryClient.invalidateQueries({
        queryKey: ["accountTransactions"],
        refetchType: 'all'
      });

      toast.success("Expenditure updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update expenditure: ${error.message}`);
    },
  });

  // Delete expenditure mutation
  const deleteExpenditureMutation = useMutation({
    mutationFn: async (entry: ExpenditureEntry) => {
      console.log("Starting expenditure deletion process for:", entry);

      // If this is a liability payment, we need to update the liability first
      if (entry.liability_payment && entry.liability_id) {
        console.log("This is a liability payment, updating the liability...");

        try {
          // Get the current liability
          const { data: liabilityData, error: liabilityError } = await supabase
            .from("liability_entries")
            .select("*")
            .eq("id", entry.liability_id)
            .single();

          if (liabilityError) {
            console.error("Error fetching liability data:", liabilityError);
            // Don't throw the error, just log it and continue
            console.warn("Continuing with deletion despite liability fetch error");
          } else if (liabilityData) {
            console.log("Found liability data:", liabilityData);

            // Calculate new amount paid
            const newAmountPaid = Math.max(0, liabilityData.amount_paid - entry.amount);
            const newStatus = newAmountPaid === 0 ? "unpaid" :
                             newAmountPaid < liabilityData.total_amount ? "partial" : "paid";

            console.log("Updating liability with new values:", {
              amount_paid: newAmountPaid,
              amount_remaining: liabilityData.total_amount - newAmountPaid,
              status: newStatus
            });

            // Update the liability
            const { error: updateError } = await supabase
              .from("liability_entries")
              .update({
                amount_paid: newAmountPaid,
                amount_remaining: liabilityData.total_amount - newAmountPaid,
                status: newStatus
              })
              .eq("id", entry.liability_id);

            if (updateError) {
              console.error("Error updating liability:", updateError);
              // Don't throw the error, just log it and continue
              console.warn("Continuing with deletion despite liability update error");
            } else {
              console.log("Liability updated successfully");
            }
          } else {
            console.warn("No liability data found for ID:", entry.liability_id);
          }
        } catch (error) {
          console.error("Error fetching or updating liability:", error);
          // Don't throw the error, just log it and continue
          console.warn("Continuing with deletion despite liability error");
        }
      }

      // Now delete the expenditure entry using the deleteFinancialEntry function
      console.log("Deleting the expenditure entry using deleteFinancialEntry...");

      // Import the deleteFinancialEntry function dynamically to avoid circular dependencies
      const { deleteFinancialEntry } = await import("@/lib/delete-financial-entry");

      // Use the centralized function to delete the expenditure entry
      // This will also update any linked budget items
      const success = await deleteFinancialEntry("expenditure_entries", entry.id, queryClient);

      if (!success) {
        throw new Error("Failed to delete expenditure entry");
      }

      console.log("Expenditure entry deleted successfully");
      return entry;
    },
    onSuccess: () => {
      // Invalidate all relevant queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.invalidateQueries({ queryKey: ["financialData"] });

      // Force immediate refetch of accounts to refresh account balances
      queryClient.invalidateQueries({
        queryKey: ["accounts"],
        refetchType: 'all'
      });

      // Also invalidate account transactions
      queryClient.invalidateQueries({
        queryKey: ["accountTransactions"],
        refetchType: 'all'
      });

      // Also invalidate budget-related queries
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      // Force refetch to update UI immediately
      queryClient.refetchQueries({ queryKey: ["expenditureEntries"] });
      queryClient.refetchQueries({ queryKey: ["liabilityEntries"] });
      queryClient.refetchQueries({ queryKey: ["accountTransactions"] });
      queryClient.refetchQueries({ queryKey: ["accounts"] });
      queryClient.refetchQueries({ queryKey: ["budgetItems"] });
      queryClient.refetchQueries({ queryKey: ["budgets"] });

      // Toast is already shown in deleteFinancialEntry, but we'll add a fallback
      // in case it wasn't shown there
      toast.success("Expenditure deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete expenditure: ${error.message}`);
    },
  });

  return {
    addExpenditureMutation,
    updateExpenditureMutation,
    deleteExpenditureMutation,
  };
}
