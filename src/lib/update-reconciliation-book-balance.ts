import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

/**
 * Directly updates a reconciliation's book balance when a reconciliation adjustment is deleted
 *
 * @param reconciliationId The ID of the reconciliation to update
 * @param entryType The type of entry ('income_entries' or 'expenditure_entries')
 * @param amount The amount of the deleted entry
 * @param queryClient Optional QueryClient for invalidating queries
 * @returns A promise that resolves to true if successful, false otherwise
 */
export async function updateReconciliationBookBalanceAfterDeletion(
  reconciliationId: string,
  entryType: string,
  amount: number,
  queryClient?: QueryClient
): Promise<boolean> {
  try {
    console.log(`=== RECONCILIATION BOOK BALANCE UPDATE STARTED ===`);
    console.log(`Parameters received:`);
    console.log(`- Reconciliation ID: ${reconciliationId}`);
    console.log(`- Entry Type: ${entryType}`);
    console.log(`- Amount: ${amount}`);
    console.log(`- QueryClient provided: ${!!queryClient}`);

    // Validate parameters
    if (!reconciliationId) {
      console.error("ERROR: No reconciliation ID provided");
      toast.error("Failed to update reconciliation: Missing reconciliation ID");
      return false;
    }

    if (!amount || isNaN(amount)) {
      console.error(`ERROR: Invalid amount provided: ${amount}`);
      toast.error("Failed to update reconciliation: Invalid amount");
      return false;
    }

    // Get the current reconciliation data
    console.log(`Fetching current reconciliation data for ID: ${reconciliationId}`);
    const { data: reconciliation, error: fetchError } = await supabase
      .from("bank_reconciliations")
      .select("id, book_balance, bank_balance")
      .eq("id", reconciliationId)
      .single();

    if (fetchError) {
      console.error("ERROR: Failed to fetch reconciliation data:", fetchError);
      toast.error("Failed to update reconciliation: Could not fetch current data");
      return false;
    }

    if (!reconciliation) {
      console.error(`ERROR: No reconciliation found with ID: ${reconciliationId}`);
      toast.error("Failed to update reconciliation: Reconciliation not found");
      return false;
    }

    console.log(`Current reconciliation data:`);
    console.log(`- ID: ${reconciliation.id}`);
    console.log(`- Book Balance: ${reconciliation.book_balance}`);
    console.log(`- Bank Balance: ${reconciliation.bank_balance}`);
    console.log(`- Difference: ${reconciliation.bank_balance - reconciliation.book_balance}`);

    // Calculate the new book balance
    // CRITICAL: When we delete a reconciliation adjustment, we need to REVERSE its effect
    // - When we delete an income adjustment (which decreased book balance), we need to INCREASE book balance
    // - When we delete an expenditure adjustment (which increased book balance), we need to DECREASE book balance
    let newBookBalance = reconciliation.book_balance;

    if (entryType === "income_entries") {
      // When an income reconciliation adjustment is deleted, ADD its amount to book balance
      newBookBalance += amount;
      console.log(`CALCULATION: Income adjustment deleted`);
      console.log(`- Current Book Balance: ${reconciliation.book_balance}`);
      console.log(`- Amount to Add: ${amount}`);
      console.log(`- New Book Balance: ${newBookBalance}`);
    } else if (entryType === "expenditure_entries") {
      // When an expenditure reconciliation adjustment is deleted, SUBTRACT its amount from book balance
      newBookBalance -= amount;
      console.log(`CALCULATION: Expenditure adjustment deleted`);
      console.log(`- Current Book Balance: ${reconciliation.book_balance}`);
      console.log(`- Amount to Subtract: ${amount}`);
      console.log(`- New Book Balance: ${newBookBalance}`);
    } else {
      console.error(`ERROR: Unknown entry type: ${entryType}`);
      toast.error("Failed to update reconciliation: Unknown entry type");
      return false;
    }

    // Ensure the new book balance is a valid number
    if (isNaN(newBookBalance)) {
      console.error(`ERROR: Calculated book balance is not a number: ${newBookBalance}`);
      toast.error("Failed to update reconciliation: Invalid calculation result");
      return false;
    }

    console.log(`Updating reconciliation ${reconciliationId} with new book balance: ${newBookBalance}`);

    // Update the reconciliation with the new book balance
    const { data: updateData, error: updateError } = await supabase
      .from("bank_reconciliations")
      .update({
        book_balance: newBookBalance,
        updated_at: new Date().toISOString()
      })
      .eq("id", reconciliationId)
      .select();

    if (updateError) {
      console.error("ERROR: Failed to update reconciliation book balance:", updateError);
      toast.error("Failed to update reconciliation book balance");
      return false;
    }

    console.log(`UPDATE SUCCESSFUL: Reconciliation ${reconciliationId} book balance updated to ${newBookBalance}`);
    console.log(`Update response:`, updateData);
    toast.success("Reconciliation balance updated successfully");

    // Invalidate and refetch reconciliation queries
    if (queryClient) {
      console.log(`Invalidating and refetching queries...`);

      // Invalidate all possible query keys that might be related to reconciliations
      queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });

      // Force refetch
      queryClient.refetchQueries({ queryKey: ["bankReconciliations"] });
      queryClient.refetchQueries({ queryKey: ["reconciliation"] });
      queryClient.refetchQueries({ queryKey: ["reconciliations"] });

      console.log(`Queries invalidated and refetched`);
    } else {
      console.log(`No QueryClient provided, skipping query invalidation`);
    }

    console.log(`=== RECONCILIATION BOOK BALANCE UPDATE COMPLETED ===`);
    return true;
  } catch (error) {
    console.error("CRITICAL ERROR in updateReconciliationBookBalanceAfterDeletion:", error);
    toast.error("Failed to update reconciliation book balance");
    return false;
  }
}
