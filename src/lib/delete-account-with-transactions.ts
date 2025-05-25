import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { recalculateAccountBalance } from "@/lib/account-balance";

/**
 * Deletes an account and all its associated transactions
 * This includes:
 * - Income entries
 * - Expenditure entries
 * - Account transfers (as source or destination)
 * - Account transactions
 *
 * @param accountId The ID of the account to delete
 * @returns A promise that resolves to true if the deletion was successful, false otherwise
 */
export async function deleteAccountWithTransactions(accountId: string): Promise<{success: boolean, error?: any}> {
  try {
    // Start a transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) {
      console.error("Error starting transaction:", transactionError);
      return { success: false, error: transactionError };
    }

    try {
      // 1. Get all income entries for this account
      const { data: incomeEntries, error: incomeError } = await supabase
        .from("income_entries")
        .select("id, amount, account_id")
        .eq("account_id", accountId);

      if (incomeError) {
        throw incomeError;
      }

      // 2. Get all expenditure entries for this account
      const { data: expenditureEntries, error: expenditureError } = await supabase
        .from("expenditure_entries")
        .select("id, amount, account_id, liability_id")
        .eq("account_id", accountId);

      if (expenditureError) {
        throw expenditureError;
      }

      // 3. Get all transfers where this account is the source
      const { data: sourceTransfers, error: sourceTransfersError } = await supabase
        .from("account_transfers")
        .select("id, amount, source_account_id, destination_account_id")
        .eq("source_account_id", accountId);

      if (sourceTransfersError) {
        throw sourceTransfersError;
      }

      // 4. Get all transfers where this account is the destination
      const { data: destTransfers, error: destTransfersError } = await supabase
        .from("account_transfers")
        .select("id, amount, source_account_id, destination_account_id")
        .eq("destination_account_id", accountId);

      if (destTransfersError) {
        throw destTransfersError;
      }

      // Check for any other tables that might reference this account
      // This is a safety check to identify potential foreign key constraints
      console.log("Checking for other references to this account...");

      // Check if account is referenced in any other tables we might have missed
      const tables = [
        "budget_allocations",
        "reconciliation_entries",
        "financial_reports"
      ];

      for (const table of tables) {
        try {
          // Check if the table exists and has an account_id column
          const { data, error } = await supabase
            .from(table)
            .select("id")
            .eq("account_id", accountId)
            .limit(1);

          if (!error && data && data.length > 0) {
            console.warn(`Found references to account in ${table} table. These need to be deleted first.`);
            // Delete these references
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq("account_id", accountId);

            if (deleteError) {
              console.error(`Error deleting references in ${table}:`, deleteError);
            } else {
              console.log(`Successfully deleted references in ${table}`);
            }
          }
        } catch (e) {
          // Table might not exist, which is fine
          console.log(`Table ${table} might not exist or doesn't have account_id column`);
        }
      }

      // 5. Delete all account transactions for this account
      const { error: deleteTransactionsError } = await supabase
        .from("account_transactions")
        .delete()
        .eq("account_id", accountId);

      if (deleteTransactionsError) {
        throw deleteTransactionsError;
      }

      // 6. Delete all income entries for this account
      if (incomeEntries && incomeEntries.length > 0) {
        const { error: deleteIncomeError } = await supabase
          .from("income_entries")
          .delete()
          .eq("account_id", accountId);

        if (deleteIncomeError) {
          throw deleteIncomeError;
        }
      }

      // 7. Delete all expenditure entries for this account
      if (expenditureEntries && expenditureEntries.length > 0) {
        const { error: deleteExpenditureError } = await supabase
          .from("expenditure_entries")
          .delete()
          .eq("account_id", accountId);

        if (deleteExpenditureError) {
          throw deleteExpenditureError;
        }

        // Update liability entries if any expenditure was a liability payment
        const liabilityPayments = expenditureEntries.filter(entry => entry.liability_id);

        for (const payment of liabilityPayments) {
          if (payment.liability_id) {
            // Get the current liability
            const { data: liability, error: liabilityError } = await supabase
              .from("liability_entries")
              .select("amount_paid, amount_remaining, total_amount, status")
              .eq("id", payment.liability_id)
              .single();

            if (liabilityError) {
              console.error(`Error fetching liability ${payment.liability_id}:`, liabilityError);
              continue;
            }

            // Adjust the liability amount_paid and amount_remaining
            const amountPaid = parseFloat(liability.amount_paid) - payment.amount;
            const amountRemaining = parseFloat(liability.total_amount) - amountPaid;

            // Determine the new status
            let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
            if (amountPaid <= 0) {
              status = 'unpaid';
            } else if (amountPaid < parseFloat(liability.total_amount)) {
              status = 'partial';
            } else {
              status = 'paid';
            }

            // Update the liability
            const { error: updateLiabilityError } = await supabase
              .from("liability_entries")
              .update({
                amount_paid: amountPaid.toString(),
                amount_remaining: amountRemaining.toString(),
                status
              })
              .eq("id", payment.liability_id);

            if (updateLiabilityError) {
              console.error(`Error updating liability ${payment.liability_id}:`, updateLiabilityError);
            }
          }
        }
      }

      // 8. Handle transfers
      // For source transfers, we need to update the destination account balance
      for (const transfer of sourceTransfers || []) {
        // Delete the transfer
        const { error: deleteTransferError } = await supabase
          .from("account_transfers")
          .delete()
          .eq("id", transfer.id);

        if (deleteTransferError) {
          throw deleteTransferError;
        }

        // Recalculate the destination account balance
        if (transfer.destination_account_id !== accountId) {
          await recalculateAccountBalance(transfer.destination_account_id);
        }
      }

      // For destination transfers, we need to update the source account balance
      for (const transfer of destTransfers || []) {
        // Delete the transfer
        const { error: deleteTransferError } = await supabase
          .from("account_transfers")
          .delete()
          .eq("id", transfer.id);

        if (deleteTransferError) {
          throw deleteTransferError;
        }

        // Recalculate the source account balance
        if (transfer.source_account_id !== accountId) {
          await recalculateAccountBalance(transfer.source_account_id);
        }
      }

      // 9. Finally, delete the account itself
      const { error: deleteAccountError } = await supabase
        .from("accounts")
        .delete()
        .eq("id", accountId);

      if (deleteAccountError) {
        console.error("Error deleting account via standard method:", deleteAccountError);

        // Try using the SQL function directly as a fallback
        console.log("Attempting to delete account using SQL function directly...");
        const { data: sqlFunctionResult, error: sqlFunctionError } = await supabase
          .rpc("delete_account_with_transactions", { account_id: accountId });

        if (sqlFunctionError) {
          console.error("Error deleting account via SQL function:", sqlFunctionError);
          throw sqlFunctionError || deleteAccountError;
        }

        console.log("SQL function result:", sqlFunctionResult);
        if (!sqlFunctionResult) {
          throw deleteAccountError;
        }

        // If we got here, the SQL function succeeded
        return { success: true };
      }

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        throw commitError;
      }

      return { success: true };
    } catch (error) {
      // Rollback the transaction
      const { error: rollbackError } = await supabase.rpc('rollback_transaction');
      if (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }

      // Return the error instead of throwing it
      console.error("Error during account deletion transaction:", error);
      return { success: false, error };
    }
  } catch (error) {
    console.error("Error in deleteAccountWithTransactions:", error);
    return { success: false, error };
  }
}
