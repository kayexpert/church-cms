/**
 * Format a number as currency
 * @param value The number to format
 * @param options Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  options: Intl.NumberFormatOptions & { currency?: string; notation?: string } = {}
): string {
  // Ensure value is a number
  const numValue = Number(value);

  if (isNaN(numValue)) {
    return '₵0.00';
  }

  // Default options
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };

  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };

  // Format the number
  return new Intl.NumberFormat('en-US', mergedOptions).format(numValue).replace('GH₵', '₵'); // Replace the default "GH₵" with just "₵"
}

/**
 * Format a number as a percentage
 * @param value - The value to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format a date string
 * @param dateString The date string to format
 * @param format The format to use (default: 'medium')
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? 'short' : format === 'medium' ? 'short' : 'long',
      day: 'numeric'
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}
