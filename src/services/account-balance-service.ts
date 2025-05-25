"use client";

import { supabase } from "@/lib/supabase";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Centralized service for managing account balances and transactions
 * This service provides a single source of truth for all account balance operations
 */
export class AccountBalanceService {
  /**
   * Recalculates an account's balance based on all transactions
   * @param accountId The ID of the account to recalculate
   * @returns The recalculated balance or null if an error occurred
   */
  static async recalculateBalance(accountId: string): Promise<number | null> {
    if (!accountId) {
      console.error("Cannot recalculate balance: accountId is null or undefined");
      return null;
    }

    try {
      console.log(`Recalculating balance for account ${accountId}...`);

      // First, manually calculate the balance from account_tx_table
      const { data: transactions, error: txError } = await supabase
        .from("account_tx_table")
        .select("amount")
        .eq("account_id", accountId);

      if (txError) {
        console.error(`Error fetching transactions for account ${accountId}:`, txError);
        return null;
      }

      // Calculate the new balance
      let newBalance = 0;

      if (transactions && transactions.length > 0) {
        newBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        console.log(`Calculated balance from ${transactions.length} transactions: ${newBalance}`);
      } else {
        console.log(`No transactions found for account ${accountId}`);
      }

      // Get the opening balance
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("opening_balance")
        .eq("id", accountId)
        .single();

      if (accountError) {
        console.error(`Error fetching opening balance for account ${accountId}:`, accountError);
      } else if (accountData && accountData.opening_balance) {
        newBalance += accountData.opening_balance;
        console.log(`Added opening balance ${accountData.opening_balance}, new total: ${newBalance}`);
      }

      // Update the account balance
      const { error: updateError } = await supabase
        .from("accounts")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", accountId);

      if (updateError) {
        console.error(`Error updating balance for account ${accountId}:`, updateError);
        return null;
      }

      console.log(`Successfully updated account ${accountId} balance to ${newBalance}`);
      return newBalance;
    } catch (error) {
      console.error(`Error in recalculateBalance for account ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Recalculates balances for all accounts
   * @returns Object mapping account IDs to their recalculated balances
   */
  static async recalculateAllBalances(): Promise<{ [accountId: string]: number | null }> {
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("id");

      if (accountsError) throw accountsError;

      const results: { [accountId: string]: number | null } = {};

      for (const account of accounts) {
        const balance = await this.recalculateBalance(account.id);
        results[account.id] = balance;
      }

      return results;
    } catch (error) {
      console.error("Error recalculating all account balances:", error);
      return {};
    }
  }

  /**
   * Ensures a transaction is recorded for a financial entry
   * @param accountId The account ID
   * @param amount The transaction amount
   * @param date The transaction date
   * @param description The transaction description
   * @param transactionType The type of transaction
   * @param referenceId The ID of the referenced entry
   * @param referenceType The type of the referenced entry
   * @returns True if successful, false otherwise
   */
  static async ensureTransaction(
    accountId: string,
    amount: number,
    date: string,
    description: string,
    transactionType: 'income' | 'expenditure' | 'transfer_in' | 'transfer_out',
    referenceId: string,
    referenceType: 'income_entry' | 'expenditure_entry' | 'account_transfer' | 'liability_entry'
  ): Promise<boolean> {
    try {
      // Check if transaction already exists
      const { data: existingTx, error: checkError } = await supabase
        .from("account_transactions")
        .select("id")
        .eq("account_id", accountId)
        .eq("reference_id", referenceId)
        .eq("reference_type", referenceType)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking for existing transaction:", checkError);
        return false;
      }

      // Adjust amount sign based on transaction type
      const adjustedAmount = transactionType === 'expenditure' || transactionType === 'transfer_out'
        ? -Math.abs(amount)
        : Math.abs(amount);

      if (existingTx) {
        // Update existing transaction
        const { error: updateError } = await supabase
          .from("account_transactions")
          .update({
            amount: adjustedAmount,
            date,
            description,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingTx.id);

        if (updateError) {
          console.error("Error updating transaction:", updateError);
          return false;
        }
      } else {
        // Create new transaction
        const { error: insertError } = await supabase
          .from("account_transactions")
          .insert({
            account_id: accountId,
            amount: adjustedAmount,
            date,
            description,
            transaction_type: transactionType,
            reference_id: referenceId,
            reference_type: referenceType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error("Error creating transaction:", insertError);
          return false;
        }
      }

      // Recalculate the account balance
      await this.recalculateBalance(accountId);

      return true;
    } catch (error) {
      console.error("Error in ensureTransaction:", error);
      return false;
    }
  }

  /**
   * Handles account transfers with transaction safety
   * @param sourceAccountId The source account ID
   * @param destinationAccountId The destination account ID
   * @param amount The transfer amount
   * @param date The transfer date
   * @param description The transfer description
   * @returns The transfer ID if successful, null otherwise
   */
  static async transferBetweenAccounts(
    sourceAccountId: string,
    destinationAccountId: string,
    amount: number,
    date: string,
    description: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc("transfer_between_accounts", {
          source_account_id: sourceAccountId,
          destination_account_id: destinationAccountId,
          transfer_amount: amount,
          transfer_date: date,
          transfer_description: description
        });

      if (error) {
        console.error("Error transferring between accounts:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in transferBetweenAccounts:", error);
      return null;
    }
  }

  /**
   * Invalidates all account-related queries
   * @param queryClient The React Query client
   * @param accountId Optional specific account ID to target
   */
  static invalidateQueries(queryClient: QueryClient, accountId?: string): void {
    console.log(`[AccountBalanceService] Invalidating account queries${accountId ? ` for account ${accountId}` : ''}`);

    // Use direct invalidation instead of importing to avoid circular dependencies

    // Invalidate accounts and dashboard data directly
    queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    queryClient.invalidateQueries({ queryKey: ['finance', 'dashboard'] });

    // If a specific account ID is provided, invalidate that account's specific queries
    if (accountId) {
      queryClient.invalidateQueries({
        queryKey: ['finance', 'accounts', 'detail', accountId]
      });

      queryClient.invalidateQueries({
        queryKey: ['finance', 'accounts', 'transactions', accountId]
      });
    }

    // Notify all subscribers that data has changed
    queryClient.getQueryCache().notify({
      type: 'queryUpdated',
      query: undefined,
      message: `Account data updated${accountId ? ` for account ${accountId}` : ''}`
    });
  }

  /**
   * Invalidates all finance-related queries
   * @param queryClient The React Query client
   * @param options Optional configuration to specify which query types to invalidate
   */
  static invalidateAllFinanceQueries(
    queryClient: QueryClient,
    options?: {
      accounts?: boolean;
      income?: boolean;
      expenditure?: boolean;
      liabilities?: boolean;
      dashboard?: boolean;
      budgets?: boolean;
      reconciliation?: boolean;
      all?: boolean;
    }
  ): void {
    // Log the invalidation for debugging
    console.log("[AccountBalanceService] Invalidating finance queries with options:", options || "all");

    try {
      // Invalidate legacy query keys first (for backward compatibility)
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["financialData"] });

      // Directly invalidate queries based on options
      if (options?.all || !options) {
        // Invalidate all finance queries
        queryClient.invalidateQueries({ queryKey: ['finance'] });
      } else {
        // Selectively invalidate only what's needed
        if (options.accounts) queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
        if (options.income) queryClient.invalidateQueries({ queryKey: ['finance', 'income'] });
        if (options.expenditure) queryClient.invalidateQueries({ queryKey: ['finance', 'expenditure'] });
        if (options.liabilities) queryClient.invalidateQueries({ queryKey: ['finance', 'liabilities'] });
        if (options.dashboard) queryClient.invalidateQueries({ queryKey: ['finance', 'dashboard'] });
        if (options.budgets) queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] });
        if (options.reconciliation) queryClient.invalidateQueries({ queryKey: ['finance', 'reconciliation'] });
      }

      // Always invalidate reconciliation queries regardless of options
      // This ensures reconciliation data is always up-to-date
      queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "reconciliation"] });

      // Force immediate refetch of critical data
      queryClient.refetchQueries({ queryKey: ["accounts"] });
      queryClient.refetchQueries({ queryKey: ["accountTransactions"] });
      queryClient.refetchQueries({ queryKey: ["incomeEntries"] });
      queryClient.refetchQueries({ queryKey: ["expenditureEntries"] });

      // Always refetch reconciliation data
      queryClient.refetchQueries({ queryKey: ["bankReconciliations"] });
      queryClient.refetchQueries({ queryKey: ["reconciliation"] });
      queryClient.refetchQueries({ queryKey: ["reconciliations"] });
      queryClient.refetchQueries({ queryKey: ["finance", "reconciliation"] });

      // Also refetch new query structure
      queryClient.refetchQueries({ queryKey: ['finance', 'accounts'] });

      // Notify all subscribers that data has changed with a detailed message
      queryClient.getQueryCache().notify({
        type: 'queryUpdated',
        query: undefined,
        message: 'Financial data has been updated'
      });
    } catch (error) {
      console.error("[AccountBalanceService] Error invalidating finance queries:", error);
    }
  }
}
