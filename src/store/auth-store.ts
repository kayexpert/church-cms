"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { authService, LoginCredentials } from '@/services/auth-service';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  signIn: (credentials: LoginCredentials) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  checkSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      // Synchronous actions
      setUser: (user) => set({
        user,
        isAuthenticated: !!user
      }),

      setSession: (session) => set({ session }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      // Asynchronous actions
      signIn: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
          const result = await authService.signIn(credentials);

          if (result.success && result.data) {
            set({
              user: result.data.user,
              session: result.data.session,
              isAuthenticated: true,
              error: null,
            });
            return true;
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              error: result.error?.message || 'Authentication failed',
            });
            return false;
          }
        } catch (error: any) {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: error.message || 'An unexpected error occurred',
          });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        set({ isLoading: true });

        try {
          const result = await authService.signOut();

          // Always clear the state, even if there was an error
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: result.success ? null : (result.error?.message || 'Sign out failed'),
          });

          return result.success;
        } catch (error: any) {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: error.message || 'An unexpected error occurred during sign out',
          });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      refreshSession: async () => {
        const currentSession = get().session;

        // Only attempt to refresh if we have a session
        if (!currentSession) return false;

        try {
          const result = await authService.getSession();

          if (result.success && result.data) {
            set({
              session: result.data,
              isAuthenticated: true,
            });

            // Also update the user
            const userResult = await authService.getCurrentUser();
            if (userResult.success && userResult.data) {
              set({ user: userResult.data });
            }

            return true;
          } else {
            // Session is invalid or expired
            set({
              user: null,
              session: null,
              isAuthenticated: false,
            });
            return false;
          }
        } catch (error) {
          console.error('Error refreshing session:', error);
          return false;
        }
      },

      checkSession: async () => {
        set({ isLoading: true });

        try {
          const isAuthenticated = await authService.isAuthenticated();

          if (isAuthenticated) {
            try {
              // Get the current session and user
              const sessionResult = await authService.getSession();
              const userResult = await authService.getCurrentUser();

              if (sessionResult.success && userResult.success) {
                set({
                  session: sessionResult.data,
                  user: userResult.data,
                  isAuthenticated: true,
                  error: null,
                });
                return true;
              }
            } catch (sessionError) {
              // Handle network errors during session/user fetch
              console.error('Error fetching session/user details:', sessionError);
              // Continue to reset auth state below
            }
          }

          // Not authenticated or failed to get session/user
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: null,
          });
          return false;
        } catch (error: any) {
          // Handle network errors gracefully
          console.error('Error checking authentication:', error);

          // Don't update error state for network errors to avoid showing error messages
          // when the user might just be offline
          if (error.message?.includes('fetch') ||
              error.message?.includes('network') ||
              error.message?.includes('connection')) {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              // Don't set error for network issues
            });
          } else {
            set({
              error: error.message || 'Failed to check authentication status',
            });
          }
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive data
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
