"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseApiRequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * A hook for making API requests with consistent error handling and loading states
 * 
 * @param apiCall The async function to call
 * @param options Configuration options
 * @returns Object with data, loading state, error, and execute function
 */
export function useApiRequest<T>(
  apiCall: () => Promise<T>,
  options: UseApiRequestOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      
      // Call onSuccess callback if provided
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      // Show success toast if message provided
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      return result;
    } catch (err) {
      // Convert any error to Error object
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      // Call onError callback if provided
      if (options.onError) {
        options.onError(error);
      }
      
      // Show error toast
      toast.error(options.errorMessage || error.message);
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, options]);

  return {
    data,
    isLoading,
    error,
    execute,
    // Reset function to clear data and errors
    reset: useCallback(() => {
      setData(null);
      setError(null);
    }, [])
  };
}

/**
 * A hook for making API requests with parameters
 * 
 * @param apiCall The async function to call with parameters
 * @param options Configuration options
 * @returns Object with data, loading state, error, and execute function
 */
export function useApiRequestWithParams<T, P>(
  apiCall: (params: P) => Promise<T>,
  options: UseApiRequestOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (params: P) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall(params);
      setData(result);
      
      // Call onSuccess callback if provided
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      // Show success toast if message provided
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      return result;
    } catch (err) {
      // Convert any error to Error object
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      // Call onError callback if provided
      if (options.onError) {
        options.onError(error);
      }
      
      // Show error toast
      toast.error(options.errorMessage || error.message);
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, options]);

  return {
    data,
    isLoading,
    error,
    execute,
    // Reset function to clear data and errors
    reset: useCallback(() => {
      setData(null);
      setError(null);
    }, [])
  };
}
