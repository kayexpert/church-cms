/**
 * Optimized Date Utilities
 * 
 * This file provides optimized date utility functions for the application.
 * It consolidates date-related functionality from multiple files and provides
 * a consistent interface for date operations.
 */

import {
  format,
  parse,
  isValid,
  parseISO,
  formatISO,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  eachMonthOfInterval,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isSameYear,
  isAfter,
  isBefore,
  isEqual,
  max,
  min
} from 'date-fns';

// Cache for expensive date operations
const dateCache = new Map<string, any>();

/**
 * Get date range based on timeframe
 * @param timeFrame The timeframe to get the date range for (month, quarter, year, all)
 * @returns Object containing start and end dates for current and previous periods
 */
export function getDateRangeForTimeFrame(timeFrame: string): {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date | null;
  previousEndDate: Date | null;
} {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  let previousStartDate: Date | null = null;
  let previousEndDate: Date | null = null;

  // Check cache first
  const cacheKey = `date_range_${timeFrame}_${format(now, 'yyyy-MM-dd')}`;
  if (dateCache.has(cacheKey)) {
    return dateCache.get(cacheKey);
  }

  switch (timeFrame) {
    case 'month':
      startDate = startOfMonth(now);
      previousStartDate = startOfMonth(subYears(now, 1));
      previousEndDate = endOfMonth(subYears(now, 1));
      break;
    case 'quarter':
      startDate = startOfQuarter(now);
      previousStartDate = startOfQuarter(subYears(now, 1));
      previousEndDate = endOfQuarter(subYears(now, 1));
      break;
    case 'year':
      startDate = startOfYear(now);
      previousStartDate = startOfYear(subYears(now, 1));
      previousEndDate = endOfYear(subYears(now, 1));
      break;
    case 'all':
      // Use a far past date for "all time"
      startDate = new Date(2000, 0, 1);
      break;
    default:
      // Default to last 3 months
      startDate = subMonths(now, 3);
      previousStartDate = subMonths(subYears(now, 1), 3);
      previousEndDate = subYears(now, 1);
  }

  const result = {
    startDate,
    endDate,
    previousStartDate,
    previousEndDate
  };

  // Cache the result
  dateCache.set(cacheKey, result);

  return result;
}

/**
 * Get formatted date strings for database queries
 * @param dateRange Date range object from getDateRangeForTimeFrame
 * @returns Object containing formatted date strings
 */
export function getFormattedDateStrings(dateRange: ReturnType<typeof getDateRangeForTimeFrame>): {
  formattedStartDate: string;
  formattedEndDate: string;
  formattedPreviousStartDate: string | null;
  formattedPreviousEndDate: string | null;
} {
  return {
    formattedStartDate: format(dateRange.startDate, "yyyy-MM-dd"),
    formattedEndDate: format(dateRange.endDate, "yyyy-MM-dd"),
    formattedPreviousStartDate: dateRange.previousStartDate
      ? format(dateRange.previousStartDate, "yyyy-MM-dd")
      : null,
    formattedPreviousEndDate: dateRange.previousEndDate
      ? format(dateRange.previousEndDate, "yyyy-MM-dd")
      : null
  };
}

/**
 * Generate time intervals (days or months) based on timeframe
 * @param timeFrame The timeframe to generate intervals for (month, quarter, year, all)
 * @param dateRange Date range object from getDateRangeForTimeFrame
 * @returns Object containing arrays of dates for current and previous periods
 */
export function generateTimeIntervals(
  timeFrame: string,
  dateRange: ReturnType<typeof getDateRangeForTimeFrame>
): {
  intervals: Date[];
  previousIntervals: Date[];
} {
  const { startDate, endDate, previousStartDate, previousEndDate } = dateRange;
  let intervals: Date[] = [];
  let previousIntervals: Date[] = [];

  // Check cache first
  const cacheKey = `intervals_${timeFrame}_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`;
  if (dateCache.has(cacheKey)) {
    return dateCache.get(cacheKey);
  }

  if (timeFrame === 'month') {
    // For month view, show days
    intervals = eachDayOfInterval({ start: startDate, end: endDate });
    
    if (previousStartDate && previousEndDate) {
      previousIntervals = eachDayOfInterval({
        start: previousStartDate,
        end: previousEndDate
      });
    }
  } else {
    // For quarter/year/default view, show months
    intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    
    if (previousStartDate && previousEndDate) {
      previousIntervals = eachMonthOfInterval({
        start: previousStartDate,
        end: previousEndDate
      });
    }
  }

  const result = { intervals, previousIntervals };
  
  // Cache the result
  dateCache.set(cacheKey, result);
  
  return result;
}

/**
 * Format a date for display based on timeframe
 * @param date The date to format
 * @param timeFrame The timeframe context (month, quarter, year, all)
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date, timeFrame: string): string {
  return format(date, timeFrame === 'month' ? 'd' : 'MMM');
}

/**
 * Check if a date falls within a specific interval based on timeframe
 * @param entryDate The date to check
 * @param intervalDate The reference date for the interval
 * @param timeFrame The timeframe context (month, quarter, year, all)
 * @returns Boolean indicating if the date is in the interval
 */
export function isDateInInterval(entryDate: Date, intervalDate: Date, timeFrame: string): boolean {
  if (timeFrame === 'month') {
    // For month view, check if same day
    return isSameDay(entryDate, intervalDate);
  } else {
    // For quarter/year view, check if same month and year
    return isSameMonth(entryDate, intervalDate) && isSameYear(entryDate, intervalDate);
  }
}

/**
 * Clear the date cache
 */
export function clearDateCache(): void {
  dateCache.clear();
}
