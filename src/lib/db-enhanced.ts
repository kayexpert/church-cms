import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Enhanced database operation wrapper with retry logic and error handling
 * @param operation Function that performs the database operation
 * @param options Configuration options for the operation
 * @returns Promise with the operation result
 */
export async function executeDbOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: {
    name?: string;
    retries?: number;
    retryDelay?: number;
    logPerformance?: boolean;
  } = {}
): Promise<{ data: T | null; error: PostgrestError | Error | null }> {
  const {
    name = 'Database operation',
    retries = 3,
    retryDelay = 1000,
    logPerformance = true
  } = options;
  
  let attempts = 0;
  const startTime = performance.now();
  
  while (attempts < retries) {
    try {
      const result = await operation();
      
      // Log performance if enabled and operation took more than 500ms
      if (logPerformance) {
        const duration = performance.now() - startTime;
        if (duration > 500) {
          console.warn(`Slow database operation detected: ${name} took ${duration.toFixed(2)}ms`);
        }
      }
      
      // If no error, return the result
      if (!result.error) {
        return result;
      }
      
      // Handle specific error types that might benefit from retries
      if (
        result.error.code === 'PGRST301' || // Timeout
        result.error.code === '40001' ||    // Serialization failure
        result.error.code === '40P01'       // Deadlock detected
      ) {
        attempts++;
        if (attempts < retries) {
          // Wait with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          continue;
        }
      }
      
      // For other errors, return immediately
      return result;
    } catch (e) {
      attempts++;
      if (attempts >= retries) {
        return { 
          data: null, 
          error: e instanceof Error 
            ? e 
            : new Error(`Unknown error in database operation: ${String(e)}`) 
        };
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
    }
  }
  
  return { 
    data: null, 
    error: new Error(`Max retries (${retries}) exceeded for operation: ${name}`) 
  };
}

/**
 * Cache for database queries
 * Uses a simple in-memory Map with TTL
 */
type CacheEntry<T> = {
  data: T;
  expiry: number;
};

const queryCache = new Map<string, CacheEntry<any>>();

/**
 * Clear the entire query cache
 */
export function clearQueryCache(): void {
  queryCache.clear();
}

/**
 * Remove expired entries from the cache
 */
export function cleanupQueryCache(): void {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (entry.expiry < now) {
      queryCache.delete(key);
    }
  }
}

/**
 * Execute a database query with caching
 * @param cacheKey Unique key for the cache entry
 * @param queryFn Function that performs the database query
 * @param ttl Time-to-live for the cache entry in milliseconds
 * @returns Promise with the query result
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  ttl: number = 5 * 60 * 1000 // Default: 5 minutes
): Promise<{ data: T | null; error: PostgrestError | Error | null }> {
  // Clean up expired cache entries periodically
  if (Math.random() < 0.1) { // 10% chance to clean up on each call
    cleanupQueryCache();
  }
  
  // Check if we have a valid cached result
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return { data: cached.data, error: null };
  }
  
  // Execute the query with retry logic
  const result = await executeDbOperation(queryFn, {
    name: `Cached query: ${cacheKey}`,
  });
  
  // Cache the result if successful
  if (result.data && !result.error) {
    queryCache.set(cacheKey, {
      data: result.data,
      expiry: Date.now() + ttl
    });
  }
  
  return result;
}

/**
 * Check database health by performing a simple query
 * @returns Promise with the health check result
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('church_info')
      .select('id')
      .limit(1);
    
    const responseTime = performance.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        responseTime,
        error: error.message
      };
    }
    
    return {
      healthy: true,
      responseTime
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      healthy: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Batch database operations to reduce the number of round trips
 * @param operations Array of database operations to perform
 * @returns Promise with the results of all operations
 */
export async function batchOperations<T>(
  operations: Array<() => Promise<{ data: any; error: PostgrestError | null }>>
): Promise<Array<{ data: any; error: PostgrestError | Error | null }>> {
  return Promise.all(
    operations.map(operation => 
      executeDbOperation(operation, { logPerformance: false })
    )
  );
}
