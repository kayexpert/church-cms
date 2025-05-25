import { NextResponse } from 'next/server';

/**
 * API endpoint to create the exec_sql function using the Supabase REST API
 * This approach uses the Supabase REST API directly
 * POST /api/database/create-exec-sql-rest
 */
export async function POST() {
  try {
    console.log('Creating exec_sql function using REST API...');
    
    // Check for required environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing Supabase credentials in environment variables' 
      }, { status: 500 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
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
    
    // Try to create a temporary table first
    const createTempTableSQL = `
      CREATE TABLE IF NOT EXISTS _temp_sql_execution (
        id SERIAL PRIMARY KEY,
        sql TEXT NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    try {
      // First, try to create the temporary table
      const tempTableResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          sql_query: createTempTableSQL
        })
      });
      
      if (!tempTableResponse.ok) {
        console.warn('Failed to create temporary table using exec_sql, trying direct SQL...');
        
        // Try to create the exec_sql function directly
        const directResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            query: createFunctionSQL
          })
        });
        
        if (directResponse.ok) {
          return NextResponse.json({ 
            success: true, 
            message: 'exec_sql function created successfully using direct SQL' 
          });
        } else {
          const errorText = await directResponse.text();
          console.error('Error creating exec_sql function using direct SQL:', errorText);
          
          // Try one more approach - using the SQL query endpoint
          const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/sql?query=${encodeURIComponent(createFunctionSQL)}`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          
          if (sqlResponse.ok) {
            return NextResponse.json({ 
              success: true, 
              message: 'exec_sql function created successfully using SQL query endpoint' 
            });
          } else {
            const sqlErrorText = await sqlResponse.text();
            console.error('Error creating exec_sql function using SQL query endpoint:', sqlErrorText);
            return NextResponse.json({ 
              success: false, 
              message: 'Failed to create exec_sql function', 
              error: sqlErrorText 
            }, { status: 500 });
          }
        }
      } else {
        // Temporary table created or already exists, now try to create the exec_sql function
        const functionResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            sql_query: createFunctionSQL
          })
        });
        
        if (functionResponse.ok) {
          return NextResponse.json({ 
            success: true, 
            message: 'exec_sql function created successfully using exec_sql' 
          });
        } else {
          const errorText = await functionResponse.text();
          console.error('Error creating exec_sql function using exec_sql:', errorText);
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to create exec_sql function', 
            error: errorText 
          }, { status: 500 });
        }
      }
    } catch (error) {
      console.error('Error creating exec_sql function:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create exec_sql function', 
        error: error instanceof Error ? error.message : String(error) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in create-exec-sql-rest:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
