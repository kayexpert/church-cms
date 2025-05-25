"use client";

import { supabase } from "@/lib/supabase";
import { AccountTransaction } from "@/types/finance";

/**
 * Utility functions for working with account transactions
 * This centralizes all access to account transactions to avoid inconsistencies
 * between account_transactions and account_tx_table
 */

/**
 * Get transactions for an account
 * @param accountId The account ID
 * @param options Query options
 * @returns Promise with the transactions or error
 */
export async function getAccountTransactions(
  accountId: string,
  options: {
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{ data: AccountTransaction[] | null; error: any }> {
  const {
    limit = 100,
    orderBy = 'date',
    orderDirection = 'desc',
    startDate,
    endDate,
  } = options;

  try {
    console.log(`Fetching transactions for account ${accountId}`);

    // First try to get transactions from the account_tx_table
    let query = supabase
      .from("account_tx_table")
      .select("*")
      .eq("account_id", accountId)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(limit);

    // Add date filters if provided
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching from account_tx_table:", error);

      // Fall back to the account_transactions table
      let fallbackQuery = supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", accountId)
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .limit(limit);

      // Add date filters if provided
      if (startDate) {
        fallbackQuery = fallbackQuery.gte("date", startDate);
      }
      if (endDate) {
        fallbackQuery = fallbackQuery.lte("date", endDate);
      }

      const fallbackResult = await fallbackQuery;

      if (fallbackResult.error) {
        console.error("Error fetching from account_transactions:", fallbackResult.error);
        return { data: null, error: fallbackResult.error };
      }

      return { data: fallbackResult.data, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in getAccountTransactions:", error);
    return { data: null, error };
  }
}

/**
 * Create a new account transaction
 * @param transaction The transaction data to create
 * @returns Promise with the created transaction or error
 */
export async function createAccountTransaction(
  transaction: Omit<AccountTransaction, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: AccountTransaction | null; error: any }> {
  try {
    console.log("Creating account transaction:", transaction);

    // Add timestamps
    const transactionWithTimestamps = {
      ...transaction,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into account_tx_table
    const { data, error } = await supabase
      .from("account_tx_table")
      .insert(transactionWithTimestamps)
      .select()
      .single();

    if (error) {
      console.error("Error creating transaction in account_tx_table:", error);
      return { data: null, error };
    }

    // Also insert into account_transactions for backward compatibility
    const { error: backwardError } = await supabase
      .from("account_transactions")
      .insert(transactionWithTimestamps);

    if (backwardError) {
      console.error("Error creating transaction in account_transactions:", backwardError);
      // We don't return an error here because the transaction was successfully created in account_tx_table
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in createAccountTransaction:", error);
    return { data: null, error };
  }
}

/**
 * Update an existing account transaction
 * @param id The transaction ID
 * @param transaction The transaction data to update
 * @returns Promise with the updated transaction or error
 */
export async function updateAccountTransaction(
  id: string,
  transaction: Partial<Omit<AccountTransaction, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: AccountTransaction | null; error: any }> {
  try {
    console.log(`Updating account transaction ${id}:`, transaction);

    // Add updated_at timestamp
    const transactionWithTimestamp = {
      ...transaction,
      updated_at: new Date().toISOString()
    };

    // Update in account_tx_table
    const { data, error } = await supabase
      .from("account_tx_table")
      .update(transactionWithTimestamp)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating transaction in account_tx_table:", error);
      return { data: null, error };
    }

    // Also update in account_transactions for backward compatibility
    const { error: backwardError } = await supabase
      .from("account_transactions")
      .update(transactionWithTimestamp)
      .eq("id", id);

    if (backwardError) {
      console.error("Error updating transaction in account_transactions:", backwardError);
      // We don't return an error here because the transaction was successfully updated in account_tx_table
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in updateAccountTransaction:", error);
    return { data: null, error };
  }
}

/**
 * Delete an account transaction
 * @param id The transaction ID
 * @returns Promise with success status or error
 */
export async function deleteAccountTransaction(
  id: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log(`Deleting account transaction ${id}`);

    // Delete from account_tx_table
    const { error } = await supabase
      .from("account_tx_table")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting transaction from account_tx_table:", error);
      return { success: false, error };
    }

    // Also delete from account_transactions for backward compatibility
    const { error: backwardError } = await supabase
      .from("account_transactions")
      .delete()
      .eq("id", id);

    if (backwardError) {
      console.error("Error deleting transaction from account_transactions:", backwardError);
      // We don't return an error here because the transaction was successfully deleted from account_tx_table
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Exception in deleteAccountTransaction:", error);
    return { success: false, error };
  }
}
