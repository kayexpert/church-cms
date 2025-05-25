import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/db/fix-messaging-system
 * Runs the comprehensive fix script for the messaging system
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Starting messaging system fix...');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'fix_messaging_system.sql');
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

    console.log('Messaging system fix completed successfully');

    // Now fix any stuck messages
    try {
      const stuckMessagesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/messaging/fix-stuck-messages`, {
        method: 'POST'
      });
      
      if (!stuckMessagesResponse.ok) {
        console.warn('Failed to fix stuck messages, but database fix was successful');
      } else {
        console.log('Stuck messages fixed successfully');
      }
    } catch (error) {
      console.warn('Error fixing stuck messages, but database fix was successful:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Messaging system fixed successfully'
    });
  } catch (error) {
    console.error('Error fixing messaging system:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix messaging system',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
