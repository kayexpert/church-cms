import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    // Sign out from Supabase
    // This will automatically clear the auth cookies
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Redirect to home page
    // The cookies are automatically cleared by the Supabase client
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Unexpected error during sign-out:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
