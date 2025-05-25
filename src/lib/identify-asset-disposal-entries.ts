import { IncomeEntry } from "@/types/finance";

/**
 * Checks if an income entry is related to an asset disposal
 * Asset disposal income entries can be identified by:
 * 1. Having a category named "Asset Disposal"
 * 2. Having a description that starts with "Disposal of asset:"
 * 3. Having payment_details with source="asset_disposal"
 * 
 * @param entry The income entry to check
 * @returns True if the entry is an asset disposal entry, false otherwise
 */
export function isAssetDisposalEntry(entry: IncomeEntry): boolean {
  // Check if the entry has a category named "Asset Disposal"
  if (entry.income_categories && entry.income_categories.name === "Asset Disposal") {
    return true;
  }

  // Check if the description starts with "Disposal of asset:"
  if (entry.description && entry.description.startsWith("Disposal of asset:")) {
    return true;
  }

  // Check payment_details for asset_disposal source
  if (entry.payment_details) {
    try {
      // Handle both string and object formats
      const paymentDetails = typeof entry.payment_details === 'string'
        ? JSON.parse(entry.payment_details)
        : entry.payment_details;

      if (paymentDetails && paymentDetails.source === 'asset_disposal') {
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
 * Gets a message explaining why an asset disposal entry can't be edited or deleted
 * @returns A message to display to the user
 */
export function getAssetDisposalEntryMessage(): string {
  return "Asset disposal entries can only be modified in the Asset Management page";
}
