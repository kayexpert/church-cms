import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // SQL to create account_transactions table
    const sql = `
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

      -- Create index on reference_id and reference_type for faster lookups
      CREATE INDEX IF NOT EXISTS idx_account_transactions_reference ON account_transactions(reference_id, reference_type);
    `;

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error("Error creating account_transactions table:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Now sync existing income entries with account transactions
    const syncSql = `
      -- Insert account transactions for income entries that have an account_id
      INSERT INTO account_transactions (
        account_id,
        date,
        amount,
        description,
        transaction_type,
        reference_id,
        reference_type,
        created_at,
        updated_at
      )
      SELECT 
        i.account_id,
        i.date,
        i.amount,
        COALESCE(i.description, 'Income entry'),
        'income',
        i.id,
        'income_entry',
        NOW(),
        NOW()
      FROM income_entries i
      WHERE i.account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions 
        WHERE reference_id = i.id AND reference_type = 'income_entry'
      );

      -- Insert account transactions for expenditure entries that have an account_id
      INSERT INTO account_transactions (
        account_id,
        date,
        amount,
        description,
        transaction_type,
        reference_id,
        reference_type,
        created_at,
        updated_at
      )
      SELECT 
        e.account_id,
        e.date,
        -e.amount, -- Negative for expenditures
        COALESCE(e.description, 'Expenditure entry'),
        'expenditure',
        e.id,
        'expenditure_entry',
        NOW(),
        NOW()
      FROM expenditure_entries e
      WHERE e.account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions 
        WHERE reference_id = e.id AND reference_type = 'expenditure_entry'
      );
    `;

    // Execute the sync SQL
    const { error: syncError } = await supabase.rpc('exec_sql', { sql_query: syncSql });

    if (syncError) {
      console.error("Error syncing existing entries with account transactions:", syncError);
      return NextResponse.json({ success: false, error: syncError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Account transactions table created and synced successfully" });
  } catch (error) {
    console.error("Error in create-account-transactions-table route:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
