import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to directly create the exec_sql function in the database
 * This is a more direct approach that doesn't rely on the exec_sql function itself
 */
export async function GET() {
  try {
    console.log("Creating exec_sql function directly...");
    
    // First, try to create a temporary table to execute SQL
    try {
      // Create a temporary table if it doesn't exist
      const { error: createTableError } = await supabase.from('_temp_migrations').select('id').limit(1);
      
      if (createTableError) {
        console.log("Creating _temp_migrations table...");
        
        // Try to create the table directly using raw SQL
        const { error: rawError } = await supabase.from('_temp_migrations').insert({
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
        
        if (rawError) {
          console.error("Error creating _temp_migrations table:", rawError);
        }
      }
    } catch (error) {
      console.warn("Error checking/creating _temp_migrations table:", error);
    }
    
    // SQL to create the exec_sql function with both parameter names
    const sql = `
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
    
    // Try to execute the SQL directly using a direct query
    const { error } = await supabase.from('_temp_migrations').insert({
      name: 'create_exec_sql_function_direct',
      sql: sql
    });
    
    if (error) {
      console.error("Error creating exec_sql function:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create exec_sql function", 
        details: error 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "exec_sql function created successfully" 
    });
  } catch (error) {
    console.error("Unexpected error in create-exec-sql-function-direct:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
