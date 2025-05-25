import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to create the exec_sql function if it doesn't exist
 * POST /api/messaging/create-exec-sql
 */
export async function POST() {
  try {
    console.log('Creating exec_sql function');

    // Create a Supabase client with service role to execute SQL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // We'll assume the function doesn't exist and try to create it directly
    // This is a simpler approach that avoids trying to check if it exists first

    // First, try to create the function using SQL
    try {
      // Use the SQL API directly
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
          },
          body: JSON.stringify({
            query: `
              CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
              RETURNS void
              LANGUAGE plpgsql
              SECURITY DEFINER
              AS $function$
              BEGIN
                EXECUTE sql_query;
              END;
              $function$;
            `
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating exec_sql function:', errorText);

        // If the function already exists, that's fine
        if (errorText.includes('already exists')) {
          return NextResponse.json({
            success: true,
            message: 'exec_sql function already exists'
          });
        }

        return NextResponse.json(
          { error: 'Failed to create exec_sql function', details: errorText },
          { status: 500 }
        );
      }

      console.log('Successfully created exec_sql function');
    } catch (err) {
      console.error('Error creating exec_sql function:', err);
      return NextResponse.json(
        { error: 'Failed to create exec_sql function', details: String(err) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'exec_sql function created or already exists'
    });
  } catch (error) {
    console.error('Error creating exec_sql function:', error);
    return NextResponse.json(
      { error: 'Failed to create exec_sql function', details: String(error) },
      { status: 500 }
    );
  }
}
