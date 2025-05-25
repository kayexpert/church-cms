import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { syncAccountBalance } from "@/lib/account-sync-utils";
import { QueryClient } from "@tanstack/react-query";

/**
 * Deletes all reconciliation adjustment entries related to a specific reconciliation
 *
 * @param reconciliationId The ID of the reconciliation
 * @param queryClient Optional QueryClient for invalidating queries
 * @returns A promise that resolves when all deletions are complete
 */
async function deleteReconciliationAdjustmentEntries(
  reconciliationId: string,
  queryClient?: QueryClient
): Promise<void> {
  try {
    console.log(`Deleting all reconciliation adjustment entries for reconciliation ${reconciliationId}`);

    // Find all income entries that are reconciliation adjustments for this reconciliation
    const { data: incomeEntries, error: incomeError } = await supabase
      .from("income_entries")
      .select("id, description, amount")
      .or(`reconciliation_id.eq.${reconciliationId},payment_method.eq.reconciliation,description.ilike.[RECONCILIATION]%`);

    if (incomeError) {
      console.error("Error finding reconciliation income adjustments:",
        incomeError.message || JSON.stringify(incomeError));
      toast.warning("Some reconciliation income adjustments may not be deleted");
    } else if (incomeEntries && incomeEntries.length > 0) {
      console.log(`Found ${incomeEntries.length} reconciliation income adjustments to delete`);

      // Delete each income entry
      for (const entry of incomeEntries) {
        try {
          console.log(`Deleting reconciliation income adjustment: ${entry.id} - ${entry.description} (${entry.amount})`);

          // Delete the entry from transaction_reconciliations first
          await supabase
            .from("transaction_reconciliations")
            .delete()
            .eq("transaction_id", entry.id);

          // Then delete the income entry
          const { error: deleteError } = await supabase
            .from("income_entries")
            .delete()
            .eq("id", entry.id);

          if (deleteError) {
            console.error(`Error deleting reconciliation income adjustment ${entry.id}:`,
              deleteError.message || JSON.stringify(deleteError));
          }
        } catch (entryError) {
          console.error(`Exception deleting reconciliation income adjustment ${entry.id}:`,
            entryError instanceof Error ? entryError.message : String(entryError));
        }
      }
    } else {
      console.log("No reconciliation income adjustments found to delete");
    }

    // Find all expenditure entries that are reconciliation adjustments for this reconciliation
    const { data: expenditureEntries, error: expenditureError } = await supabase
      .from("expenditure_entries")
      .select("id, description, amount")
      .or(`reconciliation_id.eq.${reconciliationId},payment_method.eq.reconciliation,description.ilike.[RECONCILIATION]%`);

    if (expenditureError) {
      console.error("Error finding reconciliation expenditure adjustments:",
        expenditureError.message || JSON.stringify(expenditureError));
      toast.warning("Some reconciliation expenditure adjustments may not be deleted");
    } else if (expenditureEntries && expenditureEntries.length > 0) {
      console.log(`Found ${expenditureEntries.length} reconciliation expenditure adjustments to delete`);

      // Delete each expenditure entry
      for (const entry of expenditureEntries) {
        try {
          console.log(`Deleting reconciliation expenditure adjustment: ${entry.id} - ${entry.description} (${entry.amount})`);

          // Delete the entry from transaction_reconciliations first
          await supabase
            .from("transaction_reconciliations")
            .delete()
            .eq("transaction_id", entry.id);

          // Then delete the expenditure entry
          const { error: deleteError } = await supabase
            .from("expenditure_entries")
            .delete()
            .eq("id", entry.id);

          if (deleteError) {
            console.error(`Error deleting reconciliation expenditure adjustment ${entry.id}:`,
              deleteError.message || JSON.stringify(deleteError));
          }
        } catch (entryError) {
          console.error(`Exception deleting reconciliation expenditure adjustment ${entry.id}:`,
            entryError instanceof Error ? entryError.message : String(entryError));
        }
      }
    } else {
      console.log("No reconciliation expenditure adjustments found to delete");
    }

    // Invalidate relevant queries if we have a query client
    if (queryClient) {
      try {
        queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
        queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });
        console.log("Successfully invalidated queries after deleting reconciliation adjustments");
      } catch (queryError) {
        console.error("Error invalidating queries:",
          queryError instanceof Error ? queryError.message : String(queryError));
      }
    }

    console.log(`Finished deleting reconciliation adjustment entries for reconciliation ${reconciliationId}`);
  } catch (error) {
    console.error("Error deleting reconciliation adjustment entries:",
      error instanceof Error ? error.message : String(error));
    toast.warning("Some reconciliation adjustments may not be deleted");
  }
}

/**
 * Updates the reconciliation when a reconciliation entry is deleted
 *
 * @param entryId The ID of the entry that was deleted
 * @param entryType The type of entry ('income_entries' or 'expenditure_entries')
 * @param queryClient Optional QueryClient for invalidating queries
 */
