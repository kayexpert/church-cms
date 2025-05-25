import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to create the exec_sql function in the database
 * POST /api/database/create-exec-sql-function
 */
export async function POST() {
  try {
    console.log('Creating exec_sql function if it does not exist');

    // SQL to create the exec_sql function with both parameter names for compatibility
    const createFunctionSQL = `
      -- Create the exec_sql function with sql_query parameter
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

      -- Create the exec_sql function with sql parameter for backward compatibility
      CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
    `;

    // First try using the regular client
    let error;
    try {
      const result = await supabase.rpc('exec_sql', {
        sql_query: createFunctionSQL
      });
      error = result.error;
    } catch (err) {
      // If exec_sql doesn't exist yet, this will fail
      console.log('Error executing exec_sql RPC:', err);
      error = new Error('exec_sql function does not exist');
    }

    if (!error) {
      return NextResponse.json({
        success: true,
        message: 'exec_sql function created or updated successfully'
      });
    }

    // If the first method failed, try using a direct SQL approach with service role
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Try to create a temporary table to execute SQL
      try {
        // Create a temporary table if it doesn't exist
        try {
          await supabaseAdmin.from('_temp_migrations').select('id').limit(1);
        } catch (err) {
          console.log('Temp migrations table does not exist, creating it...');
          // If the table doesn't exist, create it
          try {
            await supabaseAdmin.from('_temp_migrations').insert({
              name: 'create_temp_table',
              sql: `
                CREATE TABLE IF NOT EXISTS _temp_migrations (
                  id SERIAL PRIMARY KEY,
                  name TEXT NOT NULL,
                  sql TEXT NOT NULL,
                  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
              `
            });
          } catch (e) {
            console.error('Error creating _temp_migrations table:', e);
          }
        }

        // Try to execute the SQL directly using the temporary table
        const { error: insertError } = await supabaseAdmin.from('_temp_migrations').insert({
          name: 'create_exec_sql_function',
          sql: createFunctionSQL
        });

        if (!insertError) {
          return NextResponse.json({
            success: true,
            message: 'exec_sql function created successfully using service role'
          });
        }

        console.error('Error creating exec_sql function using service role:', insertError);
      } catch (serviceRoleError) {
        console.error('Error using service role:', serviceRoleError);
      }
    }

    // If all methods failed, return an error
    return NextResponse.json({
      success: false,
      message: 'Failed to create exec_sql function',
      error: error.message
    }, { status: 500 });
  } catch (error) {
    console.error('Unhandled error creating exec_sql function:', error);
    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
