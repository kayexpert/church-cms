import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Create a Supabase client with service role for more permissions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/db/update-message-logs-table
 * Runs the migration to update the message_logs table
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Starting message_logs table update...');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'update_message_logs_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: migrationSql });

    if (error) {
      console.error('Error executing migration:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to execute migration',
        details: error.message
      }, { status: 500 });
    }

    console.log('Message logs table updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Message logs table updated successfully'
    });
  } catch (error) {
    console.error('Error in update-message-logs-table endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update message logs table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
