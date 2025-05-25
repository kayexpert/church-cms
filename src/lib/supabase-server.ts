import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { config } from './config';

/**
 * Creates a Supabase client for use in server components and API routes
 * This implementation properly handles cookies and session management
 * with the required getAll and setAll functions
 *
 * Updated to use the asynchronous cookies API in Next.js 14/15
 */
export async function createClient() {
  // Create a custom cookies implementation that works with Next.js 14/15
  return createServerClient(
    config.supabase.url || '',
    config.supabase.anonKey || '',
    {
      cookies: {
        // Required getAll function - now async
        async getAll() {
          // Use a try-catch block to handle any potential errors
          try {
            // Get all cookies manually from the request headers
            const cookieStore = await cookies();

            // Create a dummy array with common Supabase cookie names
            // This is a workaround for the cookies().getAll() issue
            const cookieNames = [
              'sb-access-token',
              'sb-refresh-token',
              'supabase-auth-token',
              '_ga',
              '_gid',
              '_gat',
              'sb',
              'sb-provider-token',
            ];

            // Try to get each cookie by name
            const result = [];
            for (const name of cookieNames) {
              const cookie = cookieStore.get(name);
              if (cookie) {
                result.push({
                  name: cookie.name,
                  value: cookie.value,
                });
              }
            }

            return result;
          } catch (error) {
            console.error('Error getting cookies:', error);
            return [];
          }
        },
        // Required setAll function - now async
        async setAll(cookies) {
          // Use a try-catch block to handle any potential errors
          try {
            const cookieStore = await cookies();
            for (const cookie of cookies) {
              cookieStore.set(cookie.name, cookie.value, cookie.options);
            }
          } catch (error) {
            console.error('Error setting cookies:', error);
          }
        },
      },
    }
  );
}
