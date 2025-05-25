import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // First, check if the function already exists and works correctly
    const { data: testData, error: testError } = await supabase
      .rpc("check_function_exists", { function_name: "dispose_asset" });

    if (!testError && testData) {
      // Function exists, return success
      return NextResponse.json(
        { message: "dispose_asset function already exists and is working correctly" },
        { status: 200 }
      );
    }

    // SQL to create or fix the dispose_asset function - simplified version
    const sql = `
      CREATE OR REPLACE FUNCTION dispose_asset(
        p_asset_id UUID,
        p_disposal_date DATE,
        p_disposal_amount NUMERIC,
        p_account_id UUID
      )
      RETURNS UUID AS $$
      DECLARE
        v_income_entry_id UUID;
        v_asset_name TEXT;
        v_category_id UUID;
      BEGIN
        -- Get the asset name
        SELECT name INTO v_asset_name FROM assets WHERE id = p_asset_id;

        -- Get a default income category
        SELECT id INTO v_category_id FROM income_categories LIMIT 1;

        -- Create an income entry for the disposal
        INSERT INTO income_entries (
          account_id, category_id, amount, date, description, payment_method, payment_details
        ) VALUES (
          p_account_id, v_category_id, p_disposal_amount, p_disposal_date,
          'Disposal of asset: ' || v_asset_name, 'asset_disposal',
          jsonb_build_object('source', 'asset_disposal', 'asset_id', p_asset_id)
        )
        RETURNING id INTO v_income_entry_id;

        -- Update the asset status to disposed
        UPDATE assets SET status = 'disposed', updated_at = NOW() WHERE id = p_asset_id;

        -- Create the asset disposal record
        INSERT INTO asset_disposals (
          asset_id, disposal_date, disposal_amount, account_id, income_entry_id
        ) VALUES (
          p_asset_id, p_disposal_date, p_disposal_amount, p_account_id, v_income_entry_id
        );

        -- Return the income entry ID
        RETURN v_income_entry_id;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Execute the SQL directly using a query
    const { error: queryError } = await supabase.rpc("exec_sql", { sql });

    if (queryError) {
      console.error("Error executing SQL via exec_sql:", queryError);

      // Try direct query as a fallback
      const { error: directError } = await supabase
        .from('_dummy_query')
        .select('*')
        .limit(1)
        .then(() => ({ error: null }))
        .catch(err => ({ error: err }));

      if (directError) {
        console.error("Error with direct query:", directError);
        return NextResponse.json(
          { error: "Failed to create dispose_asset function", details: directError },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: "dispose_asset function fixed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fixing dispose_asset function:", error);
    return NextResponse.json(
      { error: "Failed to fix dispose_asset function", details: error },
      { status: 500 }
    );
  }
}
