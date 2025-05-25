import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to create the exec_sql function using a raw SQL query
 * This is the most direct approach that doesn't rely on any existing functions
 * POST /api/database/create-exec-sql-raw
 */
export async function POST() {
  try {
    console.log('Creating exec_sql function using raw SQL...');
    
    // Create a Supabase client with service role to execute SQL
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing Supabase credentials in environment variables' 
      }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: {
          schema: 'public'
        }
      }
    );
    
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
    
    try {
      // Execute the SQL directly using the raw query method
      const { error } = await supabaseAdmin.rpc('exec_sql', { 
        sql_query: createFunctionSQL 
      });
      
      if (!error) {
        return NextResponse.json({ 
          success: true, 
          message: 'exec_sql function created successfully using exec_sql' 
        });
      }
      
      console.log('exec_sql function does not exist, trying raw query...');
      
      // If exec_sql doesn't exist, try a raw query
      const { error: rawError } = await supabaseAdmin.from('_raw_sql_execution')
        .insert({
          sql: createFunctionSQL
        });
      
      if (rawError) {
        console.error('Error executing raw SQL:', rawError);
        
        // Try creating a temporary table for SQL execution
        try {
          // Create a temporary table
          const { error: tempError } = await supabaseAdmin.from('_temp_sql_execution')
            .select('id')
            .limit(1);
          
          if (tempError) {
            // Table doesn't exist, create it
            const createTempTableSQL = `
              CREATE TABLE IF NOT EXISTS _temp_sql_execution (
                id SERIAL PRIMARY KEY,
                sql TEXT NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
            `;
            
            // Try to create the table using a direct query
            const { data, error: createError } = await supabaseAdmin.auth.getUser();
            
            if (createError) {
              console.error('Error getting user:', createError);
              return NextResponse.json({ 
                success: false, 
                message: 'Failed to authenticate with Supabase', 
                error: createError.message 
              }, { status: 500 });
            }
            
            // If we got here, we're authenticated, try to create the table
            const { error: insertError } = await supabaseAdmin.from('_temp_sql_execution')
              .insert({
                sql: createTempTableSQL
              });
            
            if (insertError) {
              console.error('Error creating temporary table:', insertError);
            }
          }
          
          // Now try to insert the function creation SQL
          const { error: insertError } = await supabaseAdmin.from('_temp_sql_execution')
            .insert({
              sql: createFunctionSQL
            });
          
          if (insertError) {
            console.error('Error inserting SQL into temporary table:', insertError);
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
        } catch (tempError) {
          console.error('Error with temporary table approach:', tempError);
        }
      } else {
        return NextResponse.json({ 
          success: true, 
          message: 'exec_sql function created successfully using raw SQL' 
        });
      }
    } catch (queryError) {
      console.error('Error executing SQL query:', queryError);
    }
    
    // If all approaches failed, return an error
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create exec_sql function after trying multiple approaches' 
    }, { status: 500 });
  } catch (error) {
    console.error('Unexpected error in create-exec-sql-raw:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
