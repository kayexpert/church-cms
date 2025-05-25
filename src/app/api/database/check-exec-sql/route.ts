import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint to check if the exec_sql function exists in the database
 * GET /api/database/check-exec-sql
 */
export async function GET() {
  try {
    // First try to execute a simple query using exec_sql
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: 'SELECT 1 as test'
      });

      // If there's no error, the function exists
      if (!error) {
        return NextResponse.json({
          exists: true,
          message: 'exec_sql function exists and is working properly'
        });
      }
    } catch (execError) {
      console.log('Error executing exec_sql:', execError);
    }

    // If the direct execution fails, check if the function exists by querying the PostgreSQL catalog
    try {
      // Use a direct query to check if the function exists
      const { data, error } = await supabase
        .from('pg_catalog')
        .select('*')
        .limit(1)
        .then(async () => {
          // If we can query pg_catalog, try to check for the function
          return await supabase.from('pg_proc')
            .select('*')
            .eq('proname', 'exec_sql')
            .limit(1);
        })
        .catch(() => {
          // If we can't query pg_catalog, return an error
          return { data: null, error: new Error('Cannot query PostgreSQL catalog') };
        });

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          exists: true,
          message: 'exec_sql function exists (detected via catalog query)'
        });
      }
    } catch (catalogError) {
      console.log('Error querying PostgreSQL catalog:', catalogError);
    }

    // If all checks fail, assume the function doesn't exist
    return NextResponse.json({
      exists: false,
      message: 'exec_sql function does not exist or cannot be detected'
    });
  } catch (error) {
    console.error('Error checking exec_sql function:', error);
    return NextResponse.json({
      exists: false,
      message: 'Error checking exec_sql function',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
