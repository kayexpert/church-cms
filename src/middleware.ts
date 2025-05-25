import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { config } from '@/lib/config';
import { generateRandomString } from '@/lib/csrf';

export async function middleware(request: NextRequest) {
  // Create a response object that we'll use to handle redirects
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client for the middleware
  // Using the required getAll and setAll functions
  const supabase = createServerClient(
    config.supabase.url || '',
    config.supabase.anonKey || '',
    {
      cookies: {
        // Required getAll function for middleware
        getAll() {
          return request.cookies.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        // Required setAll function for middleware
        setAll(cookies) {
          for (const cookie of cookies) {
            response.cookies.set(cookie);
          }
        },
      },
    }
  );

  try {
    // Generate and set CSRF token if it doesn't exist
    if (!request.cookies.has(config.auth.csrfCookieName)) {
      try {
        const csrfToken = await generateRandomString(16);
        response.cookies.set(config.auth.csrfCookieName, csrfToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });
      } catch (csrfError) {
        // If CSRF token generation fails, log the error but continue
        // This ensures the middleware doesn't break the application
        console.error('Error generating CSRF token:', csrfError);
      }
    }

    // This will refresh the session if needed and check if it's valid
    const { data: { session } } = await supabase.auth.getSession();

    // Check if we need to refresh the token based on expiry time
    if (session) {
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = expiresAt - now;

      // If token is about to expire, refresh it
      if (timeRemaining < config.auth.sessionRefreshThreshold) {
        const { data } = await supabase.auth.refreshSession();
        // Session is automatically updated in cookies by Supabase
      }
    }

    // Public routes that don't require authentication
    const isPublicRoute = config.routes.public.includes(request.nextUrl.pathname) ||
                          request.nextUrl.pathname.startsWith('/auth/');

    // API routes should be handled separately
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

    // Static assets should be accessible
    const isStaticAsset = request.nextUrl.pathname.startsWith('/_next/') ||
                          request.nextUrl.pathname.includes('/favicon.ico') ||
                          request.nextUrl.pathname.includes('.svg') ||
                          request.nextUrl.pathname.includes('.png') ||
                          request.nextUrl.pathname.includes('.jpg') ||
                          request.nextUrl.pathname.includes('.jpeg') ||
                          request.nextUrl.pathname.includes('.ico');

    // Routes that are always accessible regardless of auth state
    const isAlwaysAccessible = config.routes.alwaysAccessible.some(route =>
      request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
    );

    // If the user is not signed in and trying to access a protected route
    if (!session && !isPublicRoute && !isApiRoute && !isStaticAsset && !isAlwaysAccessible) {
      console.log(`Redirecting unauthenticated user from ${request.nextUrl.pathname} to /`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // If the user is signed in and trying to access a public route (except always accessible routes)
    if (session && isPublicRoute && !isApiRoute && !isStaticAsset && !isAlwaysAccessible) {
      console.log(`Redirecting authenticated user from ${request.nextUrl.pathname} to /dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (error) {
    // If there's an error, we'll just continue without redirecting
    console.error('Auth error in middleware:', error);
  }

  return response;
}

export const middlewareConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
