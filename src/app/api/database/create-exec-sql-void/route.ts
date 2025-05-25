import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to create the exec_sql_void function in the database
 * POST /api/database/create-exec-sql-void
 */
export async function POST() {
  try {
    console.log('Creating exec_sql_void function if it does not exist');

    // SQL to create the exec_sql_void function
    const createFunctionSQL = `
      -- Create a new function exec_sql_void that returns VOID
      CREATE OR REPLACE FUNCTION exec_sql_void(sql_query TEXT) 
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION exec_sql_void(TEXT) TO authenticated;
    `;

    // First try using the regular exec_sql function
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: createFunctionSQL 
      });

      if (!error) {
        return NextResponse.json({ 
          success: true, 
          message: 'exec_sql_void function created successfully using exec_sql' 
        });
      }
      
      console.warn('Failed to create exec_sql_void using exec_sql, trying service role...');
    } catch (error) {
      console.error('Error using exec_sql:', error);
    }

    // If the first method failed, try using service role
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      try {
        // Try to execute the SQL directly using the service role
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: createFunctionSQL
        });

        if (!error) {
          return NextResponse.json({ 
            success: true, 
            message: 'exec_sql_void function created successfully using service role' 
          });
        }
        
        console.error('Error creating exec_sql_void function using service role:', error);
      } catch (serviceRoleError) {
        console.error('Error using service role:', serviceRoleError);
      }
    }

    // If all methods failed, return instructions for manual creation
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create exec_sql_void function automatically. Please run the SQL manually in the Supabase dashboard.',
      sql: createFunctionSQL
    }, { status: 500 });
  } catch (error) {
    console.error('Unhandled error creating exec_sql_void function:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
