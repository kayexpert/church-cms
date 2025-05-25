"use client";

import { supabase } from './supabase';

/**
 * Utility function to check if a user is authenticated
 * This can be used in client components to verify auth state
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error checking authentication:', error.message);
      return false;
    }

    return !!data.session;
  } catch (error) {
    console.error('Unexpected error checking authentication:', error);
    return false;
  }
}

/**
 * Utility function to get the current user
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error.message);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return null;
  }
}

/**
 * Utility function to handle login
 * This function ensures proper session creation and persistence
 */
export async function loginUser(email: string, password: string) {
  try {
    // First, clear any existing auth state
    await logoutUser();

    // Then sign in with the provided credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
      return { success: false, error };
    }

    if (!data.session) {
      console.error('Login succeeded but no session was created');
      return {
        success: false,
        error: { message: 'Authentication succeeded but session creation failed' }
      };
    }

    // Verify the session was properly created
    const sessionCheck = await supabase.auth.getSession();
    if (!sessionCheck.data.session) {
      console.error('Session verification failed after login');
      return {
        success: false,
        error: { message: 'Session verification failed after login' }
      };
    }

    console.log('Login successful:', {
      user: data.user?.id,
      session: data.session?.access_token ? 'Valid' : 'Invalid',
    });

    return { success: true, user: data.user, session: data.session };
  } catch (error: any) {
    console.error('Unexpected login error:', error);
    return { success: false, error };
  }
}

/**
 * Utility function to handle logout
 * This function ensures all auth state is properly cleared
 */
export async function logoutUser() {
  try {
    // First try to sign out
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error.message);
      return { success: false, error };
    }

    // Clear any Supabase-related items from localStorage
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    }

    // Clear cookies by setting them to expire
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.includes('supabase') || name.includes('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected logout error:', error);
    return { success: false, error };
  }
}
