"use client";

import { supabase } from "@/lib/supabase";
import { AccountBalanceService } from "./account-balance-service";
import { ErrorTracker } from "@/lib/error-tracking";
// Performance monitoring removed

/**
 * Service for processing batches of financial operations
 * This service helps prevent timeouts and improves performance for large operations
 */
export class BatchProcessingService {
  /**
   * Process a batch of transactions in chunks to avoid timeouts
   * @param transactions Array of transactions to process
   * @param chunkSize Size of each processing chunk
   * @returns Result of the batch processing
   */
  static async processBatchTransactions(
    transactions: Array<{
      accountId: string;
      amount: number;
      date: string;
      description: string;
      transactionType: 'income' | 'expenditure' | 'transfer_in' | 'transfer_out';
      referenceId: string;
      referenceType: 'income_entry' | 'expenditure_entry' | 'account_transfer' | 'liability_entry';
    }>,
    chunkSize = 50
  ): Promise<{ success: boolean; processedCount: number; failedCount: number }> {
    try {
      console.log(`Processing batch of ${transactions.length} transactions in chunks of ${chunkSize}`);
      const startTime = performance.now();

      let processedCount = 0;
      let failedCount = 0;

      // Process in chunks
      for (let i = 0; i < transactions.length; i += chunkSize) {
        const chunk = transactions.slice(i, i + chunkSize);

        // Process each transaction in the chunk
        const results = await Promise.allSettled(
          chunk.map(tx =>
            AccountBalanceService.ensureTransaction(
              tx.accountId,
              tx.amount,
              tx.date,
              tx.description,
              tx.transactionType,
              tx.referenceId,
              tx.referenceType
            )
          )
        );

        // Count successes and failures
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            processedCount++;
          } else {
            failedCount++;

            // Log the error if it's a rejection
            if (result.status === 'rejected') {
              ErrorTracker.logError({
                operation: 'processBatchTransactions',
                component: 'BatchProcessingService',
                error: result.reason,
                context: { chunk }
              });
            }
          }
        });
      }

      // Recalculate all account balances after batch processing
      const affectedAccountIds = [...new Set(transactions.map(tx => tx.accountId))];
      for (const accountId of affectedAccountIds) {
        await AccountBalanceService.recalculateBalance(accountId);
      }

      const duration = performance.now() - startTime;
      console.log(`Batch processing completed in ${duration.toFixed(2)}ms: ${processedCount} processed, ${failedCount} failed`);

      return {
        success: failedCount === 0,
        processedCount,
        failedCount
      };
    } catch (error) {
      console.error('Error in batch processing:', error);
      ErrorTracker.logError({
        operation: 'processBatchTransactions',
        component: 'BatchProcessingService',
        error,
        context: { transactionCount: transactions.length, chunkSize }
      });
      return {
        success: false,
        processedCount: 0,
        failedCount: transactions.length
      };
    }
  }

  /**
   * Synchronize all income entries with account transactions
   * @returns Result of the synchronization
   */
  static async synchronizeAllIncomeEntries(): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    accountsUpdated: string[];
  }> {
    try {
      console.log('Starting synchronization of all income entries');
      const startTime = performance.now();

      let processedCount = 0;
      let failedCount = 0;
      const accountsUpdated: string[] = [];

      // Get all income entries with accounts
      const { data: incomeEntries, error } = await supabase
        .from("income_entries")
        .select("id, account_id, amount, date, description")
        .not("account_id", "is", null);

      if (error) {
        throw error;
      }

      if (!incomeEntries || incomeEntries.length === 0) {
        console.log('No income entries with accounts found');
        return { success: true, processedCount: 0, failedCount: 0, accountsUpdated: [] };
      }

      console.log(`Found ${incomeEntries.length} income entries with accounts`);

      // Convert to transaction format
      const transactions = incomeEntries.map(entry => ({
        accountId: entry.account_id,
        amount: entry.amount,
        date: entry.date,
        description: entry.description || "Income entry",
        transactionType: 'income' as const,
        referenceId: entry.id,
        referenceType: 'income_entry' as const
      }));

      // Process in batches
      const result = await this.processBatchTransactions(transactions);

      // Collect unique account IDs
      const uniqueAccountIds = [...new Set(incomeEntries.map(entry => entry.account_id))];

      // Recalculate balances for all affected accounts
      for (const accountId of uniqueAccountIds) {
        await AccountBalanceService.recalculateBalance(accountId);
        accountsUpdated.push(accountId);
      }

      const duration = performance.now() - startTime;
      console.log(`Income entries synchronization completed in ${duration.toFixed(2)}ms: ${result.processedCount} processed, ${result.failedCount} failed`);

      return {
        success: result.success,
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        accountsUpdated
      };
    } catch (error) {
      console.error('Error synchronizing income entries:', error);
      ErrorTracker.logError({
        operation: 'synchronizeAllIncomeEntries',
        component: 'BatchProcessingService',
        error
      });

      return {
        success: false,
        processedCount: 0,
        failedCount: 1,
        accountsUpdated: []
      };
    }
  }

  /**
   * Synchronize all expenditure entries with account transactions
   * @returns Result of the synchronization
   */
  static async synchronizeAllExpenditureEntries(): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    accountsUpdated: string[];
  }> {
    try {
      console.log('Starting synchronization of all expenditure entries');
      const startTime = performance.now();

      let processedCount = 0;
      let failedCount = 0;
      const accountsUpdated: string[] = [];

      // Get all expenditure entries with accounts
      const { data: expenditureEntries, error } = await supabase
        .from("expenditure_entries")
        .select("id, account_id, amount, date, description")
        .not("account_id", "is", null);

      if (error) {
        throw error;
      }

      if (!expenditureEntries || expenditureEntries.length === 0) {
        console.log('No expenditure entries with accounts found');
        return { success: true, processedCount: 0, failedCount: 0, accountsUpdated: [] };
      }

      console.log(`Found ${expenditureEntries.length} expenditure entries with accounts`);

      // Convert to transaction format
      const transactions = expenditureEntries.map(entry => ({
        accountId: entry.account_id,
        amount: entry.amount,
        date: entry.date,
        description: entry.description || "Expenditure entry",
        transactionType: 'expenditure' as const,
        referenceId: entry.id,
        referenceType: 'expenditure_entry' as const
      }));

      // Process in batches
      const result = await this.processBatchTransactions(transactions);

      // Collect unique account IDs
      const uniqueAccountIds = [...new Set(expenditureEntries.map(entry => entry.account_id))];

      // Recalculate balances for all affected accounts
      for (const accountId of uniqueAccountIds) {
        await AccountBalanceService.recalculateBalance(accountId);
        accountsUpdated.push(accountId);
      }

      const duration = performance.now() - startTime;
      console.log(`Expenditure entries synchronization completed in ${duration.toFixed(2)}ms: ${result.processedCount} processed, ${result.failedCount} failed`);

      return {
        success: result.success,
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        accountsUpdated
      };
    } catch (error) {
      console.error('Error synchronizing expenditure entries:', error);
      ErrorTracker.logError({
        operation: 'synchronizeAllExpenditureEntries',
        component: 'BatchProcessingService',
        error
      });

      return {
        success: false,
        processedCount: 0,
        failedCount: 1,
        accountsUpdated: []
      };
    }
  }
}
