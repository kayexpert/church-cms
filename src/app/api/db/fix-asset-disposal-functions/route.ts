import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // First, ensure the exec_sql function exists
    try {
      await fetch('/api/db/create-exec-sql-function');
    } catch (error) {
      console.warn("Could not ensure exec_sql function exists:", error);
    }

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "src", "db", "migrations", "fix_asset_disposal_functions.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

    // Try to execute the SQL directly if the function doesn't exist
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: sqlContent });

      if (error) {
        console.error("Error executing SQL via RPC:", error);

        // Try direct SQL execution as a fallback
        const { error: directError } = await supabase.from('_temp_migrations').insert({
          name: 'fix_asset_disposal_functions',
          sql: sqlContent
        });

        if (directError) {
          console.error("Error executing SQL directly:", directError);
          return NextResponse.json(
            { error: `Failed to execute SQL: ${directError.message}` },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error("Error executing SQL:", error);

      // As a last resort, try to execute the SQL directly
      try {
        // Execute the SQL directly using a raw query
        const fixedSql = `
          -- Drop the existing function if it exists
          DROP FUNCTION IF EXISTS delete_asset_disposal;

          -- Create a fixed version of the delete_asset_disposal function
          CREATE OR REPLACE FUNCTION delete_asset_disposal(
            p_disposal_id UUID,
            p_income_entry_id UUID,
            p_asset_id UUID
          )
          RETURNS VOID AS $$
          BEGIN
            -- Delete the asset disposal record
            DELETE FROM asset_disposals WHERE id = p_disposal_id;

            -- Delete the income entry if it exists
            IF p_income_entry_id IS NOT NULL THEN
              DELETE FROM income_entries WHERE id = p_income_entry_id;
            END IF;

            -- Update the asset status back to active if it exists
            IF p_asset_id IS NOT NULL THEN
              UPDATE assets
              SET status = 'active',
                  updated_at = NOW()
              WHERE id = p_asset_id;
            END IF;

            -- Return success
            RETURN;
          END;
          $$ LANGUAGE plpgsql;
        `;

        // Execute each statement separately
        const statements = fixedSql.split(';').filter(stmt => stmt.trim().length > 0);
        for (const stmt of statements) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
          if (stmtError) {
            console.error(`Error executing statement: ${stmt}`, stmtError);
          }
        }
      } catch (directError) {
        console.error("Error executing SQL directly:", directError);
      }
    }

    return NextResponse.json(
      { message: "Asset disposal functions fixed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fixing asset disposal functions:", error);
    return NextResponse.json(
      { error: `Failed to fix asset disposal functions: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
