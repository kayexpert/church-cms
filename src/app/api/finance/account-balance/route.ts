import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Define schema for fetching account balance
const accountBalanceSchema = z.object({
  account_id: z.string().uuid(),
});

/**
 * GET /api/finance/account-balance
 * Fetch current balance for a specific account
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const accountId = url.searchParams.get("account_id");

    // Validate parameters
    const result = accountBalanceSchema.safeParse({
      account_id: accountId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: result.error.format() },
        { status: 400 }
      );
    }

    // Fetch account details
    console.log(`Fetching account balance for account ID: ${accountId}`);
    const { data, error } = await supabase
      .from("accounts")
      .select("id, name, balance")
      .eq("id", accountId)
      .single();

    if (error) {
      console.error("Error fetching account balance:", error);

      // If the account doesn't exist in the database, try to calculate the balance from transactions
      if (error.code === 'PGRST116' || error.message.includes('no rows')) {
        console.log(`Account with ID ${accountId} not found, calculating balance from transactions`);

        // Get all transactions for this account
        const { data: transactions, error: txError } = await supabase
          .from("account_transactions")
          .select("*")
          .eq("account_id", accountId);

        if (txError) {
          console.error("Error fetching transactions:", txError);
          return NextResponse.json({
            data: {
              id: accountId,
              name: "Unknown Account",
              balance: 0
            }
          });
        }

        // If we have transactions, calculate the balance
        if (transactions && transactions.length > 0) {
          // Import the calculation function
          const { calculateAccountBalance } = await import("@/lib/calculate-account-balance");

          // Create a minimal account object
          const accountObj = {
            id: accountId,
            name: "Unknown Account",
            opening_balance: 0,
            balance: 0
          };

          // Calculate the balance
          const calculatedBalance = calculateAccountBalance(accountObj, transactions);
          console.log(`Calculated balance from ${transactions.length} transactions: ${calculatedBalance}`);

          return NextResponse.json({
            data: {
              id: accountId,
              name: "Unknown Account",
              balance: calculatedBalance
            }
          });
        } else {
          // No transactions found, return default account with 0 balance
          return NextResponse.json({
            data: {
              id: accountId,
              name: "Unknown Account",
              balance: 0
            }
          });
        }
      }

      return NextResponse.json(
        { error: "Failed to fetch account balance", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      console.log(`No data returned for account ID ${accountId}, returning default account`);
      return NextResponse.json({
        data: {
          id: accountId,
          name: "Unknown Account",
          balance: 0
        }
      });
    }

    // If balance is null or undefined, calculate it from transactions
    if (data.balance === null || data.balance === undefined) {
      console.log(`Account balance is ${data.balance === null ? 'null' : 'undefined'}, attempting to recalculate`);

      try {
        // Get all transactions for this account
        const { data: transactions, error: txError } = await supabase
          .from("account_transactions")
          .select("*")
          .eq("account_id", accountId);

        if (txError) {
          console.error("Error fetching transactions:", txError);
          return NextResponse.json(
            { error: "Failed to calculate account balance", details: txError.message },
            { status: 500 }
          );
        }

        // Import the calculation function
        const { calculateAccountBalance } = await import("@/lib/calculate-account-balance");

        // Calculate the balance using our centralized utility
        const calculatedBalance = calculateAccountBalance(data, transactions || []);
        console.log(`Calculated balance from ${transactions?.length || 0} transactions: ${calculatedBalance}`);

        // Return the calculated balance
        return NextResponse.json({
          data: {
            ...data,
            balance: calculatedBalance
          }
        });
      } catch (err) {
        console.error("Exception in account balance calculation:", err);
        return NextResponse.json(
          { error: "Exception in account balance calculation", details: String(err) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in GET /api/finance/account-balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch account balance", message: String(error) },
      { status: 500 }
    );
  }
}
