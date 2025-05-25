"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LiabilityEntry, ExpenditureEntry } from "@/types/finance";
import { toast } from "sonner";
import { syncLiabilityWithIncome } from "./use-liability-income-sync";

/**
 * Custom hook for liability mutations (add, update, delete, make payment)
 */
export function useLiabilityMutations() {
  const queryClient = useQueryClient();

  // Add liability mutation
  const addLiabilityMutation = useMutation({
    mutationFn: async (newEntry: Omit<LiabilityEntry, "id">) => {
      const { data, error } = await supabase
        .from("liability_entries")
        .insert(newEntry)
        .select()
        .single();

      if (error) {
        console.error("Error adding liability entry:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all liability queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      toast.success("Liability added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add liability: ${error.message}`);
    },
  });

  // Update liability mutation
  const updateLiabilityMutation = useMutation({
    mutationFn: async (entry: LiabilityEntry) => {
      const { id, ...updateData } = entry;

      const { data, error } = await supabase
        .from("liability_entries")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating liability entry:", error);
        throw error;
      }

      return data;
    },
    onSuccess: async (updatedLiability) => {
      // Invalidate all liability queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });

      // If this is a loan, sync with income entries
      if (updatedLiability && updatedLiability.is_loan) {
        try {
          console.log("Liability is a loan, syncing with income entries:", {
            liabilityId: updatedLiability.id,
            creditorName: updatedLiability.creditor_name,
            amount: updatedLiability.total_amount,
            date: updatedLiability.date
          });

          // Also invalidate income entries since we might update them
          queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });

          // Sync the liability with income entries
          await syncLiabilityWithIncome(updatedLiability);

          console.log("Successfully synced liability with income entries");
        } catch (error) {
          console.error("Error syncing liability with income:", error);

          // Log more detailed error information
          if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
          } else {
            console.error("Unknown error type:", typeof error);
            console.error("Error details:", JSON.stringify(error, null, 2));
          }

          // Don't fail the whole operation if sync fails
          toast.error("Note: Failed to update related income entry. Check console for details.");
        }
      } else {
        console.log("Liability is not a loan, skipping income entry sync");
      }

      toast.success("Liability updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update liability: ${error.message}`);
    },
  });

  // Delete liability mutation
  const deleteLiabilityMutation = useMutation({
    mutationFn: async (entry: LiabilityEntry) => {
      console.log("Starting liability deletion process for:", entry);

      // First check if there are any expenditure entries linked to this liability
      const { data: linkedExpenditures, error: checkError } = await supabase
        .from("expenditure_entries")
        .select("id")
        .eq("liability_id", entry.id);

      if (checkError) {
        console.error("Error checking linked expenditures:", checkError);
        throw checkError;
      }

      console.log(`Found ${linkedExpenditures?.length || 0} linked expenditures`);

      // If there are linked expenditures, we need to delete them first
      if (linkedExpenditures && linkedExpenditures.length > 0) {
        console.log("Deleting linked expenditures...");
        const { error: deleteLinkedError } = await supabase
          .from("expenditure_entries")
          .delete()
          .eq("liability_id", entry.id);

        if (deleteLinkedError) {
          console.error("Error deleting linked expenditures:", deleteLinkedError);
          throw deleteLinkedError;
        }
        console.log("Linked expenditures deleted successfully");
      }

      // If this is a loan, we need to find and delete the related income entry
      if (entry.is_loan) {
        console.log("This is a loan, checking for linked income entries...");

        // Try multiple approaches to find all related income entries
        let linkedIncomeEntries: { id: string }[] = [];

        // 1. First try to find by payment_details.liability_id
        const { data: entriesByPaymentDetails, error: paymentDetailsError } = await supabase
          .from("income_entries")
          .select("id")
          .filter("payment_details->liability_id", "eq", entry.id);

        if (!paymentDetailsError && entriesByPaymentDetails && entriesByPaymentDetails.length > 0) {
          console.log(`Found ${entriesByPaymentDetails.length} income entries by payment_details`);
          linkedIncomeEntries = [...linkedIncomeEntries, ...entriesByPaymentDetails];
        }

        // 2. Try by description with liability ID
        const { data: entriesByLiabilityId, error: liabilityIdError } = await supabase
          .from("income_entries")
          .select("id")
          .ilike("description", `%Liability ID: ${entry.id}%`);

        if (!liabilityIdError && entriesByLiabilityId && entriesByLiabilityId.length > 0) {
          console.log(`Found ${entriesByLiabilityId.length} income entries by liability ID in description`);
          // Filter out any duplicates
          const newIds = entriesByLiabilityId.filter(item =>
            !linkedIncomeEntries.some(existing => existing.id === item.id)
          );
          linkedIncomeEntries = [...linkedIncomeEntries, ...newIds];
        }

        // 3. Try by creditor name
        const { data: entriesByCreditorName, error: creditorNameError } = await supabase
          .from("income_entries")
          .select("id")
          .ilike("description", `%Loan from ${entry.creditor_name}%`);

        if (!creditorNameError && entriesByCreditorName && entriesByCreditorName.length > 0) {
          console.log(`Found ${entriesByCreditorName.length} income entries by creditor name`);
          // Filter out any duplicates
          const newIds = entriesByCreditorName.filter(item =>
            !linkedIncomeEntries.some(existing => existing.id === item.id)
          );
          linkedIncomeEntries = [...linkedIncomeEntries, ...newIds];
        }

        console.log(`Found a total of ${linkedIncomeEntries.length} linked income entries`);

        // If there are linked income entries, delete them
        if (linkedIncomeEntries.length > 0) {
          console.log("Deleting linked income entries...");
          const { error: deleteIncomeError } = await supabase
            .from("income_entries")
            .delete()
            .in("id", linkedIncomeEntries.map(item => item.id));

          if (deleteIncomeError) {
            console.error("Error deleting linked income entries:", deleteIncomeError);
            throw deleteIncomeError;
          }
          console.log("Linked income entries deleted successfully");
        }
      }

      // Now delete the liability entry using the centralized function
      console.log("Deleting the liability entry itself...");

      // Import the deleteFinancialEntry function dynamically to avoid circular dependencies
      const { deleteFinancialEntry } = await import("@/lib/delete-financial-entry");

      // Use the centralized function to delete the liability entry
      const success = await deleteFinancialEntry("liability_entries", entry.id);

      if (!success) {
        throw new Error("Failed to delete liability entry");
      }

      console.log("Liability entry deleted successfully");
      return entry;
    },
    onSuccess: () => {
      // Invalidate all liability queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });

      // Also invalidate expenditure queries since we might have deleted linked expenditures
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      // Also invalidate income queries since we might have deleted linked income entries
      queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });

      toast.success("Liability deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete liability: ${error.message}`);
    },
  });

  // Make payment mutation
  const makePaymentMutation = useMutation({
    mutationFn: async ({
      liability,
      paymentAmount,
      paymentDate,
      paymentMethod,
      accountId,
      description
    }: {
      liability: LiabilityEntry;
      paymentAmount: number;
      paymentDate: string;
      paymentMethod: string;
      accountId?: string;
      description?: string;
    }) => {
      // Create a transaction to ensure both operations succeed or fail together
      const { data: newLiabilityData, error: liabilityError } = await supabase.rpc(
        'make_liability_payment',
        {
          p_liability_id: liability.id,
          p_payment_amount: paymentAmount,
          p_payment_date: paymentDate,
          p_payment_method: paymentMethod,
          p_account_id: accountId || null,
          p_description: description || `Payment for ${liability.creditor_name}`
        }
      );

      if (liabilityError) {
        // If the RPC function doesn't exist, fall back to manual transaction
        // First, update the liability
        const newAmountPaid = (liability.amount_paid || 0) + paymentAmount;
        const newStatus = newAmountPaid >= liability.total_amount ? "paid" : "partial";

        const { data: updatedLiability, error: updateError } = await supabase
          .from("liability_entries")
          .update({
            amount_paid: newAmountPaid,
            amount_remaining: liability.total_amount - newAmountPaid,
            status: newStatus,
            last_payment_date: paymentDate
          })
          .eq("id", liability.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Get the standard "Liability Payment" category
        const { data: liabilityCategory, error: categoryError } = await supabase
          .from("expenditure_categories")
          .select("id")
          .eq("name", "Liability Payment")
          .maybeSingle();

        let categoryId;

        if (!categoryError && liabilityCategory?.id) {
          // Use the standard Liability Payment category
          categoryId = liabilityCategory.id;
          console.log(`Using standard Liability Payment category: ${liabilityCategory.id}`);
        } else {
          // If standard category doesn't exist, create it
          console.log('Creating standard Liability Payment category');
          const { data: newCategory, error: createError } = await supabase
            .from("expenditure_categories")
            .insert({
              name: "Liability Payment",
              description: "System category for liability payments",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating Liability Payment category:', createError);

            // Fall back to any expenditure category as a last resort
            const { data: fallbackCategories, error: fallbackError } = await supabase
              .from("expenditure_categories")
              .select("id")
              .limit(1);

            if (fallbackError || !fallbackCategories || fallbackCategories.length === 0) {
              throw new Error('Could not find or create a category for the expenditure entry');
            }

            categoryId = fallbackCategories[0].id;
            console.log(`Using fallback category: ${fallbackCategories[0].id}`);
          } else {
            // Use the newly created Liability Payment category
            categoryId = newCategory.id;
            console.log(`Created and using Liability Payment category: ${newCategory.id}`);
          }
        }

        // Then create an expenditure entry for the payment
        const expenditureEntry: Omit<ExpenditureEntry, "id"> = {
          date: paymentDate,
          amount: paymentAmount,
          description: description || `Payment for ${liability.creditor_name}`,
          category_id: categoryId, // Use the standard Liability Payment category
          payment_method: paymentMethod,
          account_id: accountId,
          recipient: liability.creditor_name,
          liability_payment: true,
          liability_id: liability.id
        };

        const { data: newExpenditure, error: expenditureError } = await supabase
          .from("expenditure_entries")
          .insert(expenditureEntry)
          .select()
          .single();

        if (expenditureError) {
          throw expenditureError;
        }

        return { liability: updatedLiability, expenditure: newExpenditure };
      }

      return newLiabilityData;
    },
    onSuccess: async (updatedLiability) => {
      // Invalidate all liability queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });

      // Also invalidate expenditure queries since we created a new expenditure
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      // If this is a loan, sync with income entries
      if (updatedLiability && updatedLiability.is_loan) {
        try {
          // Also invalidate income entries since we might update them
          queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });

          // Sync the liability with income entries
          await syncLiabilityWithIncome(updatedLiability);
        } catch (error) {
          console.error("Error syncing liability with income after payment:", error);
          // Don't fail the whole operation if sync fails
          toast.error("Note: Failed to update related income entry");
        }
      }

      toast.success("Payment made successfully");
    },
    onError: (error) => {
      toast.error(`Failed to make payment: ${error.message}`);
    },
  });

  return {
    addLiabilityMutation,
    updateLiabilityMutation,
    deleteLiabilityMutation,
    makePaymentMutation,
  };
}
