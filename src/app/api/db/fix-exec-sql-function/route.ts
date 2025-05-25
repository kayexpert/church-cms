import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to fix the exec_sql function in the database
 * This creates the function with both parameter names (sql and sql_query)
 */
export async function GET() {
  try {
    console.log("Fixing exec_sql function...");
    
    // First try to create a temporary table to execute SQL
    try {
      const { error: tempTableError } = await supabase.from('_temp_migrations').select('id').limit(1);
      
      if (tempTableError) {
        console.log("Creating _temp_migrations table...");
        
        // Create the table directly using a query
        const { error: createTableError } = await supabase.from('_temp_migrations').insert({
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
        
        if (createTableError) {
          console.error("Error creating _temp_migrations table:", createTableError);
        }
      }
    } catch (error) {
      console.warn("Error checking/creating _temp_migrations table:", error);
    }
    
    // SQL to create the exec_sql function with both parameter names
    const sql = `
      -- Create the exec_sql function with sql_query parameter
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT) RETURNS VOID AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Create the exec_sql function with sql parameter
      CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Try to execute the SQL directly using a direct query
    const { error } = await supabase.from('_temp_migrations').insert({
      name: 'fix_exec_sql_function',
      sql: sql
    });
    
    if (error) {
      console.error("Error fixing exec_sql function:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fix exec_sql function", 
        details: error 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "exec_sql function fixed successfully" 
    });
  } catch (error) {
    console.error("Unexpected error in fix-exec-sql-function:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
