import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // SQL to fix the delete_asset_disposal function
    const sql = `
      -- Drop the existing function if it exists
      DROP FUNCTION IF EXISTS delete_asset_disposal(uuid, uuid, uuid);

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

    // Execute the SQL directly
    const { error } = await supabase.from('_temp_migrations').insert({
      name: 'fix_delete_asset_disposal_direct',
      sql: sql
    });

    if (error) {
      console.error("Error executing SQL directly:", error);
      
      // Try another approach - execute the SQL as a raw query
      try {
        // Split the SQL into individual statements
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        // Execute each statement separately
        for (const stmt of statements) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
          if (stmtError) {
            console.error(`Error executing statement: ${stmt}`, stmtError);
          }
        }
      } catch (directError) {
        console.error("Error executing SQL as raw query:", directError);
        return NextResponse.json(
          { error: `Failed to fix delete_asset_disposal function: ${directError instanceof Error ? directError.message : String(directError)}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: "delete_asset_disposal function fixed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fixing delete_asset_disposal function:", error);
    return NextResponse.json(
      { error: `Failed to fix delete_asset_disposal function: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
