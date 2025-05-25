/**
 * Common type definitions used across the application
 */

import { PostgrestError } from '@supabase/supabase-js';

// Generic service response type
export interface ServiceResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

// Filter parameters
export interface FilterParams {
  search?: string;
  status?: string;
  [key: string]: any;
}

// Sort parameters
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Theme type
export type Theme = 'dark' | 'light' | 'system';

// Route configuration
export interface RouteConfig {
  public: string[];
  alwaysAccessible: string[];
}
