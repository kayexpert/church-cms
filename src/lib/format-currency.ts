/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: GHS)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = "GHS"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount).replace('GH₵', '₵');
}

/**
 * Format a number as a percentage
 * @param value The value to format as percentage
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
