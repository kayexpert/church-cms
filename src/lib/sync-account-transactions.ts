import { supabase } from "@/lib/supabase";
import { AccountBalanceService } from "@/services/account-balance-service";

/**
 * Ensures that an income entry is properly recorded in the account_transactions table
 * This is particularly important for loan income entries
 *
 * @param incomeEntryId The ID of the income entry to sync
 * @returns Promise that resolves when the sync is complete
 */
export async function syncIncomeEntryWithAccountTransactions(incomeEntryId: string): Promise<void> {
  try {
    // First, get the income entry details
    const { data: incomeEntry, error: fetchError } = await supabase
      .from("income_entries")
      .select("*")
      .eq("id", incomeEntryId)
      .single();

    if (fetchError) {
      console.error("Error fetching income entry:", fetchError);
      return;
    }

    // If no account is associated, there's nothing to do
    if (!incomeEntry.account_id) {
      console.log("Income entry has no account, skipping transaction sync");
      return;
    }

    console.log("Syncing income entry with account transactions:", {
      incomeEntryId,
      accountId: incomeEntry.account_id,
      amount: incomeEntry.amount,
      date: incomeEntry.date,
      description: incomeEntry.description
    });

    // Check if a transaction already exists for this income entry
    const { data: existingTransactions, error: checkError } = await supabase
      .from("account_tx_table")
      .select("*")
      .eq("reference_id", incomeEntryId)
      .eq("reference_type", "income_entry");

    if (checkError) {
      console.error("Error checking for existing transactions:", checkError);
      return;
    }

    // If a transaction already exists, we don't need to create a new one
    if (existingTransactions && existingTransactions.length > 0) {
      console.log("Transaction already exists for this income entry");
      return;
    }

    // Create a new account transaction
    const transactionData = {
      account_id: incomeEntry.account_id,
      date: incomeEntry.date,
      amount: incomeEntry.amount,
      description: incomeEntry.description || "Income entry",
      transaction_type: "income",
      reference_id: incomeEntryId,
      reference_type: "income_entry",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("Creating account transaction:", transactionData);

    const { error: insertError } = await supabase
      .from("account_tx_table")
      .insert(transactionData);

    // Also update the account balance
    if (!insertError) {
      try {
        await supabase
          .from("accounts")
          .update({
            balance: supabase.rpc('calculate_new_balance', {
              account_id: incomeEntry.account_id,
              amount: incomeEntry.amount,
              is_income: true
            }),
            updated_at: new Date().toISOString()
          })
          .eq("id", incomeEntry.account_id);

        console.log(`Updated balance for account ${incomeEntry.account_id}`);
      } catch (balanceError) {
        console.error("Error updating account balance:", balanceError);
      }
    }

    if (insertError) {
      console.error("Error creating account transaction:", insertError);
      return;
    }

    console.log("Successfully created account transaction for income entry");
  } catch (error) {
    console.error("Error in syncIncomeEntryWithAccountTransactions:", error);
  }
}

/**
 * Ensures that an expenditure entry is properly recorded in the account_transactions table
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

    // If a transaction already exists, we don't need to create a new one
    if (existingTransactions && existingTransactions.length > 0) {
      console.log("Transaction already exists for this expenditure entry");
      return;
    }

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

    const { error: insertError } = await supabase
      .from("account_tx_table")
      .insert(transactionData);

    // Also update the account balance
    if (!insertError) {
      try {
        await supabase
          .from("accounts")
          .update({
            balance: supabase.rpc('calculate_new_balance', {
              account_id: expenditureEntry.account_id,
              amount: expenditureEntry.amount,
              is_income: false
            }),
            updated_at: new Date().toISOString()
          })
          .eq("id", expenditureEntry.account_id);

        console.log(`Updated balance for account ${expenditureEntry.account_id}`);
      } catch (balanceError) {
        console.error("Error updating account balance:", balanceError);
      }
    }

    if (insertError) {
      console.error("Error creating account transaction:", insertError);
      return;
    }

    console.log("Successfully created account transaction for expenditure entry");
  } catch (error) {
    console.error("Error in syncExpenditureEntryWithAccountTransactions:", error);
  }
}

/**
 * Syncs all income entries for a specific account
 *
 * @param accountId The ID of the account to sync income entries for
 * @returns Promise that resolves when the sync is complete
 */
export async function syncAllIncomeEntriesForAccount(accountId: string): Promise<void> {
  try {
    console.log(`Syncing all income entries for account ${accountId}`);

    // Get all income entries for this account
    const { data: incomeEntries, error: fetchError } = await supabase
      .from("income_entries")
      .select("id")
      .eq("account_id", accountId);

    if (fetchError) {
      console.error("Error fetching income entries:", fetchError);
      return;
    }

    console.log(`Found ${incomeEntries?.length || 0} income entries for account ${accountId}`);

    // Sync each income entry
    if (incomeEntries && incomeEntries.length > 0) {
      for (const entry of incomeEntries) {
        await syncIncomeEntryWithAccountTransactions(entry.id);
      }
    }

    // Recalculate the account balance
    try {
      const newBalance = await AccountBalanceService.recalculateBalance(accountId);
      console.log(`Final balance for account ${accountId} is ${newBalance}`);
    } catch (balanceError) {
      console.error("Error updating account balance:", balanceError);
    }
  } catch (error) {
    console.error("Error in syncAllIncomeEntriesForAccount:", error);
  }
}

/**
 * Syncs all transactions (income and expenditure) for a specific account
 *
 * @param accountId The ID of the account to sync all transactions for
 * @returns Promise that resolves when the sync is complete
 */
export async function syncAllTransactionsForAccount(accountId: string): Promise<void> {
  try {
    console.log(`Syncing all transactions for account ${accountId}`);

    // First sync all income entries
    await syncAllIncomeEntriesForAccount(accountId);

    // Then sync all expenditure entries
    await syncAllExpenditureEntriesForAccount(accountId);

    // Recalculate the account balance
    try {
      const newBalance = await AccountBalanceService.recalculateBalance(accountId);
      console.log(`Final balance after syncing all transactions for account ${accountId} is ${newBalance}`);
    } catch (balanceError) {
      console.error("Error updating account balance:", balanceError);
    }
  } catch (error) {
    console.error("Error in syncAllTransactionsForAccount:", error);
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
    console.log(`Syncing all expenditure entries for account ${accountId}`);

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

    // Recalculate the account balance
    try {
      const newBalance = await AccountBalanceService.recalculateBalance(accountId);
      console.log(`Final balance for account ${accountId} is ${newBalance}`);
    } catch (balanceError) {
      console.error("Error updating account balance:", balanceError);
    }
  } catch (error) {
    console.error("Error in syncAllExpenditureEntriesForAccount:", error);
  }
}