async function updateReconciliationAfterEntryDeletion(
  entryId: string,
  entryType: string,
  queryClient?: QueryClient
): Promise<void> {
  try {
    console.log(`Updating reconciliation after deletion of ${entryType} with ID ${entryId}`);

    // First, check if this entry is linked to a reconciliation
    let reconciliationId: string | null = null;

    try {
      // First, try to get the entry details to check for reconciliation_id field
      // This is needed because we might have deleted the entry already
      let entryDetails: any = null;

      if (tableName === "income_entries") {
        const { data, error } = await supabase
          .from("income_entries")
          .select("*")
          .eq("id", entryId)
          .maybeSingle();

        if (!error && data) {
          entryDetails = data;
          console.log(`Found income entry details:`, entryDetails);

          // Check if the entry has a reconciliation_id field
          if (entryDetails.reconciliation_id) {
            reconciliationId = entryDetails.reconciliation_id;
            console.log(`Found reconciliation ID ${reconciliationId} directly in income entry`);
          }
        }
      } else if (tableName === "expenditure_entries") {
        const { data, error } = await supabase
          .from("expenditure_entries")
          .select("*")
          .eq("id", entryId)
          .maybeSingle();

        if (!error && data) {
          entryDetails = data;
          console.log(`Found expenditure entry details:`, entryDetails);

          // Check if the entry has a reconciliation_id field
          if (entryDetails.reconciliation_id) {
            reconciliationId = entryDetails.reconciliation_id;
            console.log(`Found reconciliation ID ${reconciliationId} directly in expenditure entry`);
          }
        }
      }

      // If we couldn't find a reconciliation_id directly in the entry,
      // check the transaction_reconciliations table
      const { data: reconciliationLink, error: linkError } = await supabase
        .from("transaction_reconciliations")
        .select("reconciliation_id")
        .eq("transaction_id", entryId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no record found

      if (linkError) {
        console.error("Error fetching reconciliation link:", linkError.message || JSON.stringify(linkError));
        toast.warning("Reconciliation link check failed");
      } else if (!reconciliationLink) {
        console.log("No reconciliation link found in transaction_reconciliations table");

        // Try to find the reconciliation ID from reconciliation_items table as a fallback
        const { data: reconciliationItem, error: itemError } = await supabase
          .from("reconciliation_items")
          .select("reconciliation_id")
          .eq("transaction_id", entryId)
          .maybeSingle();

        if (itemError) {
          console.error("Error fetching from reconciliation_items:", itemError.message || JSON.stringify(itemError));
        } else if (reconciliationItem) {
          reconciliationId = reconciliationItem.reconciliation_id;
          console.log(`Found reconciliation ID ${reconciliationId} in reconciliation_items table`);
        } else {
          // If we still haven't found a reconciliation ID, check if the entry description
          // contains reconciliation information
          if (entryDetails && entryDetails.description) {
            // Try to extract reconciliation ID from description
            // Format might be like "[RECONCILIATION] Reconciliation adjustment for account e61cfed..."
            const match = entryDetails.description.match(/account\s+([a-f0-9-]+)/i);
            if (match && match[1]) {
              const accountId = match[1];
              console.log(`Extracted account ID ${accountId} from description`);

              // Try to find the most recent reconciliation for this account
              const { data: recentReconciliation, error: reconcError } = await supabase
                .from("bank_reconciliations")
                .select("id")
                .eq("account_id", accountId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (!reconcError && recentReconciliation) {
                reconciliationId = recentReconciliation.id;
                console.log(`Found most recent reconciliation ID ${reconciliationId} for account ${accountId}`);
              } else {
                console.log("No reconciliation found for the extracted account ID");
              }
            } else {
              console.log("No account ID found in description");
            }
          }

          if (!reconciliationId) {
            console.log("No reconciliation link found in any table, nothing to update");
            return;
          }
        }
      } else {
        reconciliationId = reconciliationLink.reconciliation_id;
        console.log(`Found reconciliation ID ${reconciliationId} in transaction_reconciliations table`);
      }
    } catch (linkCheckError) {
      console.error("Exception checking reconciliation link:", linkCheckError);
      toast.warning("Reconciliation link check failed");
      return;
    }

    // If we couldn't find a reconciliation ID, there's nothing to update
    if (!reconciliationId) {
      console.log("No reconciliation ID found, nothing to update");
      return;
    }

    // Delete the entry from transaction_reconciliations (if it exists)
    try {
      const { error: deleteError } = await supabase
        .from("transaction_reconciliations")
        .delete()
        .eq("transaction_id", entryId)
        .eq("reconciliation_id", reconciliationId);

      if (deleteError) {
        console.error("Error deleting from transaction_reconciliations:",
          deleteError.message || JSON.stringify(deleteError));
        toast.warning("Reconciliation link removal failed");
      } else {
        console.log("Successfully removed reconciliation link");
      }
    } catch (deleteError) {
      console.error("Exception deleting reconciliation link:", deleteError);
      toast.warning("Reconciliation link removal failed");
      // Continue with the rest of the process even if this fails
    }

    // Get the reconciliation to update its book_balance
    let accountId: string | null = null;
    try {
      const { data: reconciliation, error: reconcError } = await supabase
        .from("bank_reconciliations")
        .select("id, account_id, bank_balance, book_balance")
        .eq("id", reconciliationId)
        .maybeSingle();

      if (reconcError) {
        console.error("Error fetching reconciliation:",
          reconcError.message || JSON.stringify(reconcError));
        toast.warning("Reconciliation data fetch failed");
        return;
      } else if (!reconciliation) {
        console.log(`Reconciliation with ID ${reconciliationId} not found`);
        return;
      }

      accountId = reconciliation.account_id;
      console.log(`Found reconciliation for account ${accountId}`);
    } catch (reconcFetchError) {
      console.error("Exception fetching reconciliation:", reconcFetchError);
      toast.warning("Reconciliation data fetch failed");
      return;
    }

    if (!accountId) {
      console.log("No account ID found, cannot update reconciliation");
      return;
    }

    // Recalculate the account balance
    let newBalance: number | null = null;
    try {
      // First try using the RPC function
      const { data, error } = await supabase
        .rpc("recalculate_account_balance", {
          account_id: accountId
        });

      if (error) {
        console.error("Error from recalculate_account_balance RPC:",
          error.message || JSON.stringify(error));

        // Fall back to manual calculation
        console.log("Falling back to manual account balance calculation");
        const { data: transactions, error: txError } = await supabase
          .from("account_transactions")
          .select("amount")
          .eq("account_id", accountId);

        if (txError) {
          console.error("Error fetching account transactions:",
            txError.message || JSON.stringify(txError));
          toast.warning("Account balance recalculation failed");
          return;
        }

        // Calculate balance from transactions
        newBalance = 0;
        if (transactions && transactions.length > 0) {
          newBalance = transactions.reduce((sum, tx) => sum + (typeof tx.amount === 'number' ? tx.amount : 0), 0);
        }

        // Get opening balance
        const { data: account, error: acctError } = await supabase
          .from("accounts")
          .select("opening_balance")
          .eq("id", accountId)
          .maybeSingle();

        if (!acctError && account && account.opening_balance) {
          newBalance += account.opening_balance;
        }

        console.log(`Manually calculated balance: ${newBalance}`);
      } else {
        newBalance = data;
        console.log(`RPC calculated balance: ${newBalance}`);
      }
    } catch (balanceError) {
      console.error("Exception recalculating account balance:", balanceError);
      toast.warning("Account balance recalculation failed");
      return;
    }

    if (newBalance === null) {
      console.log("Failed to calculate new balance, cannot update reconciliation");
      return;
    }

    // Update the book_balance in the reconciliation
    try {
      // First, get the current reconciliation data to check if it has manual adjustments
      const { data: currentReconciliation, error: fetchError } = await supabase
        .from("bank_reconciliations")
        .select("id, account_id, book_balance, bank_balance, has_manual_adjustments")
        .eq("id", reconciliationId)
        .single();

      if (fetchError) {
        console.error("Error fetching current reconciliation data:", fetchError);
        toast.warning("Reconciliation data fetch failed");
        return;
      }

      console.log(`Current reconciliation data:`, currentReconciliation);

      // Get the deleted entry details to determine if it was a reconciliation adjustment
      let isReconciliationAdjustment = false;
      let adjustmentAmount = 0;

      if (tableName === "income_entries") {
        // For income entries, we need to check if it was a reconciliation adjustment
        // If it was, we need to add the amount back to the book balance
        const { data: deletedEntry, error: entryError } = await supabase
          .from("income_entries")
          .select("amount, description, payment_method")
          .eq("id", entryId)
          .maybeSingle();

        if (entryError) {
          console.log("Error fetching deleted income entry:", entryError);
          // We'll continue with the normal flow
        } else if (deletedEntry) {
          // This means the entry hasn't been deleted yet
          isReconciliationAdjustment =
            (deletedEntry.description && (
              deletedEntry.description.includes("[RECONCILIATION]") ||
              deletedEntry.description.includes("Reconciliation adjustment")
            )) ||
            deletedEntry.payment_method === "reconciliation";

          if (isReconciliationAdjustment) {
            adjustmentAmount = deletedEntry.amount;
            console.log(`Deleted entry was a reconciliation adjustment with amount ${adjustmentAmount}`);
          }
        } else {
          console.log("Income entry already deleted, using fallback method");
        }
      } else if (tableName === "expenditure_entries") {
        // For expenditure entries, we need to check if it was a reconciliation adjustment
        // If it was, we need to subtract the amount from the book balance
        const { data: deletedEntry, error: entryError } = await supabase
          .from("expenditure_entries")
          .select("amount, description, payment_method")
          .eq("id", entryId)
          .maybeSingle();

        if (entryError) {
          console.log("Error fetching deleted expenditure entry:", entryError);
          // We'll continue with the normal flow
        } else if (deletedEntry) {
          // This means the entry hasn't been deleted yet
          isReconciliationAdjustment =
            (deletedEntry.description && (
              deletedEntry.description.includes("[RECONCILIATION]") ||
              deletedEntry.description.includes("Reconciliation adjustment")
            )) ||
            deletedEntry.payment_method === "reconciliation";

          if (isReconciliationAdjustment) {
            adjustmentAmount = -deletedEntry.amount; // Negate because expenditure decreases balance
            console.log(`Deleted entry was a reconciliation adjustment with amount ${adjustmentAmount}`);
          }
        } else {
          console.log("Expenditure entry already deleted, using fallback method");
        }
      }

      // If this was a reconciliation adjustment, directly update the book balance
      if (isReconciliationAdjustment && adjustmentAmount !== 0) {
        console.log(`Directly updating book balance for reconciliation adjustment deletion`);

        // Calculate the new book balance by removing the adjustment
        const newBookBalance = currentReconciliation.book_balance - adjustmentAmount;

        console.log(`Current book balance: ${currentReconciliation.book_balance}`);
        console.log(`Adjustment amount: ${adjustmentAmount}`);
        console.log(`New book balance: ${newBookBalance}`);

        // Update the reconciliation with the new book balance
        const { error: updateError } = await supabase
          .from("bank_reconciliations")
          .update({
            book_balance: newBookBalance,
            updated_at: new Date().toISOString()
          })
          .eq("id", reconciliationId);

        if (updateError) {
          console.error("Error updating reconciliation book_balance:", updateError);
          toast.warning("Reconciliation balance update failed");
        } else {
          console.log(`Successfully updated reconciliation ${reconciliationId} with new book balance ${newBookBalance}`);
          toast.success("Reconciliation balance updated successfully");

          // Invalidate reconciliation queries if we have a query client
          if (queryClient) {
            queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });
            queryClient.refetchQueries({ queryKey: ["bankReconciliations"] });
          }

          // Return early since we've already updated the book balance
          return;
        }
      }

      // If we get here, either it wasn't a reconciliation adjustment or we couldn't determine
      // So we'll continue with the normal flow

      // Check if this reconciliation has manual adjustments
      const hasManualAdjustments = currentReconciliation.has_manual_adjustments;

      // If it has manual adjustments, we need to be careful about updating the book balance
      if (hasManualAdjustments) {
        console.log(`Reconciliation ${reconciliationId} has manual adjustments. Checking for adjustment entries...`);

        // Check if there are any remaining adjustment entries in both income and expenditure tables
        // First check income entries
        const { data: incomeAdjustments, error: incomeAdjustmentError } = await supabase
          .from("income_entries")
          .select("id")
          .or(`payment_method.eq.reconciliation,description.ilike.%[RECONCILIATION]%,description.ilike.%Reconciliation adjustment%`)
          .eq("reconciliation_id", reconciliationId)
          .limit(1);

        if (incomeAdjustmentError) {
          console.error("Error checking for income adjustment entries:", incomeAdjustmentError);
        }

        // Then check expenditure entries
        const { data: expenditureAdjustments, error: expenditureAdjustmentError } = await supabase
          .from("expenditure_entries")
          .select("id")
          .or(`payment_method.eq.reconciliation,description.ilike.%[RECONCILIATION]%,description.ilike.%Reconciliation adjustment%`)
          .eq("reconciliation_id", reconciliationId)
          .limit(1);

        if (expenditureAdjustmentError) {
          console.error("Error checking for expenditure adjustment entries:", expenditureAdjustmentError);
        }

        // Combine the results
        const adjustmentEntries = [
          ...(incomeAdjustments || []),
          ...(expenditureAdjustments || [])
        ];

        console.log(`Found ${adjustmentEntries.length} remaining adjustment entries for reconciliation ${reconciliationId}`);

        const hasAdjustmentEntries = adjustmentEntries && adjustmentEntries.length > 0;

        if (hasAdjustmentEntries) {
          console.log(`Reconciliation still has adjustment entries. Preserving manual adjustments.`);
          // We don't update the book balance if there are still adjustment entries
          toast.info("Reconciliation has manual adjustments. Book balance preserved.");
        } else {
          console.log(`No adjustment entries found. Updating book balance to ${newBalance}`);
          // Update the book balance since there are no more adjustment entries
          const { error: updateError } = await supabase
            .from("bank_reconciliations")
            .update({
              book_balance: newBalance,
              updated_at: new Date().toISOString(),
              has_manual_adjustments: false // Reset this flag since there are no more adjustments
            })
            .eq("id", reconciliationId);

          if (updateError) {
            console.error("Error updating reconciliation book_balance:", updateError);
            toast.warning("Reconciliation balance update failed");
            return;
          }

          console.log(`Successfully updated reconciliation ${reconciliationId} with new book balance ${newBalance}`);
          toast.success("Reconciliation balance updated successfully");
        }
      } else {
        // No manual adjustments, so we can safely update the book balance
        console.log(`Reconciliation ${reconciliationId} has no manual adjustments. Updating book balance to ${newBalance}`);

        const { error: updateError } = await supabase
          .from("bank_reconciliations")
          .update({
            book_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq("id", reconciliationId);

        if (updateError) {
          console.error("Error updating reconciliation book_balance:", updateError);
          toast.warning("Reconciliation balance update failed");
          return;
        }

        console.log(`Successfully updated reconciliation ${reconciliationId} with new book balance ${newBalance}`);
        toast.success("Reconciliation balance updated successfully");
      }
    } catch (updateError) {
      console.error("Exception updating reconciliation:", updateError);
      toast.warning("Reconciliation balance update failed");
      return;
    }

    // Invalidate reconciliation queries if we have a query client
    if (queryClient) {
      try {
        queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });
        queryClient.invalidateQueries({ queryKey: ["reconciliationItems"] });
        queryClient.refetchQueries({ queryKey: ["bankReconciliations"] });
        queryClient.refetchQueries({ queryKey: ["reconciliationItems"] });
        console.log("Successfully invalidated and refetched reconciliation queries");
      } catch (queryError) {
        console.error("Error invalidating queries:", queryError);
        // This is not critical, so we don't show a toast
      }
    }

    console.log(`Reconciliation ${reconciliationId} updated successfully after ${entryType} deletion`);
  } catch (error) {
    // Catch any unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating reconciliation after entry deletion:", errorMessage);
    toast.warning("Reconciliation may not be updated correctly");
  }
}

