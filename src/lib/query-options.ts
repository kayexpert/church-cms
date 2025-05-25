/**
 * Query Options
 * 
 * This file provides standardized React Query options for different types of queries.
 * It helps ensure consistent caching behavior across the application.
 */

import { QueryOptions } from '@tanstack/react-query';

// Time constants (in milliseconds)
export const TIME = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
};

/**
 * Default query options for frequently changing data
 * - Short stale time (1 minute)
 * - Short cache time (5 minutes)
 * - 1 retry with 1 second delay
 */
export function frequentQueryOptions<TData, TError>(
  options?: Partial<QueryOptions<TData, TError>>
): Partial<QueryOptions<TData, TError>> {
  return {
    staleTime: 1 * TIME.MINUTE,
    gcTime: 5 * TIME.MINUTE,
    retry: 1,
    retryDelay: 1000,
    ...options
  };
}

/**
 * Query options for standard data
 * - Medium stale time (5 minutes)
 * - Medium cache time (30 minutes)
 * - 2 retries with exponential backoff
 */
export function standardQueryOptions<TData, TError>(
  options?: Partial<QueryOptions<TData, TError>>
): Partial<QueryOptions<TData, TError>> {
  return {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    ...options
  };
}

/**
 * Query options for rarely changing data
 * - Long stale time (1 hour)
 * - Long cache time (1 day)
 * - 3 retries with exponential backoff
 */
export function rarelyChangingQueryOptions<TData, TError>(
  options?: Partial<QueryOptions<TData, TError>>
): Partial<QueryOptions<TData, TError>> {
  return {
    staleTime: 1 * TIME.HOUR,
    gcTime: 1 * TIME.DAY,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    ...options
  };
}

/**
 * Query options for static data (e.g., reference data)
 * - Very long stale time (1 day)
 * - Very long cache time (7 days)
 * - 3 retries with exponential backoff
 */
export function staticDataQueryOptions<TData, TError>(
  options?: Partial<QueryOptions<TData, TError>>
): Partial<QueryOptions<TData, TError>> {
  return {
    staleTime: 1 * TIME.DAY,
    gcTime: 7 * TIME.DAY,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    ...options
  };
}

/**
 * Query options for dashboard data
 * - Medium stale time (5 minutes)
 * - Medium cache time (30 minutes)
 * - 1 retry with 1 second delay
 * - Refetch on window focus
 */
export function dashboardQueryOptions<TData, TError>(
  options?: Partial<QueryOptions<TData, TError>>
): Partial<QueryOptions<TData, TError>> {
  return {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    ...options
  };
}

/**
 * Query options for real-time data
 * - Very short stale time (10 seconds)
 * - Short cache time (1 minute)
 * - 1 retry with 500ms delay
 * - Refetch on window focus
 * - Refetch interval of 10 seconds
 */
export function realTimeQueryOptions<TData, TError>(
  options?: Partial<QueryOptions<TData, TError>>
): Partial<QueryOptions<TData, TError>> {
  return {
    staleTime: 10 * 1000,
    gcTime: 1 * TIME.MINUTE,
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: true,
    refetchInterval: 10 * 1000,
    ...options
  };
}

/**
 * Query options for form data
 * - Medium stale time (5 minutes)
 * - Medium cache time (30 minutes)
 * - 2 retries with exponential backoff
 * - No refetch on window focus (to prevent form data changes)
 */
export function formDataQueryOptions<TData, TError>(
  options?: Partial<QueryOptions<TData, TError>>
): Partial<QueryOptions<TData, TError>> {
  return {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    refetchOnWindowFocus: false,
    ...options
  };
}
