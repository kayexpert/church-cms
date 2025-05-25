"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { invalidateAccountQueries } from "@/lib/account-sync-utils";

// Define the transfer form schema
export const transferFormSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  source_account_id: z.string({
    required_error: "Source account is required",
  }),
  destination_account_id: z.string({
    required_error: "Destination account is required",
  }),
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)), "Amount must be a number")
    .refine(val => parseFloat(val) > 0, "Amount must be greater than zero"),
  description: z.string().optional(),
}).refine(data => data.source_account_id !== data.destination_account_id, {
  message: "Source and destination accounts must be different",
  path: ["destination_account_id"],
});

export type TransferFormValues = z.infer<typeof transferFormSchema>;

// Define the edit transfer schema with an ID field
export const editTransferFormSchema = z.object({
  id: z.string().uuid(),
  date: z.date({
    required_error: "Date is required",
  }),
  source_account_id: z.string({
    required_error: "Source account is required",
  }),
  destination_account_id: z.string({
    required_error: "Destination account is required",
  }),
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)), "Amount must be a number")
    .refine(val => parseFloat(val) > 0, "Amount must be greater than zero"),
  description: z.string().optional(),
}).refine(data => data.source_account_id !== data.destination_account_id, {
  message: "Source and destination accounts must be different",
  path: ["destination_account_id"],
});

export type EditTransferFormValues = z.infer<typeof editTransferFormSchema>;

/**
 * Custom hook for account transfer mutations
 */
export function useAccountTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: TransferFormValues) => {
      try {
        // Get accounts data from the cache
        const accounts = queryClient.getQueryData<any[]>(["accounts"]);

        // Find source account
        const sourceAccount = accounts?.find(a => a.id === values.source_account_id);
        if (!sourceAccount) {
          throw new Error("Source account not found");
        }

        const transferAmount = parseFloat(values.amount);
        const sourceBalance = sourceAccount.calculatedBalance !== undefined
          ? sourceAccount.calculatedBalance
          : (sourceAccount.balance || 0);

        // Check if source account has sufficient balance
        if (sourceBalance < transferAmount) {
          throw new Error("Insufficient balance in source account");
        }

        // Create the transfer record
        const { data: transferData, error: transferError } = await supabase
          .from("account_transfers")
          .insert({
            date: format(values.date, "yyyy-MM-dd"),
            source_account_id: values.source_account_id,
            destination_account_id: values.destination_account_id,
            amount: transferAmount,
            description: values.description || "Account transfer",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select("id")
          .single();

        if (transferError) throw transferError;

        return transferData;
      } catch (error) {
        console.error("Error creating transfer:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Transfer completed successfully");

      // Use the centralized function to invalidate all relevant queries
      invalidateAccountQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["accountTransfers"] });
    },
    onError: (error) => {
      toast.error(`Transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    },
  });
}

/**
 * Custom hook for editing account transfers
 */
export function useEditAccountTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: EditTransferFormValues) => {
      try {
        // Format the date for the API
        const formattedDate = format(values.date, "yyyy-MM-dd");
        const transferAmount = parseFloat(values.amount);

        // Call the API to update the transfer
        const response = await fetch('/api/finance/account-transfer', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transfer_id: values.id,
            source_account_id: values.source_account_id,
            destination_account_id: values.destination_account_id,
            amount: transferAmount,
            date: formattedDate,
            description: values.description || "Account transfer",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update transfer');
        }

        return await response.json();
      } catch (error) {
        console.error("Error updating transfer:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Transfer updated successfully");

      // Use the centralized function to invalidate all relevant queries
      invalidateAccountQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["accountTransfers"] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    },
  });
}

/**
 * Custom hook for deleting account transfers
 */
export function useDeleteAccountTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      try {
        // Call the API to delete the transfer
        const response = await fetch('/api/finance/account-transfer', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transfer_id: transferId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete transfer');
        }

        return await response.json();
      } catch (error) {
        console.error("Error deleting transfer:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Transfer deleted successfully");

      // Use the centralized function to invalidate all relevant queries
      invalidateAccountQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["accountTransfers"] });
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    },
  });
}
