import { IncomeEntry, ExpenditureEntry } from "@/types/finance";

/**
 * Checks if an income entry is a reconciliation entry
 * Reconciliation entries can be identified by:
 * 1. Having is_reconciliation_adjustment set to true
 * 2. Having a reconciliation_id
 * 3. Having a description that starts with "[RECONCILIATION]"
 * 4. Having payment_method set to "reconciliation"
 *
 * @param entry The income entry to check
 * @returns True if the entry is a reconciliation entry, false otherwise
 */
export function isReconciliationIncomeEntry(entry: IncomeEntry): boolean {
  // Check if it's explicitly marked as a reconciliation adjustment
  if (entry.is_reconciliation_adjustment) {
    return true;
  }

  // Check if it has a reconciliation_id
  if (entry.reconciliation_id) {
    return true;
  }

  // Check description for reconciliation marker
  if (entry.description && entry.description.startsWith("[RECONCILIATION]")) {
    return true;
  }

  // Check if payment method is "reconciliation"
  if (entry.payment_method === "reconciliation") {
    return true;
  }

  return false;
}

/**
 * Checks if an expenditure entry is a reconciliation entry
 * Reconciliation entries can be identified by:
 * 1. Having is_reconciliation_adjustment set to true
 * 2. Having a reconciliation_id
 * 3. Having a description that starts with "[RECONCILIATION]"
 * 4. Having payment_method set to "reconciliation"
 *
 * @param entry The expenditure entry to check
 * @returns True if the entry is a reconciliation entry, false otherwise
 */
export function isReconciliationExpenditureEntry(entry: ExpenditureEntry): boolean {
  // Check if it's explicitly marked as a reconciliation adjustment
  if (entry.is_reconciliation_adjustment) {
    return true;
  }

  // Check if it has a reconciliation_id
  if (entry.reconciliation_id) {
    return true;
  }

  // Check description for reconciliation marker
  if (entry.description && entry.description.startsWith("[RECONCILIATION]")) {
    return true;
  }

  // Check if payment method is "reconciliation"
  if (entry.payment_method === "reconciliation") {
    return true;
  }

  return false;
}

/**
 * Gets a message explaining why a reconciliation entry can't be edited
 * @returns A message to display to the user
 */
export function getReconciliationEntryMessage(): string {
  return "Reconciliation entries can only be edited in the Bank Reconciliation page";
}
