import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to fix account transactions tables
 * This will ensure both account_transactions and account_tx_table exist,
 * are properly synchronized, and have the correct data
 */
export async function GET() {
  try {
    console.log("Starting account transactions fix process...");

    // Step 1: Ensure both tables exist
    const createTablesSql = `
      -- Create account_transactions table if it doesn't exist
      CREATE TABLE IF NOT EXISTS account_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id UUID NOT NULL REFERENCES accounts(id),
        date DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        transaction_type VARCHAR(50) NOT NULL,
        reference_id UUID,
        reference_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index on account_id for faster queries
      CREATE INDEX IF NOT EXISTS idx_account_transactions_account ON account_transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_transactions_reference ON account_transactions(reference_id, reference_type);

      -- Create account_tx_table if it doesn't exist
      CREATE TABLE IF NOT EXISTS account_tx_table (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id UUID NOT NULL REFERENCES accounts(id),
        date DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        transaction_type VARCHAR(50) NOT NULL,
        reference_id UUID,
        reference_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index on account_id for faster queries
      CREATE INDEX IF NOT EXISTS idx_account_tx_table_account ON account_tx_table(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_tx_table_reference ON account_tx_table(reference_id, reference_type);
    `;

    // Execute the SQL to create tables
    // Try with sql_query parameter first
    let createError;
    try {
      const result = await supabase.rpc('exec_sql', { sql_query: createTablesSql });
      createError = result.error;
    } catch (error) {
      console.warn("Error with sql_query parameter, trying with sql parameter:", error);
      // Try with sql parameter as fallback
      try {
        const result = await supabase.rpc('exec_sql', { sql: createTablesSql });
        createError = result.error;
      } catch (fallbackError) {
        console.error("Both parameter attempts failed:", fallbackError);
        createError = fallbackError;
      }
    }

    if (createError) {
      console.error("Error creating transaction tables:", createError);
      return NextResponse.json({
        success: false,
        error: createError.message,
        step: "create_tables"
      }, { status: 500 });
    }

    // Step 2: Create a view that combines both tables (for backward compatibility)
    const createViewSql = `
      -- Create or replace a view that combines both tables
      CREATE OR REPLACE VIEW account_transactions_view AS
      SELECT * FROM account_tx_table;
    `;

    // Try with sql_query parameter first
    let viewError;
    try {
      const result = await supabase.rpc('exec_sql', { sql_query: createViewSql });
      viewError = result.error;
    } catch (error) {
      console.warn("Error with sql_query parameter, trying with sql parameter:", error);
      // Try with sql parameter as fallback
      try {
        const result = await supabase.rpc('exec_sql', { sql: createViewSql });
        viewError = result.error;
      } catch (fallbackError) {
        console.error("Both parameter attempts failed:", fallbackError);
        viewError = fallbackError;
      }
    }

    if (viewError) {
      console.error("Error creating transactions view:", viewError);
      // Continue anyway, this is not critical
    }

    // Step 3: Sync data between the tables
    // First, copy from account_transactions to account_tx_table
    const syncFromOldToNewSql = `
      -- Insert transactions from account_transactions to account_tx_table if they don't exist
      INSERT INTO account_tx_table (
        id, account_id, date, amount, description, transaction_type,
        reference_id, reference_type, created_at, updated_at
      )
      SELECT
        id, account_id, date, amount, description, transaction_type,
        reference_id, reference_type, created_at, updated_at
      FROM account_transactions
      WHERE NOT EXISTS (
        SELECT 1 FROM account_tx_table
        WHERE (reference_id = account_transactions.reference_id AND reference_type = account_transactions.reference_type)
        OR id = account_transactions.id
      );
    `;

    // Try with sql_query parameter first
    let syncOldToNewError;
    try {
      const result = await supabase.rpc('exec_sql', { sql_query: syncFromOldToNewSql });
      syncOldToNewError = result.error;
    } catch (error) {
      console.warn("Error with sql_query parameter, trying with sql parameter:", error);
      // Try with sql parameter as fallback
      try {
        const result = await supabase.rpc('exec_sql', { sql: syncFromOldToNewSql });
        syncOldToNewError = result.error;
      } catch (fallbackError) {
        console.error("Both parameter attempts failed:", fallbackError);
        syncOldToNewError = fallbackError;
      }
    }

    if (syncOldToNewError) {
      console.error("Error syncing from account_transactions to account_tx_table:", syncOldToNewError);
      // Continue anyway, we'll try the other direction
    }

    // Then, copy from account_tx_table to account_transactions
    const syncFromNewToOldSql = `
      -- Insert transactions from account_tx_table to account_transactions if they don't exist
      INSERT INTO account_transactions (
        id, account_id, date, amount, description, transaction_type,
        reference_id, reference_type, created_at, updated_at
      )
      SELECT
        id, account_id, date, amount, description, transaction_type,
        reference_id, reference_type, created_at, updated_at
      FROM account_tx_table
      WHERE NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE (reference_id = account_tx_table.reference_id AND reference_type = account_tx_table.reference_type)
        OR id = account_tx_table.id
      );
    `;

    // Try with sql_query parameter first
    let syncNewToOldError;
    try {
      const result = await supabase.rpc('exec_sql', { sql_query: syncFromNewToOldSql });
      syncNewToOldError = result.error;
    } catch (error) {
      console.warn("Error with sql_query parameter, trying with sql parameter:", error);
      // Try with sql parameter as fallback
      try {
        const result = await supabase.rpc('exec_sql', { sql: syncFromNewToOldSql });
        syncNewToOldError = result.error;
      } catch (fallbackError) {
        console.error("Both parameter attempts failed:", fallbackError);
        syncNewToOldError = fallbackError;
      }
    }

    if (syncNewToOldError) {
      console.error("Error syncing from account_tx_table to account_transactions:", syncNewToOldError);
      // Continue anyway, we'll try to sync from source data
    }

    // Step 4: Sync from source data (income_entries and expenditure_entries)
    const syncFromSourceSql = `
      -- Insert account transactions for income entries that have an account_id
      INSERT INTO account_tx_table (
        account_id, date, amount, description, transaction_type, reference_id, reference_type
      )
      SELECT
        i.account_id, i.date, i.amount,
        COALESCE(i.description, 'Income entry'), 'income', i.id, 'income_entry'
      FROM income_entries i
      WHERE i.account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_tx_table
        WHERE reference_id = i.id AND reference_type = 'income_entry'
      );

      -- Insert account transactions for expenditure entries that have an account_id
      INSERT INTO account_tx_table (
        account_id, date, amount, description, transaction_type, reference_id, reference_type
      )
      SELECT
        e.account_id, e.date, -e.amount,
        COALESCE(e.description, 'Expenditure entry'), 'expenditure', e.id, 'expenditure_entry'
      FROM expenditure_entries e
      WHERE e.account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_tx_table
        WHERE reference_id = e.id AND reference_type = 'expenditure_entry'
      );

      -- Also sync to the original account_transactions table
      INSERT INTO account_transactions (
        account_id, date, amount, description, transaction_type, reference_id, reference_type
      )
      SELECT
        i.account_id, i.date, i.amount,
        COALESCE(i.description, 'Income entry'), 'income', i.id, 'income_entry'
      FROM income_entries i
      WHERE i.account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE reference_id = i.id AND reference_type = 'income_entry'
      );

      INSERT INTO account_transactions (
        account_id, date, amount, description, transaction_type, reference_id, reference_type
      )
      SELECT
        e.account_id, e.date, -e.amount,
        COALESCE(e.description, 'Expenditure entry'), 'expenditure', e.id, 'expenditure_entry'
      FROM expenditure_entries e
      WHERE e.account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE reference_id = e.id AND reference_type = 'expenditure_entry'
      );
    `;

    // Try with sql_query parameter first
    let syncSourceError;
    try {
      const result = await supabase.rpc('exec_sql', { sql_query: syncFromSourceSql });
      syncSourceError = result.error;
    } catch (error) {
      console.warn("Error with sql_query parameter, trying with sql parameter:", error);
      // Try with sql parameter as fallback
      try {
        const result = await supabase.rpc('exec_sql', { sql: syncFromSourceSql });
        syncSourceError = result.error;
      } catch (fallbackError) {
        console.error("Both parameter attempts failed:", fallbackError);
        syncSourceError = fallbackError;
      }
    }

    if (syncSourceError) {
      console.error("Error syncing from source data:", syncSourceError);
      return NextResponse.json({
        success: false,
        error: syncSourceError.message,
        step: "sync_from_source"
      }, { status: 500 });
    }

    // Step 5: Recalculate account balances
    const recalculateBalancesSql = `
      -- Create a temporary function to recalculate account balances
      CREATE OR REPLACE FUNCTION temp_recalculate_account_balances() RETURNS void AS $$
      DECLARE
        acc RECORD;
        income_total DECIMAL(12,2);
        expenditure_total DECIMAL(12,2);
        transfer_in_total DECIMAL(12,2);
        transfer_out_total DECIMAL(12,2);
        new_balance DECIMAL(12,2);
      BEGIN
        FOR acc IN SELECT id, opening_balance FROM accounts LOOP
          -- Calculate income total
          SELECT COALESCE(SUM(amount), 0) INTO income_total
          FROM account_tx_table
          WHERE account_id = acc.id AND transaction_type = 'income';

          -- Calculate expenditure total
          SELECT COALESCE(SUM(amount), 0) INTO expenditure_total
          FROM account_tx_table
          WHERE account_id = acc.id AND transaction_type = 'expenditure';

          -- Calculate transfer in total
          SELECT COALESCE(SUM(amount), 0) INTO transfer_in_total
          FROM account_tx_table
          WHERE account_id = acc.id AND transaction_type = 'transfer_in';

          -- Calculate transfer out total
          SELECT COALESCE(SUM(amount), 0) INTO transfer_out_total
          FROM account_tx_table
          WHERE account_id = acc.id AND transaction_type = 'transfer_out';

          -- Calculate new balance
          new_balance := COALESCE(acc.opening_balance, 0) + income_total + expenditure_total + transfer_in_total + transfer_out_total;

          -- Update account balance
          UPDATE accounts
          SET balance = new_balance,
              updated_at = NOW()
          WHERE id = acc.id;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;

      -- Execute the function
      SELECT temp_recalculate_account_balances();

      -- Drop the temporary function
      DROP FUNCTION temp_recalculate_account_balances();
    `;

    // Try with sql_query parameter first
    let recalculateError;
    try {
      const result = await supabase.rpc('exec_sql', { sql_query: recalculateBalancesSql });
      recalculateError = result.error;
    } catch (error) {
      console.warn("Error with sql_query parameter, trying with sql parameter:", error);
      // Try with sql parameter as fallback
      try {
        const result = await supabase.rpc('exec_sql', { sql: recalculateBalancesSql });
        recalculateError = result.error;
      } catch (fallbackError) {
        console.error("Both parameter attempts failed:", fallbackError);
        recalculateError = fallbackError;
      }
    }

    if (recalculateError) {
      console.error("Error recalculating account balances:", recalculateError);
      return NextResponse.json({
        success: false,
        error: recalculateError.message,
        step: "recalculate_balances"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Account transactions fixed successfully"
    });
  } catch (error) {
    console.error("Unexpected error in fix-account-transactions:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
