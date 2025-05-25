import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

/**
 * A simplified API route to apply finance indexes
 * This executes each index creation statement separately
 */
export async function GET() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "src", "db", "migrations", "finance_performance_indexes.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim() + ';');

    // Execute each statement separately
    const results = [];
    let successCount = 0;

    for (const stmt of statements) {
      try {
        // Try to execute the statement directly
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: stmt 
        });

        if (error) {
          // Try alternative parameter name
          const altResult = await supabase.rpc('exec_sql', { 
            sql: stmt 
          });
          
          if (altResult.error) {
            // If both fail, try direct query execution
            console.warn(`Warning: Could not execute statement via RPC: ${stmt.substring(0, 50)}...`);
            results.push({
              statement: stmt.substring(0, 50) + '...',
              success: false,
              error: altResult.error.message
            });
          } else {
            successCount++;
            results.push({
              statement: stmt.substring(0, 50) + '...',
              success: true
            });
          }
        } else {
          successCount++;
          results.push({
            statement: stmt.substring(0, 50) + '...',
            success: true
          });
        }
      } catch (error) {
        console.error(`Error executing statement: ${stmt.substring(0, 50)}...`, error);
        results.push({
          statement: stmt.substring(0, 50) + '...',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Consider it a success if at least 80% of statements succeeded
    const success = successCount / statements.length >= 0.8;

    return NextResponse.json({
      success,
      message: `Applied ${successCount} of ${statements.length} indexes successfully`,
      results
    });
  } catch (error) {
    console.error("Error applying finance indexes:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to apply finance indexes: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}
