import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to fix expenditure entries in account transactions
 * This will ensure all expenditure entries are properly synced to the account_tx_table
 * and recalculate account balances
 */
export async function GET() {
  try {
    // First check if account_tx_table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('account_tx_table')
      .select('id')
      .limit(1);

    // If there's an error, the table might not exist
    if (checkError) {
      console.log("account_tx_table might not exist, creating it...");
      
      // Create the account_tx_table
      const createTableSql = `
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
        
        -- Create index on reference_id and reference_type for faster lookups
        CREATE INDEX IF NOT EXISTS idx_account_tx_table_reference ON account_tx_table(reference_id, reference_type);
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableSql });
      
      if (createError) {
        console.error("Error creating account_tx_table:", createError);
        return NextResponse.json({ 
          success: false, 
          error: createError.message,
          step: "create_table" 
        }, { status: 500 });
      }
    }

    // Get all expenditure entries with account_id
    const { data: expenditureEntries, error: fetchError } = await supabase
      .from("expenditure_entries")
      .select("*")
      .not("account_id", "is", null);

    if (fetchError) {
      console.error("Error fetching expenditure entries:", fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message,
        step: "fetch_entries" 
      }, { status: 500 });
    }

    console.log(`Found ${expenditureEntries?.length || 0} expenditure entries with account_id`);

    // Results to track what happened with each entry
    const results = [];

    // Process each expenditure entry
    if (expenditureEntries && expenditureEntries.length > 0) {
      for (const entry of expenditureEntries) {
        // Check if a transaction already exists for this entry
        const { data: existingTx, error: checkTxError } = await supabase
          .from("account_tx_table")
          .select("id")
          .eq("reference_id", entry.id)
          .eq("reference_type", "expenditure_entry")
          .maybeSingle();

        if (checkTxError) {
          console.error(`Error checking transaction for entry ${entry.id}:`, checkTxError);
          results.push({
            entry_id: entry.id,
            status: "error",
            message: `Error checking transaction: ${checkTxError.message}`
          });
          continue;
        }

        // If transaction exists, update it
        if (existingTx) {
          const { error: updateError } = await supabase
            .from("account_tx_table")
            .update({
              account_id: entry.account_id,
              date: entry.date,
              amount: -entry.amount, // Negative for expenditures
              description: entry.description || "Expenditure entry",
              updated_at: new Date().toISOString()
            })
            .eq("id", existingTx.id);

          if (updateError) {
            console.error(`Error updating transaction for entry ${entry.id}:`, updateError);
            results.push({
              entry_id: entry.id,
              status: "error",
              message: `Error updating transaction: ${updateError.message}`
            });
            continue;
          }

          console.log(`Updated transaction for entry ${entry.id}`);
          results.push({
            entry_id: entry.id,
            status: "updated",
            message: "Transaction updated successfully"
          });
        } else {
          // Create a new transaction
          const { error: insertError } = await supabase
            .from("account_tx_table")
            .insert({
              account_id: entry.account_id,
              date: entry.date,
              amount: -entry.amount, // Negative for expenditures
              description: entry.description || "Expenditure entry",
              transaction_type: "expenditure",
              reference_id: entry.id,
              reference_type: "expenditure_entry",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

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
            status: "created",
            message: "Transaction created successfully"
          });
        }
      }
    }

    // Now recalculate all account balances
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id");

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      return NextResponse.json({ 
        success: true, 
        message: "Transactions synced but failed to recalculate balances",
        results,
        accounts_error: accountsError.message
      });
    }

    const balanceResults = [];

    for (const account of accounts) {
      try {
        const { data: newBalance, error: recalcError } = await supabase
          .rpc("recalculate_account_balance", { account_id: account.id });

        if (recalcError) {
          console.error(`Error recalculating balance for account ${account.id}:`, recalcError);
          balanceResults.push({
            account_id: account.id,
            status: "error",
            message: recalcError.message
          });
        } else {
          console.log(`Recalculated balance for account ${account.id}: ${newBalance}`);
          balanceResults.push({
            account_id: account.id,
            status: "success",
            new_balance: newBalance
          });
        }
      } catch (error) {
        console.error(`Exception recalculating balance for account ${account.id}:`, error);
        balanceResults.push({
          account_id: account.id,
          status: "error",
          message: String(error)
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Expenditure transactions fixed and account balances recalculated",
      results,
      balance_results: balanceResults
    });
  } catch (error) {
    console.error("Error in fix-expenditure-transactions route:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error)
    }, { status: 500 });
  }
}
