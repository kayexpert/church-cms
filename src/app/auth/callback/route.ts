import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');

    // Handle error case
    if (error) {
      console.error('Auth callback error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(errorDescription || 'Authentication error')}`, request.url)
      );
    }

    // Handle auth code exchange
    if (code) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Error exchanging code for session:', error.message);
          return NextResponse.redirect(
            new URL(`/?error=${encodeURIComponent(error.message)}`, request.url)
          );
        }

        // Log successful authentication
        console.log('Auth callback successful, session established for user:', data.user?.id);

        // Redirect to dashboard on successful authentication
        // The session cookies are automatically set by the Supabase client
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch (exchangeError) {
        console.error('Error in code exchange:', exchangeError);
        return NextResponse.redirect(
          new URL(`/?error=${encodeURIComponent('Error processing authentication')}`, request.url)
        );
      }
    }

    // If no code is present, redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error: any) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('An unexpected error occurred')}`, request.url)
    );
  }
}
