"use client";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

/**
 * Comprehensive utility for synchronizing account balances and transactions
 * This centralizes all account balance update logic to ensure consistency
 */

/**
 * Updates an account balance and ensures all related data is synchronized
 *
 * @param accountId The ID of the account to update
 * @param amount The amount to add (positive) or subtract (negative) from the account balance
 * @param operation The operation being performed (create, update, delete)
 * @param entryType The type of entry (income, expenditure, transfer)
 * @param queryClient The React Query client for cache invalidation
 * @param oldAmount The previous amount (for update operations)
 * @returns The updated account balance or null if an error occurred
 */
export async function syncAccountBalance(
  accountId: string | null,
  amount: number,
  operation: 'create' | 'update' | 'delete',
  entryType: 'income' | 'expenditure' | 'transfer',
  queryClient: QueryClient,
  oldAmount: number = 0
): Promise<number | null> {
  if (!accountId) {
    console.warn("syncAccountBalance called with null accountId");
    return null;
  }

  try {
    console.log(`Syncing account balance for ${accountId}:`, { amount, operation, entryType, oldAmount });

    // Check if the account exists first
    try {
      const { data: accountCheck, error: checkError } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", accountId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking account existence:", checkError);
        // Continue with recalculation even if we can't check for account
      } else if (!accountCheck) {
        console.warn(`Account ${accountId} no longer exists, skipping balance recalculation`);
        return null;
      }
    } catch (checkError) {
      console.error("Error during account existence check:", checkError);
      // Continue with recalculation even if the check fails
    }

    // Use manual account balance calculation
    try {
      console.log("Using manual account balance calculation");

      // Use account_tx_table instead of account_transactions
      const { data: transactions, error: txError } = await supabase
        .from("account_tx_table")
        .select("amount")
        .eq("account_id", accountId);

      if (txError) {
        console.error("Error fetching account transactions:",
          txError.message || JSON.stringify(txError));
        return null;
      }

      // Calculate balance from transactions
      let calculatedBalance = 0;
      if (transactions && transactions.length > 0) {
        calculatedBalance = transactions.reduce(
          (sum, tx) => sum + (typeof tx.amount === 'number' ? tx.amount : 0),
          0
        );
      }

      // Get opening balance
      const { data: account, error: acctError } = await supabase
        .from("accounts")
        .select("opening_balance")
        .eq("id", accountId)
        .maybeSingle();

      if (acctError) {
        console.error("Error fetching account opening balance:",
          acctError.message || JSON.stringify(acctError));
      } else if (account && account.opening_balance) {
        calculatedBalance += account.opening_balance;
      }

      console.log(`Manually calculated balance for account ${accountId}: ${calculatedBalance}`);

      // Update the account balance directly
      const { error: updateError } = await supabase
        .from("accounts")
        .update({
          balance: calculatedBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", accountId);

      if (updateError) {
        console.error("Error updating account balance:",
          updateError.message || JSON.stringify(updateError));
        return null;
      }

      // Invalidate all relevant queries to ensure UI is updated
      try {
        invalidateAccountQueries(queryClient, accountId);
      } catch (invalidateError) {
        console.error("Error invalidating account queries:",
          invalidateError instanceof Error ? invalidateError.message : String(invalidateError));
        // Continue even if query invalidation fails
      }

      return calculatedBalance;
    } catch (calcError) {
      console.error("Error during account balance calculation:",
        calcError instanceof Error ? calcError.message : String(calcError));
      return null;
    }
  } catch (error) {
    console.error("Error in syncAccountBalance:",
      error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Ensures that an account transaction is properly recorded
 *
 * @param accountId The ID of the account
 * @param amount The transaction amount
 * @param date The transaction date
 * @param description The transaction description
 * @param transactionType The type of transaction (income, expenditure, transfer_in, transfer_out)
 * @param referenceId The ID of the reference entry
 * @param referenceType The type of reference (income_entry, expenditure_entry, account_transfer)
 * @returns True if successful, false otherwise
 */
export async function ensureAccountTransaction(
  accountId: string,
  amount: number,
  date: string,
  description: string,
  transactionType: 'income' | 'expenditure' | 'transfer_in' | 'transfer_out',
  referenceId: string,
  referenceType: 'income_entry' | 'expenditure_entry' | 'account_transfer'
): Promise<boolean> {
  try {
    // Check if transaction already exists
    const { data: existingTx, error: checkError } = await supabase
      .from("account_tx_table")
      .select("id")
      .eq("account_id", accountId)
      .eq("reference_id", referenceId)
      .eq("reference_type", referenceType)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing transaction:", checkError);
      return false;
    }

    // If transaction exists, update it
    if (existingTx) {
      const { error: updateError } = await supabase
        .from("account_tx_table")
        .update({
          amount: transactionType === 'expenditure' || transactionType === 'transfer_out' ? -Math.abs(amount) : amount,
          date,
          description,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingTx.id);

      if (updateError) {
        console.error("Error updating account transaction:", updateError);
        return false;
      }
    } else {
      // Otherwise, create a new transaction
      const { error: insertError } = await supabase
        .from("account_tx_table")
        .insert({
          account_id: accountId,
          amount: transactionType === 'expenditure' || transactionType === 'transfer_out' ? -Math.abs(amount) : amount,
          date,
          description,
          transaction_type: transactionType,
          reference_id: referenceId,
          reference_type: referenceType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Error creating account transaction:", insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in ensureAccountTransaction:", error);
    return false;
  }
}

/**
 * Invalidates all account-related queries to ensure UI is updated
 *
 * @param queryClient The React Query client
 * @param accountId Optional specific account ID to target
 */
export function invalidateAccountQueries(queryClient: QueryClient, accountId?: string): void {
  console.log(`Invalidating account queries${accountId ? ` for account ${accountId}` : ''}`);

  // Invalidate general account queries
  queryClient.invalidateQueries({ queryKey: ["accounts"] });

  // Invalidate specific account query if provided
  if (accountId) {
    // Invalidate the specific account
    queryClient.invalidateQueries({ queryKey: ["account", accountId] });

    // Invalidate specific account transactions
    queryClient.invalidateQueries({ queryKey: ["accountTransactions", accountId] });

    // Invalidate any income entries related to this account
    queryClient.invalidateQueries({
      queryKey: ["incomeEntries"],
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[];
        if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
          const filters = queryKey[1] as Record<string, any>;
          return filters.account_id === accountId;
        }
        return false;
      }
    });

    // Invalidate any expenditure entries related to this account
    queryClient.invalidateQueries({
      queryKey: ["expenditureEntries"],
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[];
        if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
          const filters = queryKey[1] as Record<string, any>;
          return filters.account_id === accountId;
        }
        return false;
      }
    });

    // Invalidate any transfers related to this account
    queryClient.invalidateQueries({
      queryKey: ["accountTransfers"],
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[];
        return queryKey.includes(accountId);
      }
    });
  } else {
    // If no specific account, invalidate all financial data
    queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });
    queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
    queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
    queryClient.invalidateQueries({ queryKey: ["accountTransfers"] });
    queryClient.invalidateQueries({ queryKey: ["financialData"] });
  }

  // Force immediate refetch of accounts to ensure latest data
  queryClient.refetchQueries({ queryKey: ["accounts"] });

  // Force immediate refetch of account transactions if specific account provided
  if (accountId) {
    console.log(`Forcing refetch of transactions for account ${accountId}`);
    queryClient.refetchQueries({ queryKey: ["accountTransactions", accountId] });

    // Also notify all subscribers that data has changed
    queryClient.getQueryCache().notify({ type: 'queryUpdated', query: undefined });
  }
}
