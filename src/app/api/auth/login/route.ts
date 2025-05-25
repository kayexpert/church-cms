import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { validateCsrfToken, getCsrfToken, generateRandomString } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token, but don't block the request if validation fails in development
    // This makes development easier while still enforcing CSRF in production
    const csrfValidation = validateCsrfToken(request);
    if (!csrfValidation.valid) {
      console.error('CSRF validation failed:', csrfValidation.error);

      // In production, reject the request
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Invalid request' },
          { status: 403 }
        );
      } else {
        // In development, log the error but continue
        console.warn('CSRF validation failed but continuing in development mode');
      }
    }

    // Parse the request body
    const body = await request.json();
    const { email, password, redirectTo } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create a Supabase client
    const supabase = await createClient();

    // Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('API login error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.session) {
      console.error('API login: No session returned');
      return NextResponse.json(
        { error: 'Authentication succeeded but no session was created' },
        { status: 500 }
      );
    }

    console.log('API login successful for user:', data.user.id);

    // Return success with the target URL
    const targetUrl = redirectTo || '/dashboard';

    // Return a success response with the session and redirect URL
    return NextResponse.json({
      success: true,
      redirectTo: targetUrl,
      user: {
        id: data.user.id,
        email: data.user.email,
      }
    });
  } catch (error: any) {
    console.error('Unexpected error in login API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Add a GET endpoint to retrieve the CSRF token
export async function GET(request: NextRequest) {
  const csrfToken = getCsrfToken(request);

  if (!csrfToken) {
    return NextResponse.json(
      { error: 'CSRF token not found' },
      { status: 400 }
    );
  }

  return NextResponse.json({ csrfToken });
}
