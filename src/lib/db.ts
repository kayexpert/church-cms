/**
 * Comprehensive Database Utilities
 * 
 * This file consolidates all database utility functions into a single module:
 * - Database operation execution with retry logic
 * - Query caching
 * - Database health monitoring
 * - Function existence checking
 * - Batch operations
 * - Performance monitoring
 */

import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from "sonner";

// Constants
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PERFORMANCE_THRESHOLD = 500; // 500ms

// Cache for database function existence checks
const functionExistsCache = new Map<string, boolean>();

// Cache for database queries
const queryCache = new Map<string, {
  data: any;
  timestamp: number;
}>();

// Performance metrics
const performanceMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  totalQueryTime: 0,
  averageQueryTime: 0,
  slowestQuery: {
    name: '',
    time: 0
  }
};

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
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    logPerformance = true
  } = options;
  
  let attempts = 0;
  const startTime = performance.now();
  
  while (attempts <= retries) {
    try {
      const result = await operation();
      
      // Track performance metrics
      if (logPerformance) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        performanceMetrics.totalQueries++;
        performanceMetrics.totalQueryTime += duration;
        performanceMetrics.averageQueryTime = performanceMetrics.totalQueryTime / performanceMetrics.totalQueries;
        
        if (duration > PERFORMANCE_THRESHOLD) {
          performanceMetrics.slowQueries++;
          console.warn(`Slow database operation: ${name} took ${duration.toFixed(2)}ms`);
        }
        
        if (duration > performanceMetrics.slowestQuery.time) {
          performanceMetrics.slowestQuery = {
            name,
            time: duration
          };
        }
      }
      
      if (result.error) {
        // If the error is a network error or a timeout, retry
        if (
          result.error.message?.includes('network') ||
          result.error.message?.includes('timeout') ||
          result.error.message?.includes('connection')
        ) {
          attempts++;
          if (attempts <= retries) {
            console.warn(`Retrying operation (${attempts}/${retries}): ${name}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
            continue;
          }
        }
        
        return { data: null, error: result.error };
      }
      
      return result;
    } catch (error) {
      attempts++;
      
      if (attempts <= retries) {
        console.warn(`Retrying operation after exception (${attempts}/${retries}): ${name}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
        continue;
      }
      
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error(String(error)) 
      };
    }
  }
  
  return { 
    data: null, 
    error: new Error(`Max retries (${retries}) exceeded for operation: ${name}`) 
  };
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
  ttl: number = DEFAULT_CACHE_TTL
): Promise<{ data: T | null; error: PostgrestError | Error | null }> {
  // Clean up expired cache entries periodically
  if (Math.random() < 0.1) { // 10% chance to clean up on each call
    cleanupQueryCache();
  }
  
  // Check if we have a valid cached result
  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < ttl) {
    return { data: cached.data, error: null };
  }
  
  // If not cached or expired, execute the query
  const result = await executeDbOperation(queryFn, {
    name: `Cached query (${cacheKey})`,
    logPerformance: true
  });
  
  // If successful, cache the result
  if (!result.error && result.data !== null) {
    queryCache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now()
    });
  }
  
  return result;
}

/**
 * Clean up expired cache entries
 */
export function cleanupQueryCache(): void {
  const now = Date.now();
  
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > DEFAULT_CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}

/**
 * Clear the entire query cache
 */
export function clearQueryCache(): void {
  queryCache.clear();
}

/**
 * Check if a database function exists
 * @param functionName The name of the function to check
 * @returns Promise<boolean> True if the function exists, false otherwise
 */
export async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    // First check in-memory cache
    if (functionExistsCache.has(functionName)) {
      return functionExistsCache.get(functionName) as boolean;
    }
    
    // Then check localStorage to avoid unnecessary database calls
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(`rpc_${functionName}_exists`);
      if (storedValue === 'true') return true;
      if (storedValue === 'false') return false;
    }
    
    // If not in cache, check the database
    const { data, error } = await supabase.rpc('check_function_exists', { function_name: functionName });
    
    if (error) {
      // If the check_function_exists function itself doesn't exist, try an alternative approach
      if (error.message.includes('function "check_function_exists" does not exist')) {
        // Try to call the function directly to see if it exists
        try {
          await supabase.rpc(functionName);
          // If we get here, the function exists
          markFunctionExists(functionName, true);
          return true;
        } catch (directError: any) {
          // If the error is about the function not existing, it doesn't exist
          if (directError.message && directError.message.includes(`function "${functionName}" does not exist`)) {
            markFunctionExists(functionName, false);
            return false;
          }
          
          // For other errors, we can't determine if the function exists
          console.warn(`Could not determine if function ${functionName} exists:`, directError);
          return false;
        }
      }
      
      console.warn(`Error checking if function ${functionName} exists:`, error);
      return false;
    }
    
    // Store the result in cache
    const exists = !!data;
    markFunctionExists(functionName, exists);
    return exists;
  } catch (error) {
    console.error(`Exception checking if function ${functionName} exists:`, error);
    return false;
  }
}

/**
 * Mark a function as existing or not in cache
 * @param functionName The name of the function
 * @param exists Whether the function exists
 */
export function markFunctionExists(functionName: string, exists: boolean): void {
  // Update in-memory cache
  functionExistsCache.set(functionName, exists);
  
  // Update localStorage if available
  if (typeof window !== 'undefined') {
    localStorage.setItem(`rpc_${functionName}_exists`, exists ? 'true' : 'false');
  }
}

/**
 * Clear the function existence cache
 */
export function clearFunctionExistsCache(): void {
  // Clear in-memory cache
  functionExistsCache.clear();
  
  // Clear localStorage if available
  if (typeof window !== 'undefined') {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rpc_') && key.endsWith('_exists')) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
  }
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

/**
 * Get performance metrics for database operations
 * @returns Object with performance metrics
 */
export function getPerformanceMetrics() {
  return { ...performanceMetrics };
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics() {
  performanceMetrics.totalQueries = 0;
  performanceMetrics.slowQueries = 0;
  performanceMetrics.totalQueryTime = 0;
  performanceMetrics.averageQueryTime = 0;
  performanceMetrics.slowestQuery = {
    name: '',
    time: 0
  };
}

/**
 * Execute a SQL query directly
 * @param sql SQL query to execute
 * @returns Promise with the result
 */
export async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