/**
 * Deletes a financial entry and updates account balances if necessary
 *
 * @param tableName The table to delete from (income_entries, expenditure_entries, account_transfers)
 * @param entryId The ID of the entry to delete
 * @returns True if deletion was successful, false otherwise
 */
/**
 * Simple function to directly update a reconciliation's book balance
 * This is used when a reconciliation adjustment is deleted
 */
async function updateReconciliationBookBalance(
  reconciliationId: string,
  adjustmentAmount: number,
  isIncome: boolean,
  queryClient?: QueryClient
): Promise<boolean> {
  try {
    console.log(`Directly updating reconciliation ${reconciliationId} book balance`);
    console.log(`Adjustment amount: ${adjustmentAmount}, Is income: ${isIncome}`);

    // Get the current reconciliation data
    const { data: reconciliation, error: fetchError } = await supabase
      .from("bank_reconciliations")
      .select("id, book_balance, bank_balance")
      .eq("id", reconciliationId)
      .single();

    if (fetchError) {
      console.error("Error fetching reconciliation:", fetchError);
      toast.error("Failed to update reconciliation: Could not fetch current data");
      return false;
    }

    // Calculate the new book balance
    // IMPORTANT: The logic here is critical
    // When we create an income reconciliation adjustment, it DECREASES the book balance
    // When we create an expenditure reconciliation adjustment, it INCREASES the book balance
    // So when we delete them:
    // - Deleting an income adjustment should INCREASE the book balance (add the amount back)
    // - Deleting an expenditure adjustment should DECREASE the book balance (subtract the amount)
    let newBookBalance = reconciliation.book_balance;

    if (isIncome) {
      // When an income reconciliation adjustment is deleted, ADD its amount to book balance
      newBookBalance += adjustmentAmount;
      console.log(`Income adjustment deleted: ${reconciliation.book_balance} + ${adjustmentAmount} = ${newBookBalance}`);
    } else {
      // When an expenditure reconciliation adjustment is deleted, SUBTRACT its amount from book balance
      newBookBalance -= adjustmentAmount;
      console.log(`Expenditure adjustment deleted: ${reconciliation.book_balance} - ${adjustmentAmount} = ${newBookBalance}`);
    }

    // Update the reconciliation with the new book balance
    const { error: updateError } = await supabase
      .from("bank_reconciliations")
      .update({
        book_balance: newBookBalance,
        updated_at: new Date().toISOString()
      })
      .eq("id", reconciliationId);

    if (updateError) {
      console.error("Error updating reconciliation book balance:", updateError);
      toast.error("Failed to update reconciliation book balance");
      return false;
    }

    console.log(`Successfully updated reconciliation ${reconciliationId} book balance to ${newBookBalance}`);
    toast.success("Reconciliation balance updated successfully");

    // Invalidate and refetch reconciliation queries
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });
      queryClient.refetchQueries({ queryKey: ["bankReconciliations"] });
    }

    return true;
  } catch (error) {
    console.error("Error updating reconciliation book balance:", error);
    toast.error("Failed to update reconciliation book balance");
    return false;
  }
}

