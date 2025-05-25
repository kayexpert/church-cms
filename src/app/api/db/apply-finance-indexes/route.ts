import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

/**
 * API route to apply performance optimization indexes to finance tables
 */
export async function GET() {
  try {
    // First, ensure the exec_sql function exists
    try {
      // Use absolute URL with origin for server-side fetch
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/db/create-exec-sql-function`);
    } catch (error) {
      console.warn("Could not ensure exec_sql function exists:", error);
    }

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "src", "db", "migrations", "finance_performance_indexes.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

    // Try to execute the SQL using the exec_sql function
    try {
      const { error } = await supabase.rpc("exec_sql", { sql_query: sqlContent });

      if (error) {
        console.error("Error executing SQL via RPC:", error);

        // Try direct SQL execution as a fallback
        const { error: directError } = await supabase.from('_temp_migrations').insert({
          name: 'finance_performance_indexes',
          sql: sqlContent
        });

        if (directError) {
          console.error("Error executing SQL directly:", directError);
          return NextResponse.json(
            { error: `Failed to apply finance indexes: ${directError.message}` },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error("Error executing SQL:", error);

      // As a last resort, try to execute the SQL directly statement by statement
      try {
        // Split the SQL into individual statements
        const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

        // Execute each statement separately
        for (const stmt of statements) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
          if (stmtError) {
            console.error(`Error executing statement: ${stmt}`, stmtError);
          }
        }
      } catch (directError) {
        console.error("Error executing SQL directly:", directError);
        return NextResponse.json(
          { error: `Failed to apply finance indexes: ${directError instanceof Error ? directError.message : String(directError)}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: "Finance performance indexes applied successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error applying finance indexes:", error);
    return NextResponse.json(
      { error: `Failed to apply finance indexes: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
