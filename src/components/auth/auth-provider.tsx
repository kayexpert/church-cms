"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
import { config } from "@/lib/config";
import { ConnectionError } from "@/components/ui/connection-error";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  connectionError: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retryConnection: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const {
    user,
    session,
    isLoading,
    isAuthenticated,
    error,
    setUser,
    setSession,
    setLoading,
    setError,
    signIn: storeSignIn,
    signOut: storeSignOut,
    refreshSession,
    checkSession,
  } = useAuthStore();

  // Function to retry connection after an error
  const retryConnection = async () => {
    setConnectionError(null);
    await initializeAuth();
  };

  // Initialize auth state
  const initializeAuth = async () => {
    try {
      setLoading(true);
      setConnectionError(null);

      // Check if we have a valid session
      await checkSession();

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event);

          if (session) {
            setSession(session);
            setUser(session.user);
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Error initializing auth:", error);

      // Determine if this is a connection error
      if (
        error instanceof Error &&
        (error.message.includes('fetch') ||
         error.message.includes('network') ||
         error.message.includes('connection'))
      ) {
        setConnectionError(error);
      } else {
        setError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up session refresh interval
  useEffect(() => {
    if (!session) return;

    // Check session validity and refresh if needed
    const refreshInterval = setInterval(async () => {
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = (expiresAt || 0) - now;

        // If token is about to expire, refresh it
        if (timeRemaining < config.auth.sessionRefreshThreshold) {
          console.log('Session about to expire, refreshing...');
          await refreshSession();
        }
      }
    }, config.auth.sessionRefreshInterval);

    return () => clearInterval(refreshInterval);
  }, [session, refreshSession, config.auth.sessionRefreshThreshold, config.auth.sessionRefreshInterval]);

  // Wrapper for sign in to handle navigation
  const signIn = async (email: string, password: string) => {
    try {
      // Clear any previous connection errors
      setConnectionError(null);

      const success = await storeSignIn({ email, password });

      if (success) {
        // Force a refresh to update the server components
        router.refresh();
      } else {
        throw new Error(error || "Failed to sign in");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);

      // Check if this is a connection error
      if (
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('connection')
      ) {
        setConnectionError(error);
      }

      throw error;
    }
  };

  // Wrapper for sign out to handle navigation
  const signOut = async () => {
    try {
      // Clear any previous connection errors
      setConnectionError(null);

      const success = await storeSignOut();

      // Navigate to home page
      router.push('/');

      // Force a refresh to update the server components
      router.refresh();
    } catch (error: any) {
      console.error("Error signing out:", error);

      // Check if this is a connection error
      if (
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('connection')
      ) {
        setConnectionError(error);
      }
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    error,
    connectionError,
    signIn,
    signOut,
    retryConnection,
  };

  // Only show connection error UI on the client after hydration
  // Use useEffect to set a client-side flag to avoid hydration mismatch
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show connection error UI if there's a connection error, but only on the client
  if (isClient && connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <ConnectionError
          error={connectionError}
          onRetry={retryConnection}
          title="Authentication Error"
          description="We're having trouble connecting to our authentication service."
        />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
