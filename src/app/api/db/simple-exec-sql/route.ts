import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * A simplified API route to execute SQL statements directly
 * This bypasses the exec_sql function and executes SQL statements directly
 */
export async function POST(request: Request) {
  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { success: false, error: "SQL statement is required" },
        { status: 400 }
      );
    }

    // Split the SQL into individual statements
    const statements = sql.split(';').filter((stmt: string) => stmt.trim().length > 0);
    const results = [];
    let hasErrors = false;

    // Execute each statement separately
    for (const stmt of statements) {
      try {
        // Use raw query execution
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: stmt.trim() + ';' 
        });

        if (error) {
          console.warn(`Warning executing statement: ${stmt}`, error);
          
          // Try alternative parameter name
          const altResult = await supabase.rpc('exec_sql', { 
            sql: stmt.trim() + ';' 
          });
          
          if (altResult.error) {
            console.error(`Error executing statement: ${stmt}`, altResult.error);
            results.push({
              statement: stmt.trim(),
              success: false,
              error: altResult.error.message
            });
            hasErrors = true;
          } else {
            results.push({
              statement: stmt.trim(),
              success: true
            });
          }
        } else {
          results.push({
            statement: stmt.trim(),
            success: true
          });
        }
      } catch (error) {
        console.error(`Error executing statement: ${stmt}`, error);
        results.push({
          statement: stmt.trim(),
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        hasErrors = true;
      }
    }

    return NextResponse.json({
      success: !hasErrors,
      results
    });
  } catch (error) {
    console.error("Error executing SQL:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}
