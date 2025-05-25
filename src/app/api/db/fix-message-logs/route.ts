import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/db/fix-message-logs
 * Fixes the message_logs table by adding the missing message_id_from_provider column
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Fix message logs endpoint called');

    // Create a Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Execute the SQL directly using the REST API
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
          query: `ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS message_id_from_provider TEXT;`
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error adding column:', errorData);
      return NextResponse.json({
        success: false,
        error: 'Failed to add column',
        details: JSON.stringify(errorData)
      }, { status: 500 });
    }

    console.log('message_id_from_provider column added successfully');

    // Refresh the schema cache to make the new column available
    const refreshResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
        },
        body: JSON.stringify({
          query: `SELECT pg_catalog.pg_reload_conf();`
        })
      }
    );

    if (!refreshResponse.ok) {
      console.warn('Failed to refresh schema cache, but column was added successfully');
    } else {
      console.log('Schema cache refreshed successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'Message logs table fixed successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
