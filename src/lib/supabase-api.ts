import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Create a function to get Supabase client instead of creating it at module level
export function getSupabaseApi() {
  // Validate Supabase configuration
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error('Missing Supabase configuration:', {
      url: config.supabase.url ? 'Set' : 'Missing',
      anonKey: config.supabase.anonKey ? 'Set' : 'Missing'
    });
    throw new Error('Missing Supabase configuration');
  }

  // Create a simple Supabase client for API routes
  return createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }
  );
}

// For backward compatibility, export a lazy-loaded client
export const supabaseApi = {
  get client() {
    return getSupabaseApi();
  }
};
