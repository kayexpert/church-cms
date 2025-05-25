import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Validate Supabase configuration
if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('Missing Supabase configuration:', {
    url: config.supabase.url ? 'Set' : 'Missing',
    anonKey: config.supabase.anonKey ? 'Set' : 'Missing'
  });
}

// Create a simple Supabase client for API routes
export const supabaseApi = createClient(
  config.supabase.url || '',
  config.supabase.anonKey || '',
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
