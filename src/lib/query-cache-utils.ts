/**
 * Utility functions for managing React Query cache
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate all queries with the given key prefix
 * @param queryClient The React Query client
 * @param keyPrefix The prefix of the query keys to invalidate
 */
export const invalidateQueriesWithPrefix = (
  queryClient: QueryClient,
  keyPrefix: string
) => {
  // Get all query keys
  const queryCache = queryClient.getQueryCache();
  const queryKeys = queryCache.getAll().map(cache => cache.queryKey);
  
  // Find all keys that start with the prefix
  const keysToInvalidate = queryKeys.filter(key => {
    if (Array.isArray(key) && key.length > 0) {
      return key[0] === keyPrefix;
    }
    return key === keyPrefix;
  });
  
  // Invalidate each matching key
  keysToInvalidate.forEach(key => {
    console.log(`Invalidating query cache for key:`, key);
    queryClient.invalidateQueries({ queryKey: key });
  });
  
  console.log(`Invalidated ${keysToInvalidate.length} queries with prefix "${keyPrefix}"`);
};

/**
 * Force refetch all queries with the given key prefix
 * @param queryClient The React Query client
 * @param keyPrefix The prefix of the query keys to refetch
 */
export const refetchQueriesWithPrefix = async (
  queryClient: QueryClient,
  keyPrefix: string
) => {
  // Get all query keys
  const queryCache = queryClient.getQueryCache();
  const queryKeys = queryCache.getAll().map(cache => cache.queryKey);
  
  // Find all keys that start with the prefix
  const keysToRefetch = queryKeys.filter(key => {
    if (Array.isArray(key) && key.length > 0) {
      return key[0] === keyPrefix;
    }
    return key === keyPrefix;
  });
  
  // Refetch each matching key
  const refetchPromises = keysToRefetch.map(key => {
    console.log(`Refetching query for key:`, key);
    return queryClient.refetchQueries({ queryKey: key, exact: true });
  });
  
  await Promise.all(refetchPromises);
  console.log(`Refetched ${keysToRefetch.length} queries with prefix "${keyPrefix}"`);
};

/**
 * Reset the entire query cache
 * @param queryClient The React Query client
 */
export const resetQueryCache = (queryClient: QueryClient) => {
  console.log('Resetting entire query cache');
  queryClient.resetQueries();
};

/**
 * Clear the entire query cache
 * @param queryClient The React Query client
 */
export const clearQueryCache = (queryClient: QueryClient) => {
  console.log('Clearing entire query cache');
  queryClient.clear();
};
