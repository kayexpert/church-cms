import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint to check if the exec_sql_void function exists in the database
 * GET /api/database/check-exec-sql-void
 */
export async function GET() {
  try {
    // Check if the function exists by querying the PostgreSQL catalog
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT EXISTS (
          SELECT 1
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE p.proname = 'exec_sql_void'
          AND n.nspname = 'public'
        ) as function_exists;
      `
    });

    // If there's no error and data exists, check the result
    if (!error && data) {
      const functionExists = data[0]?.function_exists === true;

      return NextResponse.json({
        exists: functionExists,
        message: functionExists
          ? 'exec_sql_void function exists and is working properly'
          : 'exec_sql_void function does not exist'
      });
    }

    // If there's an error with exec_sql, try a direct query
    let directData = null;
    let directError = null;

    try {
      // Try to check for the function directly
      const result = await supabase.from('pg_proc')
        .select('*')
        .eq('proname', 'exec_sql_void')
        .limit(1);

      directData = result.data;
      directError = result.error;
    } catch (err) {
      directError = new Error('Failed to check for function existence');
    }

    if (!directError && directData && directData.length > 0) {
      return NextResponse.json({
        exists: true,
        message: 'exec_sql_void function exists (detected via direct query)'
      });
    }

    // If all checks fail, assume the function doesn't exist
    return NextResponse.json({
      exists: false,
      message: 'exec_sql_void function does not exist or cannot be detected',
      error: error?.message || directError?.message || 'Unknown error'
    });
  } catch (error) {
    console.error('Error checking exec_sql_void function:', error);
    return NextResponse.json({
      exists: false,
      message: 'Error checking exec_sql_void function',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
