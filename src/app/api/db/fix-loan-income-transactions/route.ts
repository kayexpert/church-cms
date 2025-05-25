import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // First, let's check if we have any loan income entries that need to be fixed
    const { data: loanIncomeEntries, error: fetchError } = await supabase
      .from("income_entries")
      .select("*")
      .eq("category_id", "d2f979ae-8f2c-4c44-9e6c-5e9331e2a303") // Loan category ID
      .is("account_id", "not.null"); // Only entries with an account

    if (fetchError) {
      console.error("Error fetching loan income entries:", fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    console.log(`Found ${loanIncomeEntries?.length || 0} loan income entries with accounts`);

    // For each loan income entry, ensure it has a corresponding account transaction
    const results = [];
    
    if (loanIncomeEntries && loanIncomeEntries.length > 0) {
      for (const entry of loanIncomeEntries) {
        // Check if a transaction already exists
        const { data: existingTransactions, error: checkError } = await supabase
          .from("account_transactions")
          .select("*")
          .eq("reference_id", entry.id)
          .eq("reference_type", "income_entry");

        if (checkError) {
          console.error(`Error checking transactions for entry ${entry.id}:`, checkError);
          results.push({
            entry_id: entry.id,
            status: "error",
            message: `Error checking transactions: ${checkError.message}`
          });
          continue;
        }

        // If a transaction already exists, skip this entry
        if (existingTransactions && existingTransactions.length > 0) {
          console.log(`Entry ${entry.id} already has a transaction`);
          results.push({
            entry_id: entry.id,
            status: "skipped",
            message: "Transaction already exists"
          });
          continue;
        }

        // Create a new account transaction
        const transactionData = {
          account_id: entry.account_id,
          date: entry.date,
          amount: entry.amount,
          description: entry.description || "Loan income entry",
          transaction_type: "income",
          reference_id: entry.id,
          reference_type: "income_entry",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from("account_transactions")
          .insert(transactionData);

        if (insertError) {
          console.error(`Error creating transaction for entry ${entry.id}:`, insertError);
          results.push({
            entry_id: entry.id,
            status: "error",
            message: `Error creating transaction: ${insertError.message}`
          });
          continue;
        }

        console.log(`Created transaction for entry ${entry.id}`);
        results.push({
          entry_id: entry.id,
          status: "success",
          message: "Transaction created successfully"
        });

        // Recalculate the account balance
        try {
          await supabase.rpc("recalculate_account_balance", {
            account_id: entry.account_id
          });
          console.log(`Recalculated balance for account ${entry.account_id}`);
        } catch (recalcError) {
          console.error(`Error recalculating balance for account ${entry.account_id}:`, recalcError);
        }
      }
    }

    // Now let's fix the account_transactions view to ensure it includes all transactions
    const fixViewSql = `
      -- Drop the existing view
      DROP VIEW IF EXISTS account_transactions_view;
      
      -- Create a new view with a different name to avoid conflicts with the table
      CREATE OR REPLACE VIEW account_transactions_view AS
      -- Income entries (positive impact on account balance)
      SELECT 
        i.id,
        i.date,
        i.account_id,
        'income' as transaction_type,
        i.amount,
        i.description,
        i.created_at
      FROM income_entries i
      WHERE i.account_id IS NOT NULL
      
      UNION ALL
      
      -- Expenditure entries (negative impact on account balance)
      SELECT 
        e.id,
        e.date,
        e.account_id,
        'expenditure' as transaction_type,
        -e.amount as amount, -- Negative amount for expenditures
        e.description,
        e.created_at
      FROM expenditure_entries e
      WHERE e.account_id IS NOT NULL
      
      UNION ALL
      
      -- Outgoing transfers (negative impact on source account)
      SELECT 
        t.id,
        t.date,
        t.source_account_id as account_id,
        'transfer_out' as transaction_type,
        -t.amount as amount, -- Negative amount for outgoing transfers
        t.description,
        t.created_at
      FROM account_transfers t
      
      UNION ALL
      
      -- Incoming transfers (positive impact on destination account)
      SELECT 
        t.id,
        t.date,
        t.destination_account_id as account_id,
        'transfer_in' as transaction_type,
        t.amount, -- Positive amount for incoming transfers
        t.description,
        t.created_at
      FROM account_transfers t;
    `;

    // Execute the SQL to fix the view
    const { error: viewError } = await supabase.rpc('exec_sql', { sql_query: fixViewSql });

    if (viewError) {
      console.error("Error fixing account_transactions view:", viewError);
      return NextResponse.json({ 
        success: false, 
        error: viewError.message,
        results 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Loan income transactions fixed successfully",
      results
    });
  } catch (error) {
    console.error("Error in fix-loan-income-transactions route:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
