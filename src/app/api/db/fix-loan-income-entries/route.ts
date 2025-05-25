import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { syncIncomeEntryWithAccountTransactions } from "@/lib/sync-account-transactions";

export async function GET() {
  try {
    // First, let's check if we have any loan income entries that need to be fixed
    const { data: loanIncomeEntries, error: fetchError } = await supabase
      .from("income_entries")
      .select("*")
      .ilike("description", "Loan from%");

    if (fetchError) {
      console.error("Error fetching loan income entries:", fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    console.log(`Found ${loanIncomeEntries?.length || 0} loan income entries`);

    // For each loan income entry, ensure it has an account_id and is properly synced
    const results = [];
    
    if (loanIncomeEntries && loanIncomeEntries.length > 0) {
      for (const entry of loanIncomeEntries) {
        try {
          // Check if this entry has a liability_id in payment_details
          let liabilityId = null;
          
          if (entry.payment_details) {
            const paymentDetails = typeof entry.payment_details === 'string'
              ? JSON.parse(entry.payment_details)
              : entry.payment_details;
              
            if (paymentDetails && paymentDetails.liability_id) {
              liabilityId = paymentDetails.liability_id;
            }
          }
          
          if (!liabilityId) {
            console.log(`Entry ${entry.id} has no liability_id in payment_details, skipping`);
            results.push({
              entry_id: entry.id,
              status: "skipped",
              message: "No liability_id in payment_details"
            });
            continue;
          }
          
          // Check if the liability entry has an account_id
          const { data: liabilityData, error: liabilityError } = await supabase
            .from("liability_entries")
            .select("account_id")
            .eq("id", liabilityId)
            .single();
            
          if (liabilityError) {
            console.error(`Error fetching liability for entry ${entry.id}:`, liabilityError);
            results.push({
              entry_id: entry.id,
              status: "error",
              message: `Error fetching liability: ${liabilityError.message}`
            });
            continue;
          }
          
          // If the liability has no account_id, check localStorage
          let accountId = liabilityData?.account_id || null;
          
          if (!accountId) {
            console.log(`Liability ${liabilityId} has no account_id, checking localStorage`);
            
            // We can't access localStorage from the server, so we'll need to rely on the client
            // to fix this. For now, we'll just report that this entry needs manual fixing.
            results.push({
              entry_id: entry.id,
              liability_id: liabilityId,
              status: "needs_manual_fix",
              message: "Liability has no account_id"
            });
            continue;
          }
          
          // Update the income entry with the account_id
          const { error: updateError } = await supabase
            .from("income_entries")
            .update({ account_id: accountId })
            .eq("id", entry.id);
            
          if (updateError) {
            console.error(`Error updating account_id for entry ${entry.id}:`, updateError);
            results.push({
              entry_id: entry.id,
              status: "error",
              message: `Error updating account_id: ${updateError.message}`
            });
            continue;
          }
          
          // Sync the income entry with account transactions
          await syncIncomeEntryWithAccountTransactions(entry.id);
          
          // Recalculate the account balance
          await supabase.rpc("recalculate_account_balance", {
            account_id: accountId
          });
          
          console.log(`Fixed entry ${entry.id} with account_id ${accountId}`);
          results.push({
            entry_id: entry.id,
            liability_id: liabilityId,
            account_id: accountId,
            status: "success",
            message: "Entry fixed successfully"
          });
        } catch (error) {
          console.error(`Error fixing entry ${entry.id}:`, error);
          results.push({
            entry_id: entry.id,
            status: "error",
            message: String(error)
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Loan income entries fixed successfully",
      results
    });
  } catch (error) {
    console.error("Error in fix-loan-income-entries route:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
