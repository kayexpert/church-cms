import { supabase } from "@/lib/supabase";
import { AccountBalanceService } from "@/services/account-balance-service";

/**
 * Ensures that an expenditure entry is properly recorded in the account_tx_table
 * This is particularly useful for fixing issues with expenditure entries not showing in accounts
 *
 * @param expenditureEntryId The ID of the expenditure entry to sync
 * @returns Promise that resolves when the sync is complete
 */
export async function syncExpenditureEntryWithAccountTransactions(expenditureEntryId: string): Promise<void> {
  try {
    // First, get the expenditure entry details
    const { data: expenditureEntry, error: fetchError } = await supabase
      .from("expenditure_entries")
      .select("*")
      .eq("id", expenditureEntryId)
      .single();

    if (fetchError) {
      console.error("Error fetching expenditure entry:", fetchError);
      return;
    }

    // If no account is associated, there's nothing to do
    if (!expenditureEntry.account_id) {
      console.log("Expenditure entry has no account, skipping transaction sync");
      return;
    }

    console.log("Syncing expenditure entry with account transactions:", {
      expenditureEntryId,
      accountId: expenditureEntry.account_id,
      amount: expenditureEntry.amount,
      date: expenditureEntry.date,
      description: expenditureEntry.description
    });

    // Check if a transaction already exists for this expenditure entry
    const { data: existingTransactions, error: checkError } = await supabase
      .from("account_tx_table")
      .select("*")
      .eq("reference_id", expenditureEntryId)
      .eq("reference_type", "expenditure_entry");

    if (checkError) {
      console.error("Error checking for existing transactions:", checkError);
      return;
    }

    // If a transaction already exists, update it
    if (existingTransactions && existingTransactions.length > 0) {
      console.log("Transaction exists for this expenditure entry, updating it");

      const { error: updateError } = await supabase
        .from("account_tx_table")
        .update({
          account_id: expenditureEntry.account_id,
          date: expenditureEntry.date,
          amount: -expenditureEntry.amount, // Negative for expenditures
          description: expenditureEntry.description || "Expenditure entry",
          updated_at: new Date().toISOString()
        })
        .eq("id", existingTransactions[0].id);

      if (updateError) {
        console.error("Error updating account transaction:", updateError);
        return;
      }
    } else {
      // Create a new account transaction
      const transactionData = {
        account_id: expenditureEntry.account_id,
        date: expenditureEntry.date,
        amount: -expenditureEntry.amount, // Negative for expenditure
        description: expenditureEntry.description || "Expenditure entry",
        transaction_type: "expenditure",
        reference_id: expenditureEntryId,
        reference_type: "expenditure_entry",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("Creating account transaction:", transactionData);

      const { error: insertError } = await supabase
        .from("account_tx_table")
        .insert(transactionData);

      if (insertError) {
        console.error("Error creating account transaction:", insertError);
        return;
      }
    }

    // Recalculate the account balance using the AccountBalanceService
    try {
      // Use the centralized service to recalculate the balance
      const newBalance = await AccountBalanceService.recalculateBalance(expenditureEntry.account_id);

      if (newBalance !== null) {
        console.log(`Updated balance for account ${expenditureEntry.account_id} to ${newBalance}`);
      } else {
        console.error(`Failed to recalculate balance for account ${expenditureEntry.account_id}`);

        // Fallback to RPC method if the service fails
        try {
          const { data: rpcBalance, error: recalcError } = await supabase
            .rpc("recalculate_account_balance", { account_id: expenditureEntry.account_id });

          if (recalcError) {
            console.error("Error recalculating account balance with RPC:", recalcError);
          } else {
            console.log(`Updated balance for account ${expenditureEntry.account_id} to ${rpcBalance} using RPC fallback`);
          }
        } catch (rpcError) {
          console.error("Error in RPC fallback:", rpcError);
        }
      }
    } catch (balanceError) {
      console.error("Error updating account balance:", balanceError);
    }

    console.log("Successfully synced account transaction for expenditure entry");
  } catch (error) {
    console.error("Error in syncExpenditureEntryWithAccountTransactions:", error);
  }
}

/**
 * Syncs all expenditure entries for a specific account
 *
 * @param accountId The ID of the account to sync expenditure entries for
 * @returns Promise that resolves when the sync is complete
 */
export async function syncAllExpenditureEntriesForAccount(accountId: string): Promise<void> {
  try {
    // Get all expenditure entries for this account
    const { data: expenditureEntries, error: fetchError } = await supabase
      .from("expenditure_entries")
      .select("id")
      .eq("account_id", accountId);

    if (fetchError) {
      console.error("Error fetching expenditure entries:", fetchError);
      return;
    }

    console.log(`Found ${expenditureEntries?.length || 0} expenditure entries for account ${accountId}`);

    // Sync each expenditure entry
    if (expenditureEntries && expenditureEntries.length > 0) {
      for (const entry of expenditureEntries) {
        await syncExpenditureEntryWithAccountTransactions(entry.id);
      }
    }

    // Recalculate the account balance using the AccountBalanceService
    try {
      // Use the centralized service to recalculate the balance
      const newBalance = await AccountBalanceService.recalculateBalance(accountId);

      if (newBalance !== null) {
        console.log(`Final balance for account ${accountId} is ${newBalance}`);
      } else {
        console.error(`Failed to recalculate final balance for account ${accountId}`);

        // Fallback to RPC method if the service fails
        try {
          const { data: rpcBalance, error: recalcError } = await supabase
            .rpc("recalculate_account_balance", { account_id: accountId });

          if (recalcError) {
            console.error("Error recalculating account balance with RPC:", recalcError);
          } else {
            console.log(`Final balance for account ${accountId} is ${rpcBalance} using RPC fallback`);
          }
        } catch (rpcError) {
          console.error("Error in RPC fallback:", rpcError);
        }
      }
    } catch (balanceError) {
      console.error("Error updating account balance:", balanceError);
    }
  } catch (error) {
    console.error("Error in syncAllExpenditureEntriesForAccount:", error);
  }
}
