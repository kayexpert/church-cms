import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { config } from '@/lib/config';
import { validateCsrfToken, getCsrfToken, generateRandomString } from '@/lib/csrf';

// Simple in-memory rate limiting
// In production, you would use Redis or another distributed store
const resetAttempts = new Map<string, { count: number; timestamp: number }>();

/**
 * Rate limiting function to prevent abuse
 */
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; message?: string }> {
  const now = Date.now();
  const windowMs = config.auth.passwordResetRateLimit.windowMs;
  const maxAttempts = config.auth.passwordResetRateLimit.maxAttempts;

  // Get current attempts for this IP
  const current = resetAttempts.get(ip) || { count: 0, timestamp: now };

  // Check if the window has expired and reset if needed
  if (now - current.timestamp > windowMs) {
    resetAttempts.set(ip, { count: 1, timestamp: now });
    return { allowed: true };
  }

  // Check if max attempts reached
  if (current.count >= maxAttempts) {
    return {
      allowed: false,
      message: `Too many password reset attempts. Please try again in ${Math.ceil((windowMs - (now - current.timestamp)) / 60000)} minutes.`
    };
  }

  // Increment attempts
  resetAttempts.set(ip, {
    count: current.count + 1,
    timestamp: current.timestamp
  });

  return { allowed: true };
}

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

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.message },
        { status: 429 }
      );
    }

    // Parse request body
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get the site URL from the environment or use the current URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                   (request ? new URL(request.url).origin : '');

    // Request password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error.message);
      // Don't expose whether the email exists or not (security best practice)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.'
      });
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });
  } catch (error) {
    console.error('Unexpected error in password reset:', error);

    // Don't expose the error details (security best practice)
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });
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
