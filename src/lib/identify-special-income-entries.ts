import { IncomeEntry } from "@/types/finance";

/**
 * Checks if an income entry is an opening balance entry
 * Opening balance entries can be identified by:
 * 1. Descriptions that start with "[Bal c/d]"
 * 2. Descriptions that contain "Opening balance for"
 * 3. Descriptions that start with "Opening Balance -"
 * 4. Payment method is "system"
 * 5. Payment details has type="opening_balance"
 */
export function isOpeningBalanceEntry(entry: IncomeEntry): boolean {
  // Check description patterns
  if (entry.description) {
    if (
      entry.description.startsWith("[Bal c/d]") ||
      entry.description.includes("Opening balance for") ||
      entry.description.startsWith("Opening Balance -")
    ) {
      return true;
    }
  }

  // Check if payment method is "system" (used for system-generated entries)
  if (entry.payment_method === "system") {
    return true;
  }

  // Check payment_details for opening_balance type
  if (entry.payment_details) {
    try {
      // Handle both string and object formats
      const paymentDetails = typeof entry.payment_details === 'string'
        ? JSON.parse(entry.payment_details)
        : entry.payment_details;

      if (paymentDetails && paymentDetails.type === 'opening_balance') {
        return true;
      }
    } catch (e) {
      // If parsing fails, just continue with other checks
      console.error("Error parsing payment_details:", e);
    }
  }

  return false;
}

/**
 * Checks if an income entry is a loan entry
 * Loan entries have descriptions that start with "Loan from" or have payment_details with source="liability"
 */
export function isLoanIncomeEntry(entry: IncomeEntry): boolean {
  // Check description for "Loan from"
  if (entry.description && entry.description.includes("Loan from")) {
    return true;
  }

  // Check payment_details for liability source
  if (entry.payment_details) {
    try {
      // Handle both string and object formats
      const paymentDetails = typeof entry.payment_details === 'string'
        ? JSON.parse(entry.payment_details)
        : entry.payment_details;

      if (paymentDetails && paymentDetails.source === 'liability') {
        return true;
      }
    } catch (e) {
      // If parsing fails, just continue with other checks
      console.error("Error parsing payment_details:", e);
    }
  }

  return false;
}

/**
 * Checks if an income entry is a special entry that should have restricted editing
 * This includes opening balance entries and loan entries
 */
export function isSpecialIncomeEntry(entry: IncomeEntry): boolean {
  return isOpeningBalanceEntry(entry) || isLoanIncomeEntry(entry);
}
