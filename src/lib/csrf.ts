import { NextRequest } from 'next/server';
import { config } from './config';

/**
 * Validates a CSRF token from a request
 * @param request The Next.js request object
 * @returns An object indicating if the token is valid and any error message
 */
export function validateCsrfToken(request: NextRequest): { valid: boolean; error?: string } {
  try {
    // Get the CSRF token from the cookie
    const csrfCookie = request.cookies.get(config.auth.csrfCookieName);

    if (!csrfCookie?.value) {
      return { valid: false, error: 'CSRF token cookie not found' };
    }

    // Get the CSRF token from the request header
    const csrfHeader = request.headers.get('x-csrf-token');

    if (!csrfHeader) {
      return { valid: false, error: 'CSRF token header not found' };
    }

    // Compare the tokens
    if (csrfCookie.value !== csrfHeader) {
      return { valid: false, error: 'CSRF token mismatch' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return { valid: false, error: 'Error validating CSRF token' };
  }
}

/**
 * Gets the CSRF token from a request
 * @param request The Next.js request object
 * @returns The CSRF token or null if not found
 */
export function getCsrfToken(request: NextRequest): string | null {
  return request.cookies.get(config.auth.csrfCookieName)?.value || null;
}

/**
 * Generates a random string using Web Crypto API
 * This is safe to use in Edge Runtime
 * @param length The length of the random string
 * @returns A random hex string
 */
export async function generateRandomString(length = 32): Promise<string> {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
