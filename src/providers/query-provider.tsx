'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { defaultQueryConfig } from './query-config';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Global React Query provider with optimized configuration
 * - Implements consistent caching strategy
 * - Handles errors gracefully
 * - Provides development tools
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        ...defaultQueryConfig.queries,
        refetchOnWindowFocus: process.env.NODE_ENV === 'production', // Only in production
        refetchOnMount: true, // Refetch on component mount
        refetchOnReconnect: true, // Refetch when reconnecting
        retry: (failureCount, error: any) => {
          // Don't retry on 404s or other client errors
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2; // Retry twice for other errors
        },
        // Default error handler to prevent unhandled promise rejections
        onError: (error: any) => {
          console.error('Query error:', error?.message || error);
        },
        // Always return a default value on error
        useErrorBoundary: false,
      },
      mutations: {
        // Configure default mutation options
        retry: 1,
        onError: (error: any) => {
          console.error('Mutation error:', error?.message || error);
        },
        useErrorBoundary: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
