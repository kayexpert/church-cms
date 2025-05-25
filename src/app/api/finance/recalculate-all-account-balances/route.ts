import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to recalculate all account balances
 * This will recalculate the balance for all accounts based on their transactions
 */
export async function GET() {
  try {
    console.log("Starting account balance recalculation process...");
    
    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name, opening_balance");
    
    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      return NextResponse.json({ 
        success: false, 
        error: accountsError.message 
      }, { status: 500 });
    }
    
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No accounts found to recalculate" 
      });
    }
    
    console.log(`Found ${accounts.length} accounts to recalculate`);
    
    // Results to track success/failure for each account
    const results = [];
    
    // Recalculate balance for each account
    for (const account of accounts) {
      try {
        console.log(`Recalculating balance for account ${account.id} (${account.name})...`);
        
        // First try to get transactions from account_tx_table
        let transactions;
        let transactionError;
        
        try {
          const { data, error } = await supabase
            .from("account_tx_table")
            .select("*")
            .eq("account_id", account.id);
          
          transactions = data;
          transactionError = error;
        } catch (error) {
          console.error(`Error fetching transactions from account_tx_table for account ${account.id}:`, error);
          transactionError = error;
        }
        
        // If there was an error or no transactions found, try account_transactions
        if (transactionError || !transactions || transactions.length === 0) {
          console.log(`Falling back to account_transactions for account ${account.id}...`);
          
          try {
            const { data, error } = await supabase
              .from("account_transactions")
              .select("*")
              .eq("account_id", account.id);
            
            transactions = data;
            transactionError = error;
          } catch (error) {
            console.error(`Error fetching transactions from account_transactions for account ${account.id}:`, error);
            transactionError = error;
          }
        }
        
        if (transactionError) {
          console.error(`Error fetching transactions for account ${account.id}:`, transactionError);
          results.push({
            account_id: account.id,
            account_name: account.name,
            success: false,
            error: transactionError.message || "Error fetching transactions"
          });
          continue;
        }
        
        // Calculate the new balance
        let calculatedBalance = account.opening_balance || 0;
        
        if (transactions && transactions.length > 0) {
          // Import the calculation function
          const { calculateAccountBalance } = await import("@/lib/calculate-account-balance");
          
          // Calculate the balance
          calculatedBalance = calculateAccountBalance(account, transactions);
          console.log(`Calculated balance for account ${account.id}: ${calculatedBalance} from ${transactions.length} transactions`);
        } else {
          console.log(`No transactions found for account ${account.id}, using opening balance: ${calculatedBalance}`);
        }
        
        // Update the account balance
        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            balance: calculatedBalance,
            updated_at: new Date().toISOString()
          })
          .eq("id", account.id);
        
        if (updateError) {
          console.error(`Error updating balance for account ${account.id}:`, updateError);
          results.push({
            account_id: account.id,
            account_name: account.name,
            success: false,
            error: updateError.message || "Error updating account balance"
          });
        } else {
          results.push({
            account_id: account.id,
            account_name: account.name,
            success: true,
            new_balance: calculatedBalance
          });
        }
      } catch (error) {
        console.error(`Error recalculating balance for account ${account.id}:`, error);
        results.push({
          account_id: account.id,
          account_name: account.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({ 
      success: true, 
      message: `Recalculated balances for ${successCount} accounts${failureCount > 0 ? ` (${failureCount} failed)` : ''}`,
      results
    });
  } catch (error) {
    console.error("Unexpected error in recalculate-all-account-balances:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
