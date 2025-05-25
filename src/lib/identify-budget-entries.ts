import { IncomeEntry, ExpenditureEntry } from "@/types/finance";

/**
 * Checks if an income entry is related to a budget
 * Budget-related income entries have a budget_item_id field
 * @param entry The income entry to check
 * @returns True if the entry is budget-related, false otherwise
 */
export function isBudgetIncomeEntry(entry: IncomeEntry): boolean {
  // Check if the entry has a budget_item_id
  return !!entry.budget_item_id;
}

/**
 * Checks if an expenditure entry is related to a budget
 * Budget-related expenditure entries have a budget_item_id field
 * @param entry The expenditure entry to check
 * @returns True if the entry is budget-related, false otherwise
 */
export function isBudgetExpenditureEntry(entry: ExpenditureEntry): boolean {
  // Check if the entry has a budget_item_id
  return !!entry.budget_item_id;
}

/**
 * Gets a message explaining why a budget-related entry can't be edited or deleted
 * @returns A message to display to the user
 */
export function getBudgetEntryMessage(): string {
  return "Budget-related entries can only be modified in the Budget Management page";
}
