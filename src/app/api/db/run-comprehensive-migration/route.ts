import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/db/run-comprehensive-migration
 * Run the comprehensive messaging system migration
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Running comprehensive messaging system migration...');

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'fix_messaging_system_comprehensive.sql');
    
    let migrationSQL: string;
    try {
      migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    } catch (error) {
      console.error('Error reading migration file:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to read migration file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    console.log('Migration SQL loaded, executing...');

    // Execute the migration
    try {
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: migrationSQL
      });

      if (error) {
        console.error('Error executing migration:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to execute migration',
          details: error.message
        }, { status: 500 });
      }

      console.log('Migration executed successfully');

      return NextResponse.json({
        success: true,
        message: 'Comprehensive messaging system migration completed successfully',
        data
      });
    } catch (execError) {
      console.error('Error during migration execution:', execError);
      
      // Try to execute individual parts of the migration
      console.log('Attempting to execute migration in parts...');
      
      const migrationParts = migrationSQL.split(';').filter(part => part.trim().length > 0);
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < migrationParts.length; i++) {
        const part = migrationParts[i].trim();
        if (!part || part === 'BEGIN' || part === 'COMMIT') continue;

        try {
          const { error: partError } = await supabaseAdmin.rpc('exec_sql', {
            sql_query: part + ';'
          });

          if (partError) {
            console.error(`Error in migration part ${i + 1}:`, partError);
            results.push({
              part: i + 1,
              status: 'error',
              error: partError.message,
              sql: part.substring(0, 100) + '...'
            });
            errorCount++;
          } else {
            results.push({
              part: i + 1,
              status: 'success',
              sql: part.substring(0, 100) + '...'
            });
            successCount++;
          }
        } catch (partExecError) {
          console.error(`Exception in migration part ${i + 1}:`, partExecError);
          results.push({
            part: i + 1,
            status: 'exception',
            error: partExecError instanceof Error ? partExecError.message : 'Unknown error',
            sql: part.substring(0, 100) + '...'
          });
          errorCount++;
        }
      }

      return NextResponse.json({
        success: successCount > 0,
        message: `Migration completed with ${successCount} successes and ${errorCount} errors`,
        details: {
          successCount,
          errorCount,
          results
        }
      });
    }
  } catch (error) {
    console.error('Error in comprehensive migration endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run comprehensive migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/db/run-comprehensive-migration
 * Get information about the comprehensive migration
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Comprehensive Messaging System Migration Endpoint',
    features: [
      'Fix messages table constraints to support birthday type',
      'Add missing columns (days_before, error_message, payload)',
      'Fix message_logs table constraints',
      'Add missing message_logs columns',
      'Create performance indexes',
      'Add utility functions for cleanup and scheduling'
    ],
    usage: 'POST to this endpoint to run the comprehensive migration'
  });
}
