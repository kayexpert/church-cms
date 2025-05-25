/**
 * Optimized Database Utilities
 * 
 * This file consolidates database utility functions from multiple files:
 * - db-utils.ts
 * - db-enhanced.ts
 * - database-helpers.ts
 * 
 * It provides a unified interface for database operations with:
 * - Improved error handling
 * - Better caching
 * - Retry logic
 * - Performance monitoring
 */

import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from "sonner";

// Cache for database function existence checks
const functionExistsCache = new Map<string, boolean>();

// Cache for database queries
const queryCache = new Map<string, {
  data: any;
  timestamp: number;
}>();

// Constants
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Check if a database function exists with improved caching
 * @param functionName The name of the function to check
 * @returns Promise<boolean> True if the function exists, false otherwise
 */
export async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    // First check memory cache
    if (functionExistsCache.has(functionName)) {
      return functionExistsCache.get(functionName)!;
    }
    
    // Then check localStorage for persistence across page loads
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(`rpc_${functionName}_exists`);
      if (storedValue === 'true') {
        functionExistsCache.set(functionName, true);
        return true;
      }
      if (storedValue === 'false') {
        functionExistsCache.set(functionName, false);
        return false;
      }
    }
    
    // If not in cache, check the database
    const { data, error } = await supabase.rpc(functionName);
    
    // If there's no error or the error is not about the function not existing,
    // then the function exists
    const exists = !error || !error.message.includes('does not exist');
    
    // Update both caches
    functionExistsCache.set(functionName, exists);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rpc_${functionName}_exists`, exists ? 'true' : 'false');
    }
    
    return exists;
  } catch (error) {
    console.error(`Error checking if function ${functionName} exists:`, error);
    return false;
  }
}

/**
 * Clear the function existence cache
 */
export function clearFunctionExistsCache(): void {
  // Clear memory cache
  functionExistsCache.clear();
  
  // Clear localStorage cache
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
  let lastError: PostgrestError | Error | null = null;
  
  const startTime = performance.now();
  
  while (attempts <= retries) {
    try {
      attempts++;
      
      const result = await operation();
      
      if (result.error) {
        lastError = result.error;
        
        // If this is a network error or a 5xx error, retry
        if (
          result.error.code === 'NETWORK_ERROR' ||
          (result.error.code && parseInt(result.error.code) >= 500)
        ) {
          if (attempts <= retries) {
            console.warn(`${name} failed (attempt ${attempts}/${retries + 1}), retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        } else {
          // For other errors, don't retry
          break;
        }
      } else {
        // Operation succeeded
        if (logPerformance) {
          const duration = performance.now() - startTime;
          console.log(`${name} completed in ${duration.toFixed(2)}ms after ${attempts} attempt(s)`);
        }
        
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      
      if (attempts <= retries) {
        console.warn(`${name} failed with exception (attempt ${attempts}/${retries + 1}), retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // If we get here, all attempts failed
  const duration = performance.now() - startTime;
  console.error(`${name} failed after ${attempts} attempt(s) in ${duration.toFixed(2)}ms`);
  
  return { data: null, error: lastError };
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
function cleanupQueryCache(): void {
  const now = Date.now();
  
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > DEFAULT_CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}

/**
 * Clear the query cache
 * @param keyPattern Optional regex pattern to match cache keys to clear
 */
export function clearQueryCache(keyPattern?: RegExp): void {
  if (keyPattern) {
    for (const key of queryCache.keys()) {
      if (keyPattern.test(key)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
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
 * Check if required database tables exist
 * @returns Promise<{missingTables: string[], tablesWithMissingColumns: {table: string, missingColumns: string[]}[]}>
 */
export async function checkDatabaseSetup(): Promise<{
  missingTables: string[];
  tablesWithMissingColumns: {table: string, missingColumns: string[]}[];
}> {
  const missingTables: string[] = [];
  const tablesWithMissingColumns: {table: string, missingColumns: string[]}[] = [];
  
  // List of required tables
  const requiredTables = [
    'church_info',
    'departments',
    'certificates',
    'covenant_families',
    'event_categories',
    'income_categories',
    'expenditure_categories',
    'liability_categories',
    'accounts',
    'members',
    'events',
    'attendance',
    'profiles'
  ];
  
  // Check each table
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        missingTables.push(table);
      }
    } catch (error) {
      // If there's an exception, assume the table doesn't exist
      missingTables.push(table);
    }
  }
  
  return { missingTables, tablesWithMissingColumns };
}
