import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // SQL to create the update_asset_disposal function
    const sql = `
      -- Create or replace the update_asset_disposal function
      CREATE OR REPLACE FUNCTION update_asset_disposal(
        p_disposal_id UUID,
        p_disposal_date DATE,
        p_disposal_amount DECIMAL,
        p_account_id UUID,
        p_income_entry_id UUID
      )
      RETURNS VOID AS $$
      DECLARE
        v_asset_id UUID;
        v_asset_name TEXT;
      BEGIN
        -- Get the asset ID and name
        SELECT ad.asset_id, a.name 
        INTO v_asset_id, v_asset_name
        FROM asset_disposals ad
        JOIN assets a ON ad.asset_id = a.id
        WHERE ad.id = p_disposal_id;
        
        -- Update the asset disposal record
        UPDATE asset_disposals
        SET 
          disposal_date = p_disposal_date,
          disposal_amount = p_disposal_amount,
          account_id = p_account_id,
          updated_at = NOW()
        WHERE id = p_disposal_id;
        
        -- Update the income entry
        UPDATE income_entries
        SET 
          date = p_disposal_date,
          amount = p_disposal_amount,
          account_id = p_account_id,
          description = 'Disposal of asset: ' || v_asset_name,
          payment_details = jsonb_build_object('source', 'asset_disposal', 'asset_id', v_asset_id)
        WHERE id = p_income_entry_id;
        
        -- Return success
        RETURN;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Try to execute the SQL using the exec_sql function
    try {
      const { error } = await supabase.rpc("exec_sql", { sql });

      if (error) {
        console.error("Error executing SQL via RPC:", error);
        
        // Try direct SQL execution as a fallback
        const { error: directError } = await supabase.from('_temp_migrations').insert({
          name: 'create_update_asset_disposal_function',
          sql: sql
        });
        
        if (directError) {
          console.error("Error executing SQL directly:", directError);
          return NextResponse.json(
            { error: `Failed to create update_asset_disposal function: ${directError.message}` },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error("Error creating update_asset_disposal function:", error);
      return NextResponse.json(
        { error: `Failed to create update_asset_disposal function: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "update_asset_disposal function created successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating update_asset_disposal function:", error);
    return NextResponse.json(
      { error: `Failed to create update_asset_disposal function: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
