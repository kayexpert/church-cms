/**
 * Query Optimization Configuration
 * Advanced caching and performance optimization for React Query
 */

import { QueryClient } from '@tanstack/react-query';

// Enhanced stale times for different data types
export const OPTIMIZED_STALE_TIMES = {
  // Static data that rarely changes
  STATIC: 1000 * 60 * 60 * 24, // 24 hours
  
  // Semi-static data (settings, templates)
  SEMI_STATIC: 1000 * 60 * 30, // 30 minutes
  
  // Standard data (members, groups)
  STANDARD: 1000 * 60 * 10, // 10 minutes
  
  // Frequently changing data (messages, logs)
  FREQUENT: 1000 * 60 * 2, // 2 minutes
  
  // Real-time data (status, counts)
  REALTIME: 1000 * 30, // 30 seconds
} as const;

// Enhanced garbage collection times
export const OPTIMIZED_GC_TIMES = {
  // Keep static data in memory longer
  STATIC: 1000 * 60 * 60 * 24 * 7, // 7 days
  
  // Standard garbage collection
  STANDARD: 1000 * 60 * 60 * 2, // 2 hours
  
  // Quick cleanup for temporary data
  QUICK: 1000 * 60 * 30, // 30 minutes
} as const;

// Query key factories for better cache management
export const createQueryKeyFactory = <T extends Record<string, any>>(baseKey: string) => ({
  all: [baseKey] as const,
  lists: () => [baseKey, 'list'] as const,
  list: (filters: T) => [baseKey, 'list', filters] as const,
  details: () => [baseKey, 'detail'] as const,
  detail: (id: string) => [baseKey, 'detail', id] as const,
  infinite: (filters: T) => [baseKey, 'infinite', filters] as const,
});

// Optimized query client configuration
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Enhanced retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        
        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Default stale time
        staleTime: OPTIMIZED_STALE_TIMES.STANDARD,
        
        // Default garbage collection time
        gcTime: OPTIMIZED_GC_TIMES.STANDARD,
        
        // Refetch on window focus for important data
        refetchOnWindowFocus: true,
        
        // Don't refetch on reconnect by default (can be overridden)
        refetchOnReconnect: 'always',
        
        // Enable background refetching
        refetchInterval: false, // Disabled by default, enable per query
        
        // Network mode for better offline handling
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once on network errors
        retry: (failureCount, error: any) => {
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        
        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });
};

// Cache invalidation patterns
export const CACHE_PATTERNS = {
  // Invalidate all related queries when creating/updating/deleting
  invalidateRelated: (queryClient: QueryClient, baseKey: string) => {
    queryClient.invalidateQueries({ queryKey: [baseKey] });
  },
  
  // Optimistic updates for better UX
  optimisticUpdate: <T>(
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    updater: (old: T | undefined) => T
  ) => {
    queryClient.setQueryData(queryKey, updater);
  },
  
  // Prefetch related data
  prefetchRelated: async (
    queryClient: QueryClient,
    queries: Array<{ queryKey: readonly unknown[]; queryFn: () => Promise<any> }>
  ) => {
    await Promise.all(
      queries.map(({ queryKey, queryFn }) =>
        queryClient.prefetchQuery({ queryKey, queryFn })
      )
    );
  },
} as const;

// Performance monitoring utilities
export const PERFORMANCE_MONITORING = {
  // Track query performance
  trackQueryPerformance: (queryKey: readonly unknown[], startTime: number) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 1000) { // Log slow queries (>1s)
      console.warn(`Slow query detected: ${JSON.stringify(queryKey)} took ${duration.toFixed(2)}ms`);
    }
  },
  
  // Monitor cache hit rates
  monitorCacheHits: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = queries.reduce((acc, query) => {
      const state = query.state;
      if (state.dataUpdatedAt > 0) {
        acc.hits++;
      } else {
        acc.misses++;
      }
      return acc;
    }, { hits: 0, misses: 0 });
    
    const hitRate = stats.hits / (stats.hits + stats.misses) * 100;
    console.log(`Cache hit rate: ${hitRate.toFixed(2)}% (${stats.hits} hits, ${stats.misses} misses)`);
    
    return { hitRate, ...stats };
  },
} as const;

// Memory optimization utilities
export const MEMORY_OPTIMIZATION = {
  // Clear unused queries to free memory
  clearUnusedQueries: (queryClient: QueryClient, maxAge: number = OPTIMIZED_GC_TIMES.STANDARD) => {
    const cache = queryClient.getQueryCache();
    const now = Date.now();
    
    cache.getAll().forEach(query => {
      const lastAccessed = query.state.dataUpdatedAt || query.state.errorUpdatedAt || 0;
      if (now - lastAccessed > maxAge) {
        cache.remove(query);
      }
    });
  },
  
  // Get memory usage statistics
  getMemoryStats: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
    };
  },
} as const;

// Export optimized configurations for different data types
export const MESSAGING_QUERY_CONFIG = {
  messages: {
    staleTime: OPTIMIZED_STALE_TIMES.FREQUENT,
    gcTime: OPTIMIZED_GC_TIMES.STANDARD,
    refetchOnWindowFocus: true,
  },
  templates: {
    staleTime: OPTIMIZED_STALE_TIMES.SEMI_STATIC,
    gcTime: OPTIMIZED_GC_TIMES.STATIC,
    refetchOnWindowFocus: false,
  },
  logs: {
    staleTime: OPTIMIZED_STALE_TIMES.REALTIME,
    gcTime: OPTIMIZED_GC_TIMES.QUICK,
    refetchOnWindowFocus: true,
  },
  status: {
    staleTime: OPTIMIZED_STALE_TIMES.REALTIME,
    gcTime: OPTIMIZED_GC_TIMES.QUICK,
    refetchInterval: 30000, // Refresh every 30 seconds
  },
} as const;