export async function deleteFinancialEntry(
  tableName: string,
  entryId: string,
  queryClient?: QueryClient
): Promise<boolean> {
  try {
    // First, get the entry to be deleted
    const { data: entry, error: fetchError } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", entryId)
      .single();

    if (fetchError) {
      console.error(`Error fetching ${tableName} for deletion:`, fetchError);
      toast.error(`Failed to delete: ${fetchError.message}`);
      return false;
    }

    // Store entry details for later use
    const entryDetails = { ...entry };

    // Check if this is a reconciliation adjustment BEFORE deleting the entry
    let isReconciliationAdjustment = false;
    let adjustmentAmount = 0;
    let reconciliationId: string | null = null;

    // DIRECT CHECK 0: Check if the entry has a reconciliation_id field
    if (entry.reconciliation_id) {
      reconciliationId = entry.reconciliation_id;
      isReconciliationAdjustment = true;
      console.log(`DIRECT CHECK 0: Entry has reconciliation_id field: ${reconciliationId}`);
    }

    // Store the amount for later use
    adjustmentAmount = entry.amount;

    console.log(`=== CHECKING IF ENTRY IS A RECONCILIATION ADJUSTMENT ===`);
    console.log(`Entry ID: ${entryId}`);
    console.log(`Table Name: ${tableName}`);
    console.log(`Entry Details:`, entryDetails);

    // DIRECT CHECK 1: Check if this entry is linked to a reconciliation in the transaction_reconciliations table
    try {
      console.log(`Performing direct check in transaction_reconciliations table...`);
      const { data: reconciliationLink, error: linkError } = await supabase
        .from("transaction_reconciliations")
        .select("reconciliation_id")
        .eq("transaction_id", entryId)
        .maybeSingle();

      if (linkError) {
        console.error("Error checking transaction_reconciliations:", linkError);
      } else if (reconciliationLink) {
        reconciliationId = reconciliationLink.reconciliation_id;
        isReconciliationAdjustment = true;
        console.log(`DIRECT CHECK 1: Found reconciliation link in transaction_reconciliations table`);
        console.log(`Reconciliation ID: ${reconciliationId}`);
      } else {
        console.log(`DIRECT CHECK 1: No reconciliation link found in transaction_reconciliations table`);
      }
    } catch (error) {
      console.error("Error in direct reconciliation check 1:", error);
    }

    // DIRECT CHECK 2: Check if this entry is linked to a reconciliation in the reconciliation_items table
    if (!reconciliationId) {
      try {
        console.log(`Performing direct check in reconciliation_items table...`);
        const { data: reconciliationItem, error: itemError } = await supabase
          .from("reconciliation_items")
          .select("reconciliation_id")
          .eq("transaction_id", entryId)
          .maybeSingle();

        if (itemError) {
          console.error("Error checking reconciliation_items:", itemError);
        } else if (reconciliationItem) {
          reconciliationId = reconciliationItem.reconciliation_id;
          isReconciliationAdjustment = true;
          console.log(`DIRECT CHECK 2: Found reconciliation link in reconciliation_items table`);
          console.log(`Reconciliation ID: ${reconciliationId}`);
        } else {
          console.log(`DIRECT CHECK 2: No reconciliation link found in reconciliation_items table`);
        }
      } catch (error) {
        console.error("Error in direct reconciliation check 2:", error);
      }
    }

    if (tableName === "income_entries" || tableName === "expenditure_entries") {
      // Check if it's a reconciliation adjustment - use multiple methods to identify
      const isReconciliationByDescription = entry.description && (
        entry.description.includes("[RECONCILIATION]") ||
        entry.description.includes("Reconciliation adjustment") ||
        entry.description.toLowerCase().includes("reconcil")
      );

      const isReconciliationByPaymentMethod = entry.payment_method === "reconciliation";

      // Check for reconciliation_id field
      const hasReconciliationId = !!entry.reconciliation_id;

      // Check for is_reconciliation_adjustment field
      const hasReconciliationFlag = !!entry.is_reconciliation_adjustment;

      isReconciliationAdjustment = isReconciliationByDescription || isReconciliationByPaymentMethod || hasReconciliationId || hasReconciliationFlag;

      console.log(`Reconciliation Detection Results:`);
      console.log(`- By Description: ${isReconciliationByDescription}`);
      console.log(`- By Payment Method: ${isReconciliationByPaymentMethod}`);
      console.log(`- Has Reconciliation ID: ${hasReconciliationId}`);
      console.log(`- Has Reconciliation Flag: ${hasReconciliationFlag}`);
      console.log(`- Final Result: ${isReconciliationAdjustment}`);

      console.log(`Checking if entry is a reconciliation adjustment:`, {
        entryId,
        description: entry.description,
        paymentMethod: entry.payment_method,
        hasReconciliationId,
        isReconciliationByDescription,
        isReconciliationByPaymentMethod,
        isReconciliationAdjustment
      });

      if (isReconciliationAdjustment) {
        // Store the amount for later use
        adjustmentAmount = entry.amount;
        console.log(`Identified as reconciliation adjustment with amount: ${adjustmentAmount}`);

        // Try to find the reconciliation ID using multiple methods

        // Method 1: Direct reconciliation_id field
        if (entry.reconciliation_id) {
          reconciliationId = entry.reconciliation_id;
          console.log(`Method 1: Found reconciliation ID ${reconciliationId} directly in entry`);
        }

        // Method 2: Check transaction_reconciliations table
        if (!reconciliationId) {
          try {
            const { data: reconciliationLink, error: linkError } = await supabase
              .from("transaction_reconciliations")
              .select("reconciliation_id")
              .eq("transaction_id", entryId)
              .maybeSingle();

            if (!linkError && reconciliationLink) {
              reconciliationId = reconciliationLink.reconciliation_id;
              console.log(`Method 2: Found reconciliation ID ${reconciliationId} in transaction_reconciliations`);
            }
          } catch (error) {
            console.error("Error checking transaction_reconciliations:", error);
          }
        }

        // Method 3: Extract from description - look for "Reconciliation ID: xxx" pattern
        if (!reconciliationId && entry.description) {
          const reconcIdMatch = entry.description.match(/reconciliation\s+id:\s*([a-f0-9-]+)/i);
          if (reconcIdMatch && reconcIdMatch[1]) {
            reconciliationId = reconcIdMatch[1];
            console.log(`Method 3: Extracted reconciliation ID ${reconciliationId} from description`);

            // Verify this reconciliation ID exists
            try {
              const { data: reconciliation, error: reconcError } = await supabase
                .from("bank_reconciliations")
                .select("id")
                .eq("id", reconciliationId)
                .maybeSingle();

              if (reconcError || !reconciliation) {
                console.log(`Extracted reconciliation ID ${reconciliationId} not found in database`);
                reconciliationId = null;
              } else {
                console.log(`Verified reconciliation ID ${reconciliationId} exists in database`);
              }
            } catch (error) {
              console.error("Error verifying reconciliation ID:", error);
              reconciliationId = null;
            }
          }
        }

        // Method 4: Extract account ID from description and find most recent reconciliation
        if (!reconciliationId && entry.description) {
          const accountMatch = entry.description.match(/account\s+([a-f0-9-]+)/i);
          if (accountMatch && accountMatch[1]) {
            const accountId = accountMatch[1];
            console.log(`Method 4: Extracted account ID ${accountId} from description`);

            try {
              // Find the most recent reconciliation for this account
              const { data: recentReconciliation, error: reconcError } = await supabase
                .from("bank_reconciliations")
                .select("id")
                .eq("account_id", accountId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (!reconcError && recentReconciliation) {
                reconciliationId = recentReconciliation.id;
                console.log(`Found most recent reconciliation ID ${reconciliationId} for account ${accountId}`);
              }
            } catch (error) {
              console.error("Error finding reconciliation for account:", error);
            }
          }
        }

        // Method 5: Use account_id from the entry itself
        if (!reconciliationId && entry.account_id) {
          try {
            console.log(`Method 5: Using entry's account_id ${entry.account_id} to find reconciliation`);

            const { data: recentReconciliation, error: reconcError } = await supabase
              .from("bank_reconciliations")
              .select("id")
              .eq("account_id", entry.account_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!reconcError && recentReconciliation) {
              reconciliationId = recentReconciliation.id;
              console.log(`Found most recent reconciliation ID ${reconciliationId} for entry's account ${entry.account_id}`);
            }
          } catch (error) {
            console.error("Error finding reconciliation for entry's account:", error);
          }
        }

        // Method 6: Last resort - use most recent reconciliation in the system
        if (!reconciliationId) {
          try {
            console.log(`Method 6: Last resort - finding most recent reconciliation in the system`);

            const { data: recentReconciliations, error: recentError } = await supabase
              .from("bank_reconciliations")
              .select("id")
              .order("created_at", { ascending: false })
              .limit(1);

            if (!recentError && recentReconciliations && recentReconciliations.length > 0) {
              reconciliationId = recentReconciliations[0].id;
              console.log(`Using most recent reconciliation ID ${reconciliationId} as fallback`);
            } else {
              console.log(`No reconciliations found in the system, cannot update book balance`);
            }
          } catch (error) {
            console.error("Error in fallback reconciliation ID lookup:", error);
          }
        }

        // Final result
        if (reconciliationId) {
          console.log(`Successfully identified reconciliation adjustment with amount ${adjustmentAmount} for reconciliation ${reconciliationId}`);
        } else {
          console.log(`This is a reconciliation adjustment but couldn't find any reconciliation ID`);
        }
      }
    }

    // Handle account transactions deletion based on entry type
    try {
      if (tableName === "income_entries" && entry.account_id) {
        // Check if there are any account transactions to delete
        const { data: transactions, error: checkError } = await supabase
          .from("account_tx_table") // Changed from account_transactions to account_tx_table
          .select("id")
          .eq("reference_id", entryId)
          .eq("reference_type", "income_entry");

        if (checkError) {
          console.error("Error checking for account transactions:",
            checkError.message || JSON.stringify(checkError));
          // Continue with deletion even if we can't check for transactions
        } else if (transactions && transactions.length > 0) {
          // Delete associated account transaction
          const { error: transactionError } = await supabase
            .from("account_tx_table") // Changed from account_transactions to account_tx_table
            .delete()
            .eq("reference_id", entryId)
            .eq("reference_type", "income_entry");

          if (transactionError) {
            console.error("Error deleting account transaction:",
              transactionError.message || JSON.stringify(transactionError));
            toast.warning("Transaction log may not be updated correctly");
            // Continue with deletion even if transaction deletion fails
          }
        }
      } else if (tableName === "expenditure_entries" && entry.account_id) {
        // Check if there are any account transactions to delete
        const { data: transactions, error: checkError } = await supabase
          .from("account_tx_table") // Changed from account_transactions to account_tx_table
          .select("id")
          .eq("reference_id", entryId)
          .eq("reference_type", "expenditure_entry");

        if (checkError) {
          console.error("Error checking for account transactions:",
            checkError.message || JSON.stringify(checkError));
          // Continue with deletion even if we can't check for transactions
        } else if (transactions && transactions.length > 0) {
          // Delete associated account transaction
          const { error: transactionError } = await supabase
            .from("account_tx_table") // Changed from account_transactions to account_tx_table
            .delete()
            .eq("reference_id", entryId)
            .eq("reference_type", "expenditure_entry");

          if (transactionError) {
            console.error("Error deleting account transaction:",
              transactionError.message || JSON.stringify(transactionError));
            toast.warning("Transaction log may not be updated correctly");
            // Continue with deletion even if transaction deletion fails
          }
        }
      } else if (tableName === "liability_entries") {
        // For liability entries, we don't need to delete account transactions directly
        // as they are created through expenditure entries when payments are made
        console.log("Liability entry deletion - no direct account transactions to delete");
      }
    } catch (transactionDeleteError) {
      console.error("Error handling account transaction deletion:",
        transactionDeleteError instanceof Error ? transactionDeleteError.message : String(transactionDeleteError));
      toast.warning("Transaction log may not be updated correctly");
      // Continue with deletion even if transaction deletion fails
    }

    // Check if this is a reconciliation entry before deleting
    let isReconciliationEntry = false;
    if (tableName === "income_entries" || tableName === "expenditure_entries") {
      // Check if it's a reconciliation entry - focus on fields that actually exist in the database
      // Make sure to catch all possible formats of reconciliation entries
      isReconciliationEntry =
        (entry.description && (
          entry.description.includes("[RECONCILIATION]") ||
          entry.description.includes("Reconciliation adjustment") ||
          entry.description.toLowerCase().includes("reconcil")
        )) ||
        entry.payment_method === "reconciliation";

      // Log for debugging
      console.log(`Checking if ${tableName} entry is a reconciliation entry:`, {
        entryId,
        description: entry.description,
        paymentMethod: entry.payment_method,
        isReconciliationEntry
      });

      // Even if not identified as a reconciliation entry by the above checks,
      // we should still check the transaction_reconciliations table
      if (!isReconciliationEntry) {
        console.log(`Entry not identified as reconciliation entry by basic checks, checking transaction_reconciliations table...`);
      }
    }

    // Delete the entry
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq("id", entryId);

    if (deleteError) {
      console.error(`Error deleting ${tableName}:`, deleteError);
      toast.error(`Failed to delete: ${deleteError.message}`);
      return false;
    }

    // Import the new function
    const { updateReconciliationBookBalanceAfterDeletion } = await import("@/lib/update-reconciliation-book-balance");

    console.log(`=== ENTRY DELETED SUCCESSFULLY ===`);
    console.log(`Entry ID: ${entryId}`);
    console.log(`Table Name: ${tableName}`);

    // Force a direct update of the reconciliation book balance
    // This is a critical fix to ensure the book balance is updated correctly
    if (isReconciliationAdjustment) {
      if (!reconciliationId) {
        console.error(`ERROR: Entry is a reconciliation adjustment but no reconciliation ID found`);
        toast.warning("Reconciliation ID not found. Book balance may not update correctly.");

        // Try to find the reconciliation ID as a last resort
        if (entryDetails.account_id) {
          console.log(`Attempting to find reconciliation ID using account ID: ${entryDetails.account_id}`);

          try {
            const { data: recentReconciliation, error: reconcError } = await supabase
              .from("bank_reconciliations")
              .select("id")
              .eq("account_id", entryDetails.account_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (!reconcError && recentReconciliation) {
              reconciliationId = recentReconciliation.id;
              console.log(`Found reconciliation ID ${reconciliationId} for account ${entryDetails.account_id}`);
            }
          } catch (error) {
            console.error("Error finding reconciliation for account:", error);
          }
        }

        if (!reconciliationId) {
          console.log(`Still no reconciliation ID found. Trying to find most recent reconciliation...`);

          try {
            const { data: recentReconciliations, error: recentError } = await supabase
              .from("bank_reconciliations")
              .select("id")
              .order("created_at", { ascending: false })
              .limit(1);

            if (!recentError && recentReconciliations && recentReconciliations.length > 0) {
              reconciliationId = recentReconciliations[0].id;
              console.log(`Using most recent reconciliation ID ${reconciliationId} as fallback`);
            }
          } catch (error) {
            console.error("Error finding most recent reconciliation:", error);
          }
        }
      }

      if (reconciliationId) {
        console.log(`Entry was a reconciliation adjustment. Updating book balance...`);
        console.log(`Entry details: Type=${tableName}, Amount=${adjustmentAmount}, ReconciliationID=${reconciliationId}`);

        // Use our new direct function to update the book balance
        const success = await updateReconciliationBookBalanceAfterDeletion(
          reconciliationId,
          tableName,
          adjustmentAmount,
          queryClient
        );

        if (success) {
          console.log(`Successfully updated reconciliation book balance after deleting ${tableName} entry`);
        } else {
          console.error(`Failed to update reconciliation book balance after deleting ${tableName} entry`);
          toast.warning("Reconciliation balance may not be updated correctly");
        }
      }
    } else {
      // If it wasn't identified as a reconciliation adjustment, log it
      console.log(`Entry was not identified as a reconciliation adjustment or no reconciliation ID found`);

      // Check if the description contains reconciliation keywords as a fallback
      if (entryDetails.description && (
        entryDetails.description.includes("[RECONCILIATION]") ||
        entryDetails.description.toLowerCase().includes("reconciliation")
      )) {
        console.log(`Entry description contains reconciliation keywords, trying to find reconciliation ID...`);

        // Try to extract reconciliation ID from description
        const reconcIdMatch = entryDetails.description.match(/reconciliation id:\s*([a-f0-9-]+)/i);
        if (reconcIdMatch && reconcIdMatch[1]) {
          reconciliationId = reconcIdMatch[1];
          console.log(`Found reconciliation ID ${reconciliationId} in description`);

          // Update the book balance using our new function
          const success = await updateReconciliationBookBalanceAfterDeletion(
            reconciliationId,
            tableName,
            entryDetails.amount,
            queryClient
          );

          if (success) {
            console.log(`Successfully updated reconciliation book balance using ID from description`);
          } else {
            console.error(`Failed to update reconciliation book balance using ID from description`);
          }
        } else {
          // Try to find the most recent reconciliation as a last resort
          console.log(`No reconciliation ID found in description, trying to find most recent reconciliation...`);

          const { data: recentReconciliations, error: recentError } = await supabase
            .from("bank_reconciliations")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1);

          if (!recentError && recentReconciliations && recentReconciliations.length > 0) {
            reconciliationId = recentReconciliations[0].id;
            console.log(`Using most recent reconciliation ID ${reconciliationId} as fallback`);

            // Update the book balance using our new function
            const success = await updateReconciliationBookBalanceAfterDeletion(
              reconciliationId,
              tableName,
              entryDetails.amount,
              queryClient
            );

            if (success) {
              console.log(`Successfully updated most recent reconciliation book balance`);
            } else {
              console.error(`Failed to update most recent reconciliation book balance`);
            }
          } else {
            console.log(`No reconciliations found in the system, cannot update book balance`);
          }
        }
      } else {
        console.log(`Entry does not appear to be related to reconciliation, skipping book balance update`);
      }
    }

    // Update account balance if applicable
    if (tableName === "income_entries") {
      // Handle account balance update if applicable
      if (entry.account_id) {
        try {
          console.log(`Updating account balance for income entry deletion: Account ID ${entry.account_id}, Amount ${entry.amount}`);

          // If we have a query client, use the sync function
          if (queryClient) {
            try {
              console.log(`Syncing account balance for income entry deletion: Account ID ${entry.account_id}`);
              const result = await syncAccountBalance(
                entry.account_id,
                entry.amount,
                'delete',
                'income',
                queryClient
              );

              if (result === null) {
                console.warn("Account balance sync returned null, falling back to direct recalculation");
                // Fall back to AccountBalanceService
                try {
                  // Import AccountBalanceService dynamically to avoid circular dependencies
                  const { AccountBalanceService } = await import("@/services/account-balance-service");

                  // Use the service to recalculate the balance
                  const newBalance = await AccountBalanceService.recalculateBalance(entry.account_id);

                  if (newBalance === null) {
                    console.error("Error in balance recalculation: AccountBalanceService returned null");
                    toast.warning("Entry deleted but account balance may not be accurate");
                  } else {
                    console.log(`Balance recalculation successful, new balance: ${newBalance}`);
                  }
                } catch (directRecalcError) {
                  console.error("Exception in balance recalculation:",
                    directRecalcError instanceof Error ? directRecalcError.message : String(directRecalcError));
                  toast.warning("Entry deleted but account balance may not be accurate");
                }
              }
            } catch (syncError) {
              console.error("Error in syncAccountBalance, falling back to direct recalculation:",
                syncError instanceof Error ? syncError.message : String(syncError));

              // Fall back to AccountBalanceService
              try {
                // Import AccountBalanceService dynamically to avoid circular dependencies
                const { AccountBalanceService } = await import("@/services/account-balance-service");

                // Use the service to recalculate the balance
                const newBalance = await AccountBalanceService.recalculateBalance(entry.account_id);

                if (newBalance === null) {
                  console.error("Error in balance recalculation after sync error: AccountBalanceService returned null");
                  toast.warning("Entry deleted but account balance may not be accurate");
                } else {
                  console.log(`Balance recalculation successful after sync error, new balance: ${newBalance}`);
                }
              } catch (directRecalcError) {
                console.error("Exception in balance recalculation after sync error:",
                  directRecalcError instanceof Error ? directRecalcError.message : String(directRecalcError));
                toast.warning("Entry deleted but account balance may not be accurate");
              }
            }
          } else {
            // Use AccountBalanceService if no query client
            try {
              // Import AccountBalanceService dynamically to avoid circular dependencies
              const { AccountBalanceService } = await import("@/services/account-balance-service");

              // Use the service to recalculate the balance
              const newBalance = await AccountBalanceService.recalculateBalance(entry.account_id);

              if (newBalance === null) {
                console.error("Error in balance recalculation: AccountBalanceService returned null");
                toast.warning("Entry deleted but account balance may not be accurate");
              } else {
                console.log(`Account balance recalculated successfully: ${newBalance}`);
              }
            } catch (error) {
              console.error("Error recalculating account balance:",
                error instanceof Error ? error.message : String(error));
              toast.warning("Entry deleted but account balance may not be accurate");
            }
          }
        } catch (balanceError) {
          console.error("Error updating account balance after income deletion:", balanceError);
          toast.warning("Entry deleted but account balance may not be accurate");
          // Continue with the rest of the deletion process
        }
      }

      // Handle budget item update if this income entry is linked to a budget item
      if (entry.budget_item_id) {
        try {
          console.log(`Income entry ${entryId} is linked to budget item ${entry.budget_item_id}. Updating budget item...`);

          // First, check if the budget item exists
          const { data: budgetItemCheck, error: checkError } = await supabase
            .from("budget_items")
            .select("id")
            .eq("id", entry.budget_item_id)
            .maybeSingle();

          if (checkError) {
            console.error("Error checking budget item existence:", checkError);
            toast.warning("Budget item may not be updated correctly");
            // Continue with deletion even if we can't check for budget item
          } else if (!budgetItemCheck) {
            console.log(`Budget item ${entry.budget_item_id} no longer exists, no update needed`);
          } else {
            // Get the current budget item with full details
            const { data: budgetItem, error: fetchBudgetItemError } = await supabase
              .from("budget_items")
              .select("*")
              .eq("id", entry.budget_item_id)
              .single();

            if (fetchBudgetItemError) {
              console.error("Error fetching budget item:", fetchBudgetItemError);
              toast.warning("Budget item may not be updated correctly");
            } else if (budgetItem) {
              // Update the budget item's actual_amount by subtracting the deleted income amount
              const newActualAmount = Math.max(0, (budgetItem.actual_amount || 0) - entry.amount);

              // Calculate the new variance
              const newVariance = (budgetItem.planned_amount || 0) - newActualAmount;

              console.log(`Updating budget item ${entry.budget_item_id}:`, {
                current: budgetItem.actual_amount,
                new: newActualAmount,
                variance: newVariance
              });

              try {
                // Update the budget item
                const { error: updateBudgetItemError } = await supabase
                  .from("budget_items")
                  .update({
                    actual_amount: newActualAmount,
                    variance: newVariance,
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", entry.budget_item_id);

                if (updateBudgetItemError) {
                  console.error("Error updating budget item:", updateBudgetItemError);
                  toast.warning("Budget item may not be updated correctly");
                } else {
                  console.log(`Budget item ${entry.budget_item_id} updated successfully. New actual amount: ${newActualAmount}`);

                  // Invalidate budget-related queries if we have a query client
                  if (queryClient) {
                    queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
                    queryClient.invalidateQueries({ queryKey: ["budgets"] });

                    // Force immediate refetch to ensure UI is updated
                    queryClient.refetchQueries({ queryKey: ["budgetItems"] });
                    queryClient.refetchQueries({ queryKey: ["budgets"] });
                  }
                }
              } catch (updateError) {
                console.error("Error during budget item update operation:", updateError);
                toast.warning("Budget item may not be updated correctly");
              }
            }
          }
        } catch (budgetItemError) {
          console.error("Error handling budget item update:", budgetItemError);
          toast.warning("Budget item may not be updated correctly");
          // Continue with the rest of the deletion process
        }
      }
    } else if (tableName === "expenditure_entries") {
      // Handle account balance update if applicable
      if (entry.account_id) {
        try {
          console.log(`Updating account balance for expenditure entry deletion: Account ID ${entry.account_id}, Amount ${entry.amount}`);

          // If we have a query client, use the sync function
          if (queryClient) {
            try {
              console.log(`Syncing account balance for expenditure entry deletion: Account ID ${entry.account_id}`);
              const result = await syncAccountBalance(
                entry.account_id,
                entry.amount,
                'delete',
                'expenditure',
                queryClient
              );

              if (result === null) {
                console.warn("Account balance sync returned null, falling back to direct recalculation");
                // Fall back to AccountBalanceService
                try {
                  // Import AccountBalanceService dynamically to avoid circular dependencies
                  const { AccountBalanceService } = await import("@/services/account-balance-service");

                  // Use the service to recalculate the balance
                  const newBalance = await AccountBalanceService.recalculateBalance(entry.account_id);

                  if (newBalance === null) {
                    console.error("Error in balance recalculation: AccountBalanceService returned null");
                    toast.warning("Entry deleted but account balance may not be accurate");
                  } else {
                    console.log(`Balance recalculation successful, new balance: ${newBalance}`);
                  }
                } catch (directRecalcError) {
                  console.error("Exception in balance recalculation:",
                    directRecalcError instanceof Error ? directRecalcError.message : String(directRecalcError));
                  toast.warning("Entry deleted but account balance may not be accurate");
                }
              }
            } catch (syncError) {
              console.error("Error in syncAccountBalance, falling back to direct recalculation:",
                syncError instanceof Error ? syncError.message : String(syncError));

              // Fall back to AccountBalanceService
              try {
                // Import AccountBalanceService dynamically to avoid circular dependencies
                const { AccountBalanceService } = await import("@/services/account-balance-service");

                // Use the service to recalculate the balance
                const newBalance = await AccountBalanceService.recalculateBalance(entry.account_id);

                if (newBalance === null) {
                  console.error("Error in balance recalculation after sync error: AccountBalanceService returned null");
                  toast.warning("Entry deleted but account balance may not be accurate");
                } else {
                  console.log(`Balance recalculation successful after sync error, new balance: ${newBalance}`);
                }
              } catch (directRecalcError) {
                console.error("Exception in balance recalculation after sync error:",
                  directRecalcError instanceof Error ? directRecalcError.message : String(directRecalcError));
                toast.warning("Entry deleted but account balance may not be accurate");
              }
            }
          } else {
            // Use AccountBalanceService if no query client
            try {
              // Import AccountBalanceService dynamically to avoid circular dependencies
              const { AccountBalanceService } = await import("@/services/account-balance-service");

              // Use the service to recalculate the balance
              const newBalance = await AccountBalanceService.recalculateBalance(entry.account_id);

              if (newBalance === null) {
                console.error("Error in balance recalculation: AccountBalanceService returned null");
                toast.warning("Entry deleted but account balance may not be accurate");
              } else {
                console.log(`Account balance recalculated successfully: ${newBalance}`);
              }
            } catch (error) {
              console.error("Error recalculating account balance:",
                error instanceof Error ? error.message : String(error));
              toast.warning("Entry deleted but account balance may not be accurate");
            }
          }
        } catch (balanceError) {
          console.error("Error updating account balance after expenditure deletion:", balanceError);
          toast.warning("Entry deleted but account balance may not be accurate");
          // Continue with the rest of the deletion process
        }
      }

      // Handle budget item update if this expenditure is linked to a budget item
      if (entry.budget_item_id) {
        try {
          console.log(`Expenditure entry ${entryId} is linked to budget item ${entry.budget_item_id}. Updating budget item...`);

          // First, check if the budget item exists
          const { data: budgetItemCheck, error: checkError } = await supabase
            .from("budget_items")
            .select("id")
            .eq("id", entry.budget_item_id)
            .maybeSingle();

          if (checkError) {
            console.error("Error checking budget item existence:", checkError);
            toast.warning("Budget item may not be updated correctly");
            // Continue with deletion even if we can't check for budget item
          } else if (!budgetItemCheck) {
            console.log(`Budget item ${entry.budget_item_id} no longer exists, no update needed`);
          } else {
            // Get the current budget item with full details
            const { data: budgetItem, error: fetchBudgetItemError } = await supabase
              .from("budget_items")
              .select("*")
              .eq("id", entry.budget_item_id)
              .single();

            if (fetchBudgetItemError) {
              console.error("Error fetching budget item:", fetchBudgetItemError);
              toast.warning("Budget item may not be updated correctly");
            } else if (budgetItem) {
              // Update the budget item's actual_amount by subtracting the deleted expenditure amount
              const newActualAmount = Math.max(0, (budgetItem.actual_amount || 0) - entry.amount);

              // Calculate the new variance
              const newVariance = (budgetItem.planned_amount || 0) - newActualAmount;

              console.log(`Updating budget item ${entry.budget_item_id}:`, {
                current: budgetItem.actual_amount,
                new: newActualAmount,
                variance: newVariance
              });

              try {
                // Update the budget item
                const { error: updateBudgetItemError } = await supabase
                  .from("budget_items")
                  .update({
                    actual_amount: newActualAmount,
                    variance: newVariance,
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", entry.budget_item_id);

                if (updateBudgetItemError) {
                  console.error("Error updating budget item:", updateBudgetItemError);
                  toast.warning("Budget item may not be updated correctly");
                } else {
                  console.log(`Budget item ${entry.budget_item_id} updated successfully. New actual amount: ${newActualAmount}`);

                  // Invalidate budget-related queries if we have a query client
                  if (queryClient) {
                    queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
                    queryClient.invalidateQueries({ queryKey: ["budgets"] });

                    // Force immediate refetch to ensure UI is updated
                    queryClient.refetchQueries({ queryKey: ["budgetItems"] });
                    queryClient.refetchQueries({ queryKey: ["budgets"] });
                  }
                }
              } catch (updateError) {
                console.error("Error during budget item update operation:", updateError);
                toast.warning("Budget item may not be updated correctly");
              }
            }
          }
        } catch (budgetItemError) {
          console.error("Error handling budget item update:", budgetItemError);
          toast.warning("Budget item may not be updated correctly");
          // Continue with the rest of the deletion process
        }
      }
    } else if (tableName === "account_transfers") {
      try {
        console.log(`Updating account balances for transfer deletion: Source ${entry.source_account_id}, Destination ${entry.destination_account_id}, Amount ${entry.amount}`);

        // For transfers, we need to update both source and destination accounts
        if (queryClient) {
          try {
            // Source account (like an expenditure)
            const sourceResult = await syncAccountBalance(
              entry.source_account_id,
              entry.amount,
              'delete',
              'transfer',
              queryClient
            );

            if (sourceResult === null) {
              console.warn("Source account balance sync returned null, falling back to direct recalculation");
              // Fall back to AccountBalanceService
              try {
                // Import AccountBalanceService dynamically to avoid circular dependencies
                const { AccountBalanceService } = await import("@/services/account-balance-service");

                // Use the service to recalculate the balance
                const newBalance = await AccountBalanceService.recalculateBalance(entry.source_account_id);

                if (newBalance === null) {
                  console.error("Error in source account balance recalculation: AccountBalanceService returned null");
                  toast.warning("Entry deleted but source account balance may not be accurate");
                } else {
                  console.log(`Source account balance recalculation successful, new balance: ${newBalance}`);
                }
              } catch (directRecalcError) {
                console.error("Exception in source account balance recalculation:",
                  directRecalcError instanceof Error ? directRecalcError.message : String(directRecalcError));
                toast.warning("Entry deleted but source account balance may not be accurate");
              }
            }

            // Destination account (like an income)
            const destResult = await syncAccountBalance(
              entry.destination_account_id,
              entry.amount,
              'delete',
              'transfer',
              queryClient
            );

            if (destResult === null) {
              console.warn("Destination account balance sync returned null, falling back to direct recalculation");
              // Fall back to AccountBalanceService
              try {
                // Import AccountBalanceService dynamically to avoid circular dependencies
                const { AccountBalanceService } = await import("@/services/account-balance-service");

                // Use the service to recalculate the balance
                const newBalance = await AccountBalanceService.recalculateBalance(entry.destination_account_id);

                if (newBalance === null) {
                  console.error("Error in destination account balance recalculation: AccountBalanceService returned null");
                  toast.warning("Entry deleted but destination account balance may not be accurate");
                } else {
                  console.log(`Destination account balance recalculation successful, new balance: ${newBalance}`);
                }
              } catch (directRecalcError) {
                console.error("Exception in destination account balance recalculation:",
                  directRecalcError instanceof Error ? directRecalcError.message : String(directRecalcError));
                toast.warning("Entry deleted but destination account balance may not be accurate");
              }
            }
          } catch (syncError) {
            console.error("Error in syncAccountBalance, falling back to direct recalculation:",
              syncError instanceof Error ? syncError.message : String(syncError));

            // Fall back to AccountBalanceService for both accounts
            try {
              // Import AccountBalanceService dynamically to avoid circular dependencies
              const { AccountBalanceService } = await import("@/services/account-balance-service");

              // Recalculate source account balance
              const sourceBalance = await AccountBalanceService.recalculateBalance(entry.source_account_id);

              if (sourceBalance === null) {
                console.error("Error in source account balance recalculation after sync error: AccountBalanceService returned null");
                toast.warning("Entry deleted but source account balance may not be accurate");
              } else {
                console.log(`Source account balance recalculation after sync error successful, new balance: ${sourceBalance}`);
              }

              // Recalculate destination account balance
              const destBalance = await AccountBalanceService.recalculateBalance(entry.destination_account_id);

              if (destBalance === null) {
                console.error("Error in destination account balance recalculation after sync error: AccountBalanceService returned null");
                toast.warning("Entry deleted but destination account balance may not be accurate");
              } else {
                console.log(`Destination account balance recalculation after sync error successful, new balance: ${destBalance}`);
              }
            } catch (recalcError) {
              console.error("Error in account balance recalculation:",
                recalcError instanceof Error ? recalcError.message : String(recalcError));
              toast.warning("Entry deleted but account balances may not be accurate");
            }
          }
        } else {
          // Use AccountBalanceService if no query client
          try {
            // Import AccountBalanceService dynamically to avoid circular dependencies
            const { AccountBalanceService } = await import("@/services/account-balance-service");

            // Recalculate source account balance
            const sourceBalance = await AccountBalanceService.recalculateBalance(entry.source_account_id);

            if (sourceBalance === null) {
              console.error("Error in source account balance recalculation: AccountBalanceService returned null");
              toast.warning("Source account balance may not be accurate");
            } else {
              console.log(`Source account balance recalculated successfully: ${sourceBalance}`);
            }

            // Recalculate destination account balance
            const destBalance = await AccountBalanceService.recalculateBalance(entry.destination_account_id);

            if (destBalance === null) {
              console.error("Error in destination account balance recalculation: AccountBalanceService returned null");
              toast.warning("Destination account balance may not be accurate");
            } else {
              console.log(`Destination account balance recalculated successfully: ${destBalance}`);
            }
          } catch (recalcError) {
            console.error("Error in account balance recalculation:",
              recalcError instanceof Error ? recalcError.message : String(recalcError));
            toast.warning("Entry deleted but account balances may not be accurate");
          }
        }
      } catch (balanceError) {
        console.error("Error updating account balances after transfer deletion:",
          balanceError instanceof Error ? balanceError.message : String(balanceError));
        toast.warning("Entry deleted but account balances may not be accurate");
        // Continue with the rest of the deletion process
      }
    } else if (tableName === "liability_entries") {
      // For liability entries, we don't need to update account balances directly
      // as they are updated through expenditure entries when payments are made
      console.log("Liability entry deletion - no direct account balance updates needed");
    }

    toast.success("Entry deleted successfully");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in deleteFinancialEntry:`, errorMessage);
    toast.error(`Failed to delete: ${errorMessage}`);
    return false;
  }
}
