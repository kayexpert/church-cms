import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name");

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      return NextResponse.json({ success: false, error: accountsError.message }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ success: true, message: "No accounts to recalculate" });
    }

    // For each account, recalculate the balance
    const results = [];
    
    for (const account of accounts) {
      try {
        // Get all transactions for this account
        const { data: transactions, error: txError } = await supabase
          .from("account_transactions")
          .select("amount, transaction_type")
          .eq("account_id", account.id);

        if (txError) {
          console.error(`Error fetching transactions for account ${account.id}:`, txError);
          results.push({
            account_id: account.id,
            account_name: account.name,
            status: "error",
            message: `Error fetching transactions: ${txError.message}`
          });
          continue;
        }

        // Calculate the new balance
        let newBalance = 0;
        
        if (transactions && transactions.length > 0) {
          newBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        }

        // Get the opening balance
        const { data: accountData, error: accountError } = await supabase
          .from("accounts")
          .select("opening_balance")
          .eq("id", account.id)
          .single();

        if (accountError) {
          console.error(`Error fetching opening balance for account ${account.id}:`, accountError);
        } else if (accountData && accountData.opening_balance) {
          newBalance += accountData.opening_balance;
        }

        // Update the account balance
        const { error: updateError } = await supabase
          .from("accounts")
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq("id", account.id);

        if (updateError) {
          console.error(`Error updating balance for account ${account.id}:`, updateError);
          results.push({
            account_id: account.id,
            account_name: account.name,
            status: "error",
            message: `Error updating balance: ${updateError.message}`
          });
          continue;
        }

        console.log(`Recalculated balance for account ${account.name}: ${newBalance}`);
        results.push({
          account_id: account.id,
          account_name: account.name,
          status: "success",
          new_balance: newBalance
        });
      } catch (error) {
        console.error(`Error recalculating balance for account ${account.id}:`, error);
        results.push({
          account_id: account.id,
          account_name: account.name,
          status: "error",
          message: String(error)
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Account balances recalculated successfully",
      results
    });
  } catch (error) {
    console.error("Error in recalculate-account-balances route:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
