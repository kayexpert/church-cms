import { PostgrestError } from '@supabase/supabase-js';

// Define the response type for better error handling
export interface ServiceResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
}
