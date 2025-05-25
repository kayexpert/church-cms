import { supabase } from "@/lib/supabase";

/**
 * Updates an account balance when an income or expenditure entry is created, updated, or deleted
 * 
 * @param accountId The ID of the account to update
 * @param amount The amount to add (positive) or subtract (negative) from the account balance
 * @param operation The operation being performed (create, update, delete)
 * @param entryType The type of entry (income or expenditure)
 * @param oldAmount The previous amount (for update operations)
 * @returns The updated account balance or null if an error occurred
 */
export async function updateAccountBalance(
  accountId: string | null,
  amount: number,
  operation: 'create' | 'update' | 'delete',
  entryType: 'income' | 'expenditure',
  oldAmount: number = 0
): Promise<number | null> {
  // If no account ID is provided, there's nothing to update
  if (!accountId) {
    return null;
  }

  try {
    // Get the current account balance
    const { data: account, error: fetchError } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", accountId)
      .single();

    if (fetchError) {
      console.error("Error fetching account balance:", fetchError);
      return null;
    }

    let newBalance = account.balance || 0;

    // Calculate the new balance based on the operation and entry type
    switch (operation) {
      case 'create':
        // For income, add the amount; for expenditure, subtract it
        newBalance += entryType === 'income' ? amount : -amount;
        break;
      
      case 'update':
        // For updates, we need to reverse the old amount and apply the new amount
        if (entryType === 'income') {
          newBalance = newBalance - oldAmount + amount;
        } else {
          newBalance = newBalance + oldAmount - amount;
        }
        break;
      
      case 'delete':
        // For deletions, reverse the effect of the entry
        newBalance += entryType === 'income' ? -amount : amount;
        break;
    }

    // Update the account balance
    const { data: updatedAccount, error: updateError } = await supabase
      .from("accounts")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .select("balance")
      .single();

    if (updateError) {
      console.error("Error updating account balance:", updateError);
      return null;
    }

    return updatedAccount.balance;
  } catch (error) {
    console.error("Error in updateAccountBalance:", error);
    return null;
  }
}

/**
 * Recalculates an account's balance based on all its transactions
 * 
 * @param accountId The ID of the account to recalculate
 * @returns The recalculated account balance or null if an error occurred
 */
export async function recalculateAccountBalance(accountId: string): Promise<number | null> {
  if (!accountId) {
    return null;
  }

  try {
    // Call the database function to recalculate the balance
    const { data, error } = await supabase
      .rpc("recalculate_account_balance", { account_id: accountId });

    if (error) {
      console.error("Error recalculating account balance:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in recalculateAccountBalance:", error);
    return null;
  }
}
