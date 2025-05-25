/**
 * Timezone Utilities
 *
 * This file provides utilities for handling timezones in the application.
 * It detects the user's timezone and provides functions for formatting dates
 * with timezone awareness.
 */

// Cache the detected timezone to avoid repeated detection
let detectedTimezone: string | null = null;

/**
 * Detect the user's timezone using the browser's Intl API
 * @returns The detected timezone string (e.g., "America/New_York") or null if detection fails
 */
export function detectUserTimezone(): string {
  // Return cached timezone if available
  if (detectedTimezone) return detectedTimezone;

  // Only run in browser environment
  if (typeof window === 'undefined') {
    return 'UTC'; // Default to UTC in server environment
  }

  try {
    // Use Intl API to detect timezone
    detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return detectedTimezone;
  } catch (error) {
    console.error('Error detecting timezone:', error);
    return 'UTC'; // Default to UTC if detection fails
  }
}

/**
 * Get the timezone offset in minutes for a specific date
 * @param date The date to get the timezone offset for
 * @returns Timezone offset in minutes or 0 if not in browser environment
 */
export function getTimezoneOffset(date: Date | null = null): number {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return 0; // Default to 0 in server environment
  }

  try {
    const dateObj = date || new Date();
    return dateObj.getTimezoneOffset();
  } catch (error) {
    console.error('Error getting timezone offset:', error);
    return 0;
  }
}

/**
 * Check if the user's browser supports timezone detection
 * @returns Boolean indicating if timezone detection is supported
 */
export function isTimezoneDetectionSupported(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return Boolean(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch (error) {
    return false;
  }
}

/**
 * Format a date with the user's timezone
 * This is a simple wrapper that ensures the date is interpreted in the user's timezone
 * @param date The date to format
 * @param formatter Function that formats the date
 * @returns Formatted date string
 */
export function formatWithUserTimezone<T>(
  date: Date | string | undefined,
  formatter: (date: Date) => T
): T | string {
  if (!date) return 'N/A';

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return formatter(dateObj);
  } catch (error) {
    console.error('Error formatting date with user timezone:', error);
    return 'Invalid date';
  }
}

/**
 * Create a date object that preserves the exact date components regardless of timezone
 * This is useful for dates without time components (like birthdays)
 * @param year Year
 * @param month Month (0-11)
 * @param day Day of month
 * @returns Date object with the specified date components
 */
export function createDateWithoutTimezoneAdjustment(
  year: number,
  month: number,
  day: number
): Date {
  // Create a date object with the specified date components
  // Use noon to avoid DST issues
  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Parse a date string in YYYY-MM-DD format without timezone adjustments
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Date object with the exact date preserved
 */
export function parseDateWithoutTimezoneAdjustment(dateString: string): Date | null {
  if (!dateString) return null;

  // Only process strings in YYYY-MM-DD format
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateString);
  }

  // Parse the date parts and create a date object at noon to avoid DST issues
  const [year, month, day] = dateString.split('-').map(Number);
  return createDateWithoutTimezoneAdjustment(year, month - 1, day);
}
