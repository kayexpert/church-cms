/**
 * Centralized utility for calculating account balances
 * This ensures consistent balance calculation across the application
 */

import { Account, AccountTransaction } from "@/types/finance";

/**
 * Checks if a transaction is an opening balance entry
 * @param transaction The transaction to check
 * @returns True if the transaction is an opening balance entry
 */
export function isOpeningBalanceTransaction(transaction: AccountTransaction): boolean {
  return (
    transaction.transaction_type === "income" &&
    (transaction.description?.includes("[Bal c/d]") ||
     transaction.description?.includes("Opening Balance") ||
     transaction.description?.includes("Opening balance for") ||
     (transaction.payment_details &&
      typeof transaction.payment_details === 'object' &&
      transaction.payment_details.type === "opening_balance"))
  );
}

/**
 * Calculates an account's balance from its transactions
 * @param account The account to calculate the balance for
 * @param transactions The account's transactions
 * @returns The calculated balance
 */
export function calculateAccountBalance(
  account: Account,
  transactions: AccountTransaction[]
): number {
  if (!transactions || transactions.length === 0) {
    // If there are no transactions, the balance is just the opening balance
    return account.opening_balance || 0;
  }

  // Check if there's an opening balance entry in the transactions
  const hasOpeningBalanceEntry = transactions.some(isOpeningBalanceTransaction);

  // Calculate transaction totals
  const summary = transactions.reduce(
    (acc, transaction) => {
      // Skip opening balance entries when calculating inflow
      if (transaction.transaction_type === "income") {
        if (!isOpeningBalanceTransaction(transaction)) {
          acc.totalInflow += transaction.amount;
        }
      } else if (transaction.transaction_type === "expenditure") {
        acc.totalOutflow += Math.abs(transaction.amount);
      } else if (transaction.transaction_type === "transfer_in") {
        acc.totalTransfersIn += transaction.amount;
      } else if (transaction.transaction_type === "transfer_out") {
        acc.totalTransfersOut += Math.abs(transaction.amount);
      }
      return acc;
    },
    {
      totalInflow: 0,
      totalOutflow: 0,
      totalTransfersIn: 0,
      totalTransfersOut: 0,
    }
  );

  // Find the opening balance amount from transactions if it exists
  let openingBalanceAmount = 0;
  if (hasOpeningBalanceEntry) {
    // Find the opening balance transaction and get its amount
    const openingBalanceTx = transactions.find(isOpeningBalanceTransaction);
    if (openingBalanceTx) {
      openingBalanceAmount = openingBalanceTx.amount;
    }
  } else {
    // Use the account's opening balance if no opening balance transaction exists
    openingBalanceAmount = account.opening_balance || 0;
  }

  // Calculate the correct balance - ALWAYS include opening balance
  const calculatedBalance =
    openingBalanceAmount +
    (summary.totalInflow || 0) +
    (summary.totalTransfersIn || 0) -
    (summary.totalOutflow || 0) -
    (summary.totalTransfersOut || 0);

  return calculatedBalance;
}

/**
 * Calculates transaction summary for an account
 * @param transactions The account's transactions
 * @returns Summary of inflows, outflows, transfers, and loan inflows
 */
export function calculateTransactionSummary(transactions: AccountTransaction[]) {
  if (!transactions || transactions.length === 0) {
    return {
      totalInflow: 0,
      totalOutflow: 0,
      totalTransfersIn: 0,
      totalTransfersOut: 0,
      totalLoanInflow: 0,
    };
  }

  return transactions.reduce(
    (acc, transaction) => {
      // Check if this is an income transaction
      if (transaction.transaction_type === "income") {
        // Skip opening balance entries when calculating inflow
        if (!isOpeningBalanceTransaction(transaction)) {
          // Include regular income entries (not opening balances)
          acc.totalInflow += transaction.amount;

          // If this is a loan income entry, also track it separately
          if (transaction.description?.includes("Loan from")) {
            acc.totalLoanInflow += transaction.amount;
          }
        }
      } else if (transaction.transaction_type === "expenditure") {
        acc.totalOutflow += Math.abs(transaction.amount);
      } else if (transaction.transaction_type === "transfer_in") {
        acc.totalTransfersIn += transaction.amount;
      } else if (transaction.transaction_type === "transfer_out") {
        acc.totalTransfersOut += Math.abs(transaction.amount);
      }
      return acc;
    },
    {
      totalInflow: 0,
      totalOutflow: 0,
      totalTransfersIn: 0,
      totalTransfersOut: 0,
      totalLoanInflow: 0,
    }
  );
}
