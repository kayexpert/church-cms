import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to safely clean up the database
 * This will:
 * 1. Remove any temporary tables
 * 2. Vacuum analyze tables to optimize performance
 * 3. Update statistics for the query planner
 */
export async function GET() {
  try {
    // Step 1: Check for temporary tables and remove them
    const tempTablesSQL = `
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%_temp_%' 
        OR table_name LIKE '%_bak_%' 
        OR table_name LIKE '%_old_%'
        OR table_name = '_temp_migrations';
    `;
    
    const { data: tempTables, error: tempTablesError } = await supabase.rpc("exec_sql", { 
      sql: tempTablesSQL 
    });
    
    if (tempTablesError) {
      console.error("Error checking for temporary tables:", tempTablesError);
    } else {
      console.log("Found temporary tables:", tempTables);
      
      // Only attempt to drop tables if we found any
      if (tempTables && tempTables.length > 0) {
        for (const table of tempTables) {
          if (table.table_name && table.table_schema) {
            const dropSQL = `DROP TABLE IF EXISTS "${table.table_schema}"."${table.table_name}" CASCADE;`;
            
            try {
              const { error: dropError } = await supabase.rpc("exec_sql", { sql: dropSQL });
              if (dropError) {
                console.error(`Error dropping table ${table.table_schema}.${table.table_name}:`, dropError);
              } else {
                console.log(`Successfully dropped table ${table.table_schema}.${table.table_name}`);
              }
            } catch (err) {
              console.error(`Exception dropping table ${table.table_schema}.${table.table_name}:`, err);
            }
          }
        }
      }
    }
    
    // Step 2: Vacuum analyze main tables to optimize performance
    const mainTables = [
      'income_entries',
      'expenditure_entries',
      'liability_entries',
      'budget_entries',
      'accounts',
      'account_transactions',
      'bank_reconciliations',
      'assets',
      'asset_disposals'
    ];
    
    for (const table of mainTables) {
      try {
        const vacuumSQL = `VACUUM ANALYZE ${table};`;
        const { error: vacuumError } = await supabase.rpc("exec_sql", { sql: vacuumSQL });
        
        if (vacuumError) {
          console.error(`Error vacuuming table ${table}:`, vacuumError);
        } else {
          console.log(`Successfully vacuumed table ${table}`);
        }
      } catch (err) {
        console.error(`Exception vacuuming table ${table}:`, err);
      }
    }
    
    // Step 3: Update statistics for the query planner
    try {
      const analyzeSQL = `ANALYZE;`;
      const { error: analyzeError } = await supabase.rpc("exec_sql", { sql: analyzeSQL });
      
      if (analyzeError) {
        console.error("Error updating statistics:", analyzeError);
      } else {
        console.log("Successfully updated database statistics");
      }
    } catch (err) {
      console.error("Exception updating statistics:", err);
    }
    
    // Step 4: Verify and fix indexes on main tables
    const createIndexesSQL = `
      -- Add indexes to income_entries if they don't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'income_entries' AND indexname = 'idx_income_entries_date') THEN
          CREATE INDEX idx_income_entries_date ON income_entries(date);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'income_entries' AND indexname = 'idx_income_entries_category_id') THEN
          CREATE INDEX idx_income_entries_category_id ON income_entries(category_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'income_entries' AND indexname = 'idx_income_entries_account_id') THEN
          CREATE INDEX idx_income_entries_account_id ON income_entries(account_id);
        END IF;
        
        -- Add indexes to expenditure_entries if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenditure_entries' AND indexname = 'idx_expenditure_entries_date') THEN
          CREATE INDEX idx_expenditure_entries_date ON expenditure_entries(date);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenditure_entries' AND indexname = 'idx_expenditure_entries_category_id') THEN
          CREATE INDEX idx_expenditure_entries_category_id ON expenditure_entries(category_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenditure_entries' AND indexname = 'idx_expenditure_entries_account_id') THEN
          CREATE INDEX idx_expenditure_entries_account_id ON expenditure_entries(account_id);
        END IF;
        
        -- Add indexes to account_transactions if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'account_transactions' AND indexname = 'idx_account_transactions_account_id') THEN
          CREATE INDEX idx_account_transactions_account_id ON account_transactions(account_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'account_transactions' AND indexname = 'idx_account_transactions_date') THEN
          CREATE INDEX idx_account_transactions_date ON account_transactions(date);
        END IF;
      END $$;
    `;
    
    try {
      const { error: indexError } = await supabase.rpc("exec_sql", { sql: createIndexesSQL });
      
      if (indexError) {
        console.error("Error creating indexes:", indexError);
      } else {
        console.log("Successfully verified and created necessary indexes");
      }
    } catch (err) {
      console.error("Exception creating indexes:", err);
    }
    
    return NextResponse.json(
      { message: "Database cleanup completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during database cleanup:", error);
    return NextResponse.json(
      { error: "Failed to clean up database", details: error },
      { status: 500 }
    );
  }
}
