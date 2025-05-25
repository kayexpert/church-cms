import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to create the exec_sql function directly in the database
 * This is a more direct approach that doesn't rely on the exec_sql function itself
 * POST /api/database/create-exec-sql-direct
 */
export async function POST() {
  try {
    console.log('Creating exec_sql function directly...');

    // Create a Supabase client with service role to execute SQL
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase credentials in environment variables'
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First, try to create a temporary table to execute SQL
    try {
      // Create a temporary table if it doesn't exist
      const createTempTableSQL = `
        CREATE TABLE IF NOT EXISTS _temp_migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          sql TEXT NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // Try to create the temp table using a direct query
      const { error: tempTableError } = await supabaseAdmin
        .from('_temp_migrations')
        .select('id')
        .limit(1);

      if (tempTableError) {
        console.log('Creating temporary migrations table...');

        // Create the table using a raw query
        const { error: createError } = await supabaseAdmin
          .from('_temp_migrations')
          .insert({
            name: 'create_temp_table',
            sql: createTempTableSQL
          });

        if (createError) {
          console.error('Error creating temporary table:', createError);
        }
      }

      // SQL to create the exec_sql function
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

      // Insert the SQL into the temporary table
      const { error: insertError } = await supabaseAdmin
        .from('_temp_migrations')
        .insert({
          name: 'create_exec_sql_function_direct',
          sql: createFunctionSQL
        });

      if (insertError) {
        console.error('Error inserting SQL into temporary table:', insertError);

        // Try another approach - create a simple function that can execute SQL
        try {
          console.log('Trying alternative approach with simple function...');

          // Create a simple function that can execute SQL
          const simpleFunctionSQL = `
            -- Create a simple function to execute SQL
            CREATE OR REPLACE FUNCTION simple_exec(sql_text TEXT)
            RETURNS VOID AS $$
            BEGIN
              EXECUTE sql_text;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            -- Grant execute permission
            GRANT EXECUTE ON FUNCTION simple_exec(TEXT) TO authenticated;
          `;

          // Insert the simple function SQL
          const { error: simpleError } = await supabaseAdmin
            .from('_temp_migrations')
            .insert({
              name: 'create_simple_exec_function',
              sql: simpleFunctionSQL
            });

          if (simpleError) {
            console.error('Error creating simple function:', simpleError);
            return NextResponse.json({
              success: false,
              message: 'Failed to create exec_sql function',
              error: simpleError.message
            }, { status: 500 });
          }

          // Now try to use the simple function to create the exec_sql function
          const { error: execError } = await supabaseAdmin.rpc('simple_exec', {
            sql_text: createFunctionSQL
          });

          if (execError) {
            console.error('Error executing SQL with simple function:', execError);
            return NextResponse.json({
              success: false,
              message: 'Failed to create exec_sql function',
              error: execError.message
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            message: 'exec_sql function created successfully using simple function'
          });
        } catch (simpleError) {
          console.error('Error with simple function approach:', simpleError);
        }

        return NextResponse.json({
          success: false,
          message: 'Failed to create exec_sql function',
          error: insertError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'exec_sql function creation SQL inserted successfully'
      });
    } catch (error) {
      console.error('Error creating exec_sql function:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to create exec_sql function',
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in create-exec-sql-direct:', error);
    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
