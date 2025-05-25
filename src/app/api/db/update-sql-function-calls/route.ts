import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to update SQL function calls to use the correct function names
 * This will help fix any remaining issues with the finance dashboard
 */
export async function GET() {
  try {
    console.log("Updating SQL function calls...");
    
    // Create a helper function to check if a function exists
    const checkFunctionSql = `
      CREATE OR REPLACE FUNCTION check_function_exists(function_name text, arg_name text)
      RETURNS boolean AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = function_name
          AND pg_get_function_arguments(oid) LIKE '%' || arg_name || ' text%'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        );
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Execute the SQL to create the helper function
    const { error: helperError } = await supabase.rpc('exec_sql', { 
      sql_query: checkFunctionSql 
    });
    
    if (helperError) {
      console.error("Error creating helper function:", helperError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create helper function", 
        details: helperError 
      }, { status: 500 });
    }
    
    // Check if the functions exist
    const { data: checkData, error: checkError } = await supabase.rpc('check_function_exists', {
      function_name: 'exec_sql',
      arg_name: 'sql_query'
    });
    
    if (checkError) {
      console.error("Error checking function existence:", checkError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to check function existence", 
        details: checkError 
      }, { status: 500 });
    }
    
    // Create the dashboard function
    try {
      // First try with exec_sql and sql_query parameter
      const dashboardSql = `
        -- Create the dashboard function
        CREATE OR REPLACE FUNCTION get_dashboard_data(p_time_frame TEXT)
        RETURNS JSON AS $$
        DECLARE
          v_start_date DATE;
          v_end_date DATE;
          v_result JSON;
        BEGIN
          -- Determine date range based on time frame
          v_end_date := CURRENT_DATE;

          CASE p_time_frame
            WHEN 'month' THEN
              v_start_date := DATE_TRUNC('month', CURRENT_DATE);
            WHEN 'quarter' THEN
              v_start_date := DATE_TRUNC('quarter', CURRENT_DATE);
            WHEN 'year' THEN
              v_start_date := DATE_TRUNC('year', CURRENT_DATE);
            WHEN 'all' THEN
              v_start_date := '1900-01-01'::DATE;
            ELSE
              v_start_date := DATE_TRUNC('month', CURRENT_DATE);
          END CASE;

          -- Get all required data in a single query with simpler structure
          SELECT json_build_object(
            'totalIncome', COALESCE((
              SELECT SUM(amount) FROM income_entries
              WHERE date >= v_start_date AND date <= v_end_date
            ), 0),
            'totalExpenditure', COALESCE((
              SELECT SUM(amount) FROM expenditure_entries
              WHERE date >= v_start_date AND date <= v_end_date
            ), 0),
            'totalLiabilities', COALESCE((
              SELECT SUM(amount_remaining) FROM liability_entries
              WHERE status != 'paid'
            ), 0),
            'incomeByCategory', COALESCE((
              SELECT json_agg(
                json_build_object(
                  'category', ic.name,
                  'amount', SUM(ie.amount),
                  'color', COALESCE(ic.color, '#4CAF50')
                )
              )
              FROM income_entries ie
              JOIN income_categories ic ON ie.category_id = ic.id
              WHERE ie.date >= v_start_date AND ie.date <= v_end_date
              GROUP BY ic.name, ic.color
            ), '[]'::json),
            'expenditureByCategory', COALESCE((
              SELECT json_agg(
                json_build_object(
                  'category', ec.name,
                  'amount', SUM(ee.amount),
                  'color', COALESCE(ec.color, '#F44336')
                )
              )
              FROM expenditure_entries ee
              JOIN expenditure_categories ec ON ee.category_id = ec.id
              WHERE ee.date >= v_start_date AND ee.date <= v_end_date
              GROUP BY ec.name, ec.color
            ), '[]'::json),
            'monthlyData', COALESCE((
              SELECT json_agg(
                json_build_object(
                  'month', TO_CHAR(m.month_date, 'Mon'),
                  'month_num', TO_CHAR(m.month_date, 'MM'),
                  'year', EXTRACT(YEAR FROM m.month_date),
                  'income', COALESCE(i.total, 0),
                  'expenditure', COALESCE(e.total, 0)
                )
              )
              FROM (
                SELECT generate_series(
                  DATE_TRUNC('month', v_start_date - INTERVAL '5 months'),
                  DATE_TRUNC('month', v_end_date),
                  '1 month'::interval
                ) AS month_date
              ) m
              LEFT JOIN (
                SELECT
                  DATE_TRUNC('month', date) AS month,
                  SUM(amount) AS total
                FROM income_entries
                GROUP BY month
              ) i ON m.month_date = i.month
              LEFT JOIN (
                SELECT
                  DATE_TRUNC('month', date) AS month,
                  SUM(amount) AS total
                FROM expenditure_entries
                GROUP BY month
              ) e ON m.month_date = e.month
              ORDER BY m.month_date
            ), '[]'::json),
            'recentIncomeEntries', COALESCE((
              SELECT json_agg(
                json_build_object(
                  'id', ie.id,
                  'date', ie.date,
                  'amount', ie.amount,
                  'description', ie.description,
                  'category', json_build_object('id', ic.id, 'name', ic.name)
                )
              )
              FROM income_entries ie
              JOIN income_categories ic ON ie.category_id = ic.id
              ORDER BY ie.date DESC, ie.created_at DESC
              LIMIT 5
            ), '[]'::json),
            'recentExpenditureEntries', COALESCE((
              SELECT json_agg(
                json_build_object(
                  'id', ee.id,
                  'date', ee.date,
                  'amount', ee.amount,
                  'description', ee.description,
                  'category', json_build_object('id', ec.id, 'name', ec.name)
                )
              )
              FROM expenditure_entries ee
              JOIN expenditure_categories ec ON ee.category_id = ec.id
              ORDER BY ee.date DESC, ee.created_at DESC
              LIMIT 5
            ), '[]'::json)
          ) INTO v_result;

          RETURN v_result;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      const { error: dashboardError } = await supabase.rpc('exec_sql', { 
        sql_query: dashboardSql 
      });
      
      if (dashboardError) {
        console.error("Error creating dashboard function:", dashboardError);
        
        // Try with exec_sql_compat and sql parameter
        const { error: compatError } = await supabase.rpc('exec_sql_compat', { 
          sql: dashboardSql 
        });
        
        if (compatError) {
          console.error("Error creating dashboard function with compat:", compatError);
          return NextResponse.json({ 
            success: false, 
            error: "Failed to create dashboard function", 
            details: { dashboardError, compatError } 
          }, { status: 500 });
        }
      }
    } catch (error) {
      console.error("Error creating dashboard function:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create dashboard function", 
        details: error 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "SQL function calls updated successfully",
      functions: {
        exec_sql_exists: checkData,
      }
    });
  } catch (error) {
    console.error("Unexpected error in update-sql-function-calls:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
