/**
 * Authentication-related type definitions
 */

import { User, Session } from '@supabase/supabase-js';

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Authentication error
export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

// Generic result type for authentication operations
export interface AuthResult<T = any> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

// Authentication state
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Authentication context
export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
