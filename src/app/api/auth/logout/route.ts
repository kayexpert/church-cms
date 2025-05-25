import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    // Sign out from Supabase
    // This will automatically clear the auth cookies
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('API logout error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                   (request ? new URL(request.url).origin : 'http://localhost:3000');

    // Redirect to home page
    // The cookies are automatically cleared by the Supabase client
    return NextResponse.redirect(new URL('/', baseUrl));
  } catch (error) {
    console.error('Unexpected error during API logout:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
