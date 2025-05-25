import {
  format,
  parseISO,
  isValid,
  differenceInYears,
  differenceInDays,
  addDays,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
  isWithinInterval
} from "date-fns";
import { enUS } from 'date-fns/locale';
import {
  detectUserTimezone,
  parseDateWithoutTimezoneAdjustment
} from './timezone-utils';

// Cache for parsed dates to avoid repeated parsing
const dateCache = new Map<string, Date | null>();

/**
 * Parse a date string safely into a Date object with caching
 * @param dateString - Date string in any valid format
 * @returns Date object or undefined if invalid
 */
export function parseDate(dateString: string | Date | undefined): Date | undefined {
  if (!dateString) return undefined;

  // If it's already a Date object, return it
  if (dateString instanceof Date) {
    return isValid(dateString) ? dateString : undefined;
  }

  // Check cache first
  if (dateCache.has(dateString)) {
    return dateCache.get(dateString) || undefined;
  }

  try {
    // Handle YYYY-MM-DD format directly to avoid timezone issues
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(part => parseInt(part, 10));
      const date = new Date(year, month - 1, day);
      const result = isValid(date) ? date : null;
      dateCache.set(dateString, result);
      return result || undefined;
    }

    // If it's a string without time component, add T12:00:00 to avoid timezone issues
    const dateWithTime = !dateString.includes('T')
      ? `${dateString}T12:00:00`
      : dateString;

    const date = parseISO(dateWithTime);
    const result = isValid(date) ? date : null;

    // Cache the result
    dateCache.set(dateString, result);
    return result || undefined;
  } catch (error) {
    console.error('Error parsing date:', error);
    dateCache.set(dateString, null);
    return undefined;
  }
}

/**
 * Format a date with a specified format and locale
 * @param dateString - Date string in any valid format
 * @param pattern - Format pattern to use
 * @param locale - Locale to use for formatting
 * @returns Formatted date string
 */
