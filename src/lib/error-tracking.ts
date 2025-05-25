"use client";

import { toast } from "sonner";

/**
 * Interface for error details
 */
interface ErrorDetails {
  operation: string;
  component: string;
  error: any;
  context?: Record<string, any>;
}

/**
 * Centralized error tracking system
 * This class provides methods for consistent error handling across the application
 */
export class ErrorTracker {
  /**
   * Log an error with detailed context
   * @param details The error details
   */
  static logError(details: ErrorDetails): void {
    const { operation, component, error, context } = details;
    
    // Format error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Log to console with context
    console.error(`[${component}] Error during ${operation}:`, {
      error,
      context,
      timestamp: new Date().toISOString(),
    });
    
    // Show user-friendly toast
    toast.error(`Error: ${errorMessage}`);
    
    // Here you could also send to a monitoring service like Sentry
  }
  
  /**
   * Wrap a promise with error tracking
   * @param promise The promise to wrap
   * @param operation The operation being performed
   * @param component The component performing the operation
   * @param context Optional context information
   * @returns The promise result
   */
  static wrapPromise<T>(
    promise: Promise<T>,
    operation: string,
    component: string,
    context?: Record<string, any>
  ): Promise<T> {
    return promise.catch(error => {
      this.logError({
        operation,
        component,
        error,
        context
      });
      throw error;
    });
  }
  
  /**
   * Create a wrapped version of a function that includes error tracking
   * @param fn The function to wrap
   * @param operation The operation being performed
   * @param component The component performing the operation
   * @returns The wrapped function
   */
  static wrapFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operation: string,
    component: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.logError({
          operation,
          component,
          error,
          context: { args }
        });
        throw error;
      }
    }) as T;
  }
  
  /**
   * Handle a specific error with custom handling logic
   * @param error The error to handle
   * @param operation The operation being performed
   * @param component The component performing the operation
   * @param customHandler Optional custom error handler
   * @param context Optional context information
   */
  static handleError(
    error: any,
    operation: string,
    component: string,
    customHandler?: (error: any) => void,
    context?: Record<string, any>
  ): void {
    // Log the error
    this.logError({
      operation,
      component,
      error,
      context
    });
    
    // Call custom handler if provided
    if (customHandler) {
      customHandler(error);
    }
  }
  
  /**
   * Create a custom error with additional context
   * @param message The error message
   * @param code Optional error code
   * @param additionalInfo Optional additional information
   * @returns The custom error
   */
  static createError(
    message: string,
    code?: string,
    additionalInfo?: Record<string, any>
  ): Error & { code?: string; additionalInfo?: Record<string, any> } {
    const error = new Error(message) as Error & { 
      code?: string; 
      additionalInfo?: Record<string, any> 
    };
    
    if (code) {
      error.code = code;
    }
    
    if (additionalInfo) {
      error.additionalInfo = additionalInfo;
    }
    
    return error;
  }
}
