import { PostgrestError } from '@supabase/supabase-js';

/**
 * Generic service response type
 * Used for consistent error handling across services
 */
export interface ServiceResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
  
  // Additional properties for specific error types
  noProviderConfigured?: boolean;  // Indicates that no SMS provider is configured
  errorType?: string;              // Type of error (e.g., 'no_provider', 'no_real_provider')
  message?: string;                // User-friendly error message
}
