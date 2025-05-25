import {
  useQueryClient,
} from '@tanstack/react-query';

/**
 * Standardized staleTime values for different data types
 */
export const STALE_TIMES = {
  REAL_TIME: 0, // Always refetch on mount
  FREQUENT: 1 * 60 * 1000, // 1 minute - for frequently changing data
  STANDARD: 5 * 60 * 1000, // 5 minutes - default for most data
  STATIC: 10 * 60 * 1000, // 10 minutes - for rarely changing data like categories
  VERY_STATIC: 30 * 60 * 1000, // 30 minutes - for very static data
};

/**
 * Standardized garbage collection times
 */
export const GC_TIMES = {
  STANDARD: 10 * 60 * 1000, // 10 minutes - default
  EXTENDED: 30 * 60 * 1000, // 30 minutes - for data we want to keep longer
};

// Enhanced hooks removed to avoid circular dependencies

// Utility functions removed to avoid circular dependencies
