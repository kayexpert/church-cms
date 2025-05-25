"use client";

import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export type LoginCredentials = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type AuthError = {
  message: string;
  code?: string;
  status?: number;
};

export type AuthResult<T = any> = {
  success: boolean;
  data?: T;
  error?: AuthError;
};

/**
 * Centralized authentication service
 * This service handles all authentication-related operations
 */
export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: LoginCredentials): Promise<AuthResult<{ user: User; session: Session }>> {
    try {
      // First clear any existing session
      await this.signOut();

      // Sign in with the provided credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return this.handleAuthError(error);
      }

      if (!data.session) {
        return {
          success: false,
          error: {
            message: 'Authentication succeeded but no session was created',
            code: 'AUTH_NO_SESSION',
            status: 500,
          },
        };
      }

      // Verify the session was properly created
      const sessionCheck = await supabase.auth.getSession();
      if (!sessionCheck.data.session) {
        return {
          success: false,
          error: {
            message: 'Session verification failed after login',
            code: 'AUTH_SESSION_VERIFICATION_FAILED',
            status: 500,
          },
        };
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
        },
      };
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return this.handleAuthError(error);
      }

      // Clear any local storage items related to auth
      if (typeof window !== 'undefined') {
        // Only clear Supabase-related items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth') || key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }

      return { success: true };
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<AuthResult<Session>> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return this.handleAuthError(error);
      }

      if (!data.session) {
        return {
          success: false,
          error: {
            message: 'No active session found',
            code: 'AUTH_NO_SESSION',
            status: 401,
          },
        };
      }

      return {
        success: true,
        data: data.session,
      };
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  },

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<AuthResult<User>> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return this.handleAuthError(error);
      }

      if (!data.user) {
        return {
          success: false,
          error: {
            message: 'No user found',
            code: 'AUTH_NO_USER',
            status: 401,
          },
        };
      }

      return {
        success: true,
        data: data.user,
      };
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  },

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const { success } = await this.getSession();
      return success;
    } catch (error) {
      // If there's a network error, don't throw - just return false
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  /**
   * Request a password reset for the given email
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      // Get the site URL from the environment or use the current URL
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                     (typeof window !== 'undefined' ? window.location.origin : '');

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });

      if (error) {
        return this.handleAuthError(error);
      }

      return {
        success: true,
        // Always return success even if email doesn't exist (security best practice)
        data: { message: 'If an account exists with this email, a reset link has been sent.' }
      };
    } catch (error: any) {
      // Log the error but don't expose it to the client
      console.error('Password reset error:', error);

      // Always return success even if there was an error (security best practice)
      return {
        success: true,
        data: { message: 'If an account exists with this email, a reset link has been sent.' }
      };
    }
  },

  /**
   * Update the password for the current user
   */
  async updatePassword(password: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return this.handleAuthError(error);
      }

      return { success: true };
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  },

  /**
   * Handle authentication errors
   */
  handleAuthError(error: any): AuthResult {
    console.error('Auth error:', error);

    // Check for network/connection errors first
    if (
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('connection') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Network error')
    ) {
      return {
        success: false,
        error: {
          message: 'Unable to connect to authentication service. Please check your internet connection and try again.',
          code: 'AUTH_CONNECTION_ERROR',
          status: 0, // Use 0 to indicate a network error rather than an HTTP error
        },
      };
    }

    // Map common Supabase errors to user-friendly messages
    if (error.message?.includes('Invalid login credentials')) {
      return {
        success: false,
        error: {
          message: 'Invalid email or password. Please try again.',
          code: 'AUTH_INVALID_CREDENTIALS',
          status: 401,
        },
      };
    }

    if (error.message?.includes('Email not confirmed')) {
      return {
        success: false,
        error: {
          message: 'Please verify your email address before logging in.',
          code: 'AUTH_EMAIL_NOT_VERIFIED',
          status: 403,
        },
      };
    }

    // Default error response
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected authentication error occurred. Please try again.',
        code: error.code || 'AUTH_UNKNOWN_ERROR',
        status: error.status || 500,
      },
    };
  },
};