export function formatDateWithPattern(
  dateString: string | Date | undefined,
  pattern: string = 'dd/MM/yyyy',
  locale = enUS
): string {
  const date = parseDate(dateString);
  if (!date) return 'N/A';

  try {
    return format(date, pattern, { locale });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string from database (YYYY-MM-DD) to display format
 * This handles timezone issues by parsing the date parts directly
 * @param dateString - Date string in YYYY-MM-DD format
 * @param pattern - Format pattern to use
 * @returns Formatted date string
 */
export function formatDatabaseDate(
  dateString: string | undefined,
  pattern: string = 'dd-MMM-yy'
): string {
  if (!dateString) return 'N/A';

  try {
    // Parse the date string correctly, handling timezone issues
    // Create date without timezone conversion (use the date as is)
    const dateParts = dateString.split('-').map(part => parseInt(part, 10));
    if (dateParts.length !== 3) return 'Invalid date';

    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    return format(date, pattern);
  } catch (error) {
    console.error('Error formatting database date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string to dd-MMM-yy format (e.g., 10-Jan-25)
 * This format uses shortened month names and 2-digit years
 * @param dateString - Date string in any valid format
 * @returns Formatted date string in dd-MMM-yy format
 */
export function formatDate(dateString: string | Date | undefined): string {
  return formatDateWithPattern(dateString, 'dd-MMM-yy');
}

/**
 * Format a date string to a more readable format (dd MMMM yyyy)
 * @param dateString - Date string in any valid format
 * @returns Formatted date string in dd MMMM yyyy format
 */
export function formatDateLong(dateString: string | Date | undefined): string {
  return formatDateWithPattern(dateString, 'dd MMMM yyyy');
}

/**
 * Format a date to ISO format (YYYY-MM-DD) for database storage
 * @param date - Date object or string
 * @returns ISO formatted date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date | string | undefined): string | undefined {
  const parsedDate = parseDate(date instanceof Date ? date : date);
  if (!parsedDate) return undefined;

  return format(parsedDate, 'yyyy-MM-dd');
}

/**
 * Create a Date object from a YYYY-MM-DD string without timezone issues
 * This is crucial for calendar components to display the correct selected date
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object with the exact day preserved
 */
export function createDateFromYYYYMMDD(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;

  // Only process strings in YYYY-MM-DD format
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateString);
  }

  // Parse the date parts and create a date object
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayFormatted(): string {
  const today = new Date();
  return format(today, 'yyyy-MM-dd');
}

/**
 * Calculate age from a date string
 * @param dateString - Date string in any format
 * @returns Age in years, or undefined if date is invalid
 */
export function calculateAge(dateString: string | Date | undefined): number | undefined {
  const birthDate = parseDate(dateString);
  if (!birthDate) return undefined;

  const today = new Date();
  return differenceInYears(today, birthDate);
}

/**
 * Check if a date is in the future
 * @param dateString - Date string in any format
 * @returns Boolean indicating if the date is in the future
 */
export function isFutureDate(dateString: string | Date | undefined): boolean {
  const date = parseDate(dateString);
  if (!date) return false;

  return date > new Date();
}

/**
 * Format a date for display in the birthday section (dd-MMM)
 * @param dateString - Date string in any format
 * @returns Formatted date string as dd-MMM
 */
export function formatBirthdayDate(dateString: string | Date | undefined): string {
  return formatDateWithPattern(dateString, 'dd-MMM');
}

/**
 * Check if a date is within the current month
 * @param dateString - Date string in any format
 * @returns Boolean indicating if the date is in the current month
 */
export function isCurrentMonth(dateString: string | Date | undefined): boolean {
  const date = parseDate(dateString);
  if (!date) return false;

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  return isWithinInterval(date, { start, end });
}

/**
 * Get the number of days until a date
 * @param dateString - Date string in any format
 * @returns Number of days until the date, or undefined if date is invalid
 */
export function getDaysUntil(dateString: string | Date | undefined): number | undefined {
  const date = parseDate(dateString);
  if (!date) return undefined;

  const today = new Date();
  return differenceInDays(date, today);
}

/**
 * Get the next occurrence of a date (useful for birthdays)
 * @param dateString - Date string in any format
 * @returns Date object representing the next occurrence
 */
export function getNextOccurrence(dateString: string | Date | undefined): Date | undefined {
  const date = parseDate(dateString);
  if (!date) return undefined;

  const today = new Date();
  const thisYear = today.getFullYear();

  // Create a date for this year's occurrence
  const thisYearDate = new Date(date);
  thisYearDate.setFullYear(thisYear);

  // If this year's date has passed, use next year's date
  if (isBefore(thisYearDate, today)) {
    thisYearDate.setFullYear(thisYear + 1);
  }

  return thisYearDate;
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 days")
 * @param dateString - Date string in any format
 * @returns Formatted relative date string
 */
export function formatRelativeDate(dateString: string | Date | undefined): string {
  const date = parseDate(dateString);
  if (!date) return 'N/A';

  const today = new Date();
  const days = differenceInDays(date, today);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';

  if (days < 0) {
    return `${Math.abs(days)} days ago`;
  }

  return `In ${days} days`;
}

/**
 * Format a date with timezone awareness
 * This function detects the user's timezone and formats the date accordingly
 * @param dateString - Date string in any valid format
 * @param pattern - Format pattern to use (defaults to dd-MMM-yy)
 * @returns Formatted date string
 */
export function formatDateWithTimezone(
  dateString: string | Date | undefined,
  pattern: string = 'dd-MMM-yy'
): string {
  const date = parseDate(dateString);
  if (!date) return 'N/A';

  try {
    // Get the user's timezone
    const timezone = detectUserTimezone();

    // Format the date with the user's timezone
    // Since we're using the browser's timezone by default with Date objects,
    // we don't need to do any explicit conversion here
    return format(date, pattern);
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return formatDateWithPattern(dateString, pattern);
  }
}

/**
 * Clear the date cache
 * This is useful when you want to force re-parsing of dates
 */
export function clearDateCache(): void {
  dateCache.clear();
}
