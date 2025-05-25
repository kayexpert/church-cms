import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/db/add-message-id-column
 * Adds the message_id_from_provider column to the message_logs table
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Add message_id_from_provider column endpoint called');

    // Create a Supabase client with service role for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Read the SQL migration file
    const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_message_id_from_provider_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the SQL migration
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      console.error('Error executing migration:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to execute migration',
        details: error.message
      }, { status: 500 });
    }

    // Verify the column was added
    const { data: columnCheck, error: columnCheckError } = await supabaseAdmin
      .from('message_logs')
      .select('message_id_from_provider')
      .limit(1);

    if (columnCheckError) {
      console.error('Error verifying column:', columnCheckError);
      return NextResponse.json({
        success: true,
        message: 'Migration executed, but column verification failed',
        details: columnCheckError.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'message_id_from_provider column added to message_logs table'
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
