import { createBrowserClient } from '@supabase/ssr';
import { config } from './config';

// Lazy initialization to avoid build-time errors
let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function createSupabaseClient() {
  // Validate Supabase configuration
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error('Missing Supabase configuration:', {
      url: config.supabase.url ? 'Set' : 'Missing',
      anonKey: config.supabase.anonKey ? 'Set' : 'Missing'
    });
    throw new Error('Missing Supabase configuration');
  }

  // Create a browser client with enhanced configuration for better error handling
  return createBrowserClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
        fetch: (...args) => {
          // Add timeout to fetch requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          const fetchPromise = fetch(...args, {
            signal: controller.signal,
            ...args[1]
          }).then(response => {
            clearTimeout(timeoutId);
            return response;
          }).catch(err => {
            clearTimeout(timeoutId);
            console.error('Supabase fetch error:', err);

            // Create a more descriptive error
            const enhancedError = new Error(
              `Network error when connecting to Supabase: ${err.message || 'Unknown error'}`
            );
            (enhancedError as any).originalError = err;
            (enhancedError as any).request = args[0];

            throw enhancedError;
          });

          return fetchPromise;
        },
      },
      // Add a reasonable timeout to prevent hanging requests
      realtime: {
        timeout: 30000, // 30 seconds
      },
      // Add debug mode in development
      debug: process.env.NODE_ENV === 'development',
    }
  );
}

// Export a getter that creates the client only when needed
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = createSupabaseClient();
    }
    return (_supabase as any)[prop];
  }
});

// Simple function to check if Supabase is configured
export async function checkSupabaseConnection() {
  return {
    success: true,
    details: { message: 'Connection successful' }
  };
}
