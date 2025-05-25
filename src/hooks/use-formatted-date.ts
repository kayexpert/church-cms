"use client";

import { useCallback, useState, useEffect } from 'react';
import { useTimezone } from '@/components/timezone-provider';
import { formatDateWithTimezone, formatDate } from '@/lib/date-utils';

/**
 * Hook for formatting dates with timezone awareness
 * This hook provides functions for formatting dates with the user's timezone
 * @returns Object with date formatting functions
 */
export function useFormattedDate() {
  const { timezone, isDetected } = useTimezone();
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state on client-side only
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Format a date with the user's timezone
   * @param date Date to format
   * @param pattern Format pattern to use (defaults to dd-MMM-yy)
   * @returns Formatted date string
   */
  const formatWithTimezone = useCallback((
    date: string | Date | undefined,
    pattern?: string
  ) => {
    // Return placeholder during SSR to avoid hydration errors
    if (!isMounted) return '';
    return formatDateWithTimezone(date, pattern);
  }, [timezone, isMounted]);

  /**
   * Format a date with the standard format (dd-MMM-yy)
   * @param date Date to format
   * @returns Formatted date string
   */
  const format = useCallback((
    date: string | Date | undefined
  ) => {
    // Return placeholder during SSR to avoid hydration errors
    if (!isMounted) return '';
    return formatDate(date);
  }, [isMounted]);

  return {
    formatWithTimezone,
    format,
    timezone,
    isTimezoneDetected: isDetected,
    isMounted
  };
}
