/**
 * Cache Key Generator
 * 
 * This file provides utilities for generating consistent cache keys
 * for database queries and other cached operations.
 */

/**
 * Generate a cache key for a database query
 * @param baseKey The base key for the query
 * @param params Additional parameters to include in the key
 * @returns A consistent cache key string
 */
export function generateCacheKey(baseKey: string, params: Record<string, any> = {}): string {
  // Sort the params to ensure consistent key generation regardless of object property order
  const sortedParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  
  // If there are no params, just return the base key
  if (sortedParams.length === 0) {
    return baseKey;
  }
  
  // Build the key with the sorted params
  const paramsString = sortedParams
    .map(([key, value]) => {
      // Handle different types of values
      if (typeof value === 'object') {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${value}`;
    })
    .join('&');
  
  return `${baseKey}?${paramsString}`;
}

/**
 * Generate a cache key for financial data queries
 * @param entityType The type of financial entity (income, expenditure, etc.)
 * @param startDate Start date for the query
 * @param endDate End date for the query
 * @param additionalParams Additional parameters to include in the key
 * @returns A consistent cache key string
 */
export function generateFinancialDataCacheKey(
  entityType: string,
  startDate: string,
  endDate: string,
  additionalParams: Record<string, any> = {}
): string {
  return generateCacheKey(`${entityType}`, {
    startDate,
    endDate,
    ...additionalParams
  });
}

/**
 * Generate a cache key for dashboard data queries
 * @param dashboardType The type of dashboard (finance, member, etc.)
 * @param timeFrame The time frame for the dashboard (month, quarter, year, all)
 * @param additionalParams Additional parameters to include in the key
 * @returns A consistent cache key string
 */
export function generateDashboardCacheKey(
  dashboardType: string,
  timeFrame: string,
  additionalParams: Record<string, any> = {}
): string {
  return generateCacheKey(`${dashboardType}_dashboard`, {
    timeFrame,
    ...additionalParams
  });
}

/**
 * Generate a cache key for entity list queries
 * @param entityType The type of entity (member, event, etc.)
 * @param filters Filters to apply to the list
 * @param pagination Pagination parameters
 * @returns A consistent cache key string
 */
export function generateEntityListCacheKey(
  entityType: string,
  filters: Record<string, any> = {},
  pagination: { page?: number; pageSize?: number } = {}
): string {
  return generateCacheKey(`${entityType}_list`, {
    ...filters,
    ...pagination
  });
}

/**
 * Generate a cache key for entity detail queries
 * @param entityType The type of entity (member, event, etc.)
 * @param id The ID of the entity
 * @param additionalParams Additional parameters to include in the key
 * @returns A consistent cache key string
 */
export function generateEntityDetailCacheKey(
  entityType: string,
  id: string,
  additionalParams: Record<string, any> = {}
): string {
  return generateCacheKey(`${entityType}_detail`, {
    id,
    ...additionalParams
  });
}
