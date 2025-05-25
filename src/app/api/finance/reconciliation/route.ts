import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Define schema for fetching transactions
const fetchTransactionsSchema = z.object({
  account_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
});

// Define schema for updating transaction reconciliation status
const updateReconciliationSchema = z.object({
  transaction_id: z.string().uuid(),
  is_reconciled: z.boolean(),
  reconciliation_id: z.string().uuid(),
});

// Define schema for batch updating transaction reconciliation status
const batchUpdateReconciliationSchema = z.object({
  transaction_ids: z.array(z.string().uuid()),
  is_reconciled: z.boolean(),
  reconciliation_id: z.string().uuid(),
});

/**
 * GET /api/finance/reconciliation
 * Fetch transactions for reconciliation
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const accountId = url.searchParams.get("account_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const reconciliationId = url.searchParams.get("reconciliation_id");

    // Validate parameters
    const result = fetchTransactionsSchema.safeParse({
      account_id: accountId,
      start_date: startDate,
      end_date: endDate,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: result.error.format() },
        { status: 400 }
      );
    }

    // First try to fetch from account_tx_table if it exists
    let data;
    let error;

    try {
      console.log(`Fetching transactions for account ${accountId} from ${startDate} to ${endDate}`);

      // Try account_transactions view first since it has more data
      const viewResult = await supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", accountId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      console.log("account_transactions result:", viewResult);

      if (viewResult.error) {
        console.error("Error fetching from account_transactions:", viewResult.error);

        // Fallback to account_tx_table
        const txTableResult = await supabase
          .from("account_tx_table")
          .select("*")
          .eq("account_id", accountId)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false });

        console.log("account_tx_table result:", txTableResult);
        data = txTableResult.data || [];
        error = txTableResult.error;
      } else {
        data = viewResult.data || [];
        error = viewResult.error;
      }

      console.log(`Found ${data?.length || 0} transactions for account ${accountId} from ${startDate} to ${endDate}`);

      // If we have data, get reconciliation status
      if (data && data.length > 0) {
        // Get transaction IDs
        const transactionIds = data.map(tx => tx.id);

        // First check transaction_reconciliations table since it's the most reliable
        const { data: transactionReconciliations, error: reconciliationsError } = await supabase
          .from("transaction_reconciliations")
          .select("transaction_id, is_reconciled, reconciliation_id")
          .eq("reconciliation_id", reconciliationId || "00000000-0000-0000-0000-000000000000") // Use a dummy ID if none provided
          .in("transaction_id", transactionIds);

        if (reconciliationsError) {
          console.error("Error fetching transaction_reconciliations:", reconciliationsError);
        } else if (transactionReconciliations && transactionReconciliations.length > 0) {
          console.log(`Found ${transactionReconciliations.length} reconciliation records in transaction_reconciliations`);

          // Create a map of transaction ID to reconciliation status
          const reconciliationMap = {};
          transactionReconciliations.forEach(item => {
            reconciliationMap[item.transaction_id] = {
              is_reconciled: item.is_reconciled,
              reconciliation_id: item.reconciliation_id
            };
          });

          // Merge reconciliation data with transactions
          data = data.map(tx => {
            if (reconciliationMap[tx.id]) {
              return {
                ...tx,
                is_reconciled: reconciliationMap[tx.id].is_reconciled,
                reconciliation_id: reconciliationMap[tx.id].reconciliation_id
              };
            }
            return {
              ...tx,
              is_reconciled: false,
              reconciliation_id: null
            };
          });
        } else {
          console.log("No transaction_reconciliations found, checking account_tx_table");

          // Try to get reconciliation status from account_tx_table
          const { data: txTableData, error: txTableError } = await supabase
            .from("account_tx_table")
            .select("id, is_reconciled, reconciliation_id")
            .in("id", transactionIds);

          if (txTableError) {
            console.error("Error fetching reconciliation status from account_tx_table:", txTableError);
          } else if (txTableData && txTableData.length > 0) {
            console.log(`Found ${txTableData.length} transactions with reconciliation status in account_tx_table`);

            // Create a map of transaction ID to reconciliation status
            const reconciliationMap = {};
            txTableData.forEach(tx => {
              reconciliationMap[tx.id] = {
                is_reconciled: tx.is_reconciled,
                reconciliation_id: tx.reconciliation_id
              };
            });

            // Merge reconciliation data with transactions
            data = data.map(tx => {
              if (reconciliationMap[tx.id]) {
                return {
                  ...tx,
                  is_reconciled: reconciliationMap[tx.id].is_reconciled === null ? false : reconciliationMap[tx.id].is_reconciled,
                  reconciliation_id: reconciliationMap[tx.id].reconciliation_id
                };
              }
              return {
                ...tx,
                is_reconciled: false,
                reconciliation_id: null
              };
            });
          } else {
            console.log("No reconciliation status found in account_tx_table, checking reconciliation_items");

            // Try to get reconciliation status from reconciliation_items
            const { data: reconciliationItems, error: itemsError } = await supabase
              .from("reconciliation_items")
              .select("transaction_id, is_cleared, reconciliation_id")
              .in("transaction_id", transactionIds);

            if (itemsError) {
              console.error("Error fetching reconciliation_items:", itemsError);
            } else if (reconciliationItems && reconciliationItems.length > 0) {
              console.log(`Found ${reconciliationItems.length} reconciliation items`);

              // Create a map of transaction ID to reconciliation status
              const reconciliationMap = {};
              reconciliationItems.forEach(item => {
                reconciliationMap[item.transaction_id] = {
                  is_reconciled: item.is_cleared,
                  reconciliation_id: item.reconciliation_id
                };
              });

              // Merge reconciliation data with transactions
              data = data.map(tx => {
                if (reconciliationMap[tx.id]) {
                  return {
                    ...tx,
                    is_reconciled: reconciliationMap[tx.id].is_reconciled,
                    reconciliation_id: reconciliationMap[tx.id].reconciliation_id
                  };
                }
                return {
                  ...tx,
                  is_reconciled: false,
                  reconciliation_id: null
                };
              });
            } else {
              console.log("No reconciliation items found, marking all as unreconciled");
              data = data.map(tx => ({
                ...tx,
                is_reconciled: false,
                reconciliation_id: null
              }));
            }
          }
        }
      } else {
        console.log(`No transactions found for account ${accountId} from ${startDate} to ${endDate}`);
      }

      // If no transactions found, try fetching all transactions for this account
      // This is for debugging purposes
      if (!error && (!data || data.length === 0)) {
        console.log("No transactions found in date range, fetching all transactions for this account");

        const allTxResult = await supabase
          .from("account_transactions")
          .select("*")
          .eq("account_id", accountId)
          .order("date", { ascending: false });

        if (!allTxResult.error && allTxResult.data) {
          console.log(`Found ${allTxResult.data.length} total transactions for this account`);
          if (allTxResult.data.length > 0) {
            console.log("Sample transaction dates:",
              allTxResult.data.slice(0, 5).map(tx => tx.date));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      error = { message: String(err) };
    }

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch transactions", details: error.message },
        { status: 500 }
      );
    }

    // If reconciliation_id is provided, also fetch already reconciled transactions
    if (reconciliationId) {
      let reconciledData = [];
      let reconciledError = null;

      try {
        console.log(`Fetching reconciled transactions for reconciliation ${reconciliationId}`);

        // First try to get reconciled transactions from reconciliation_items
        const { data: reconciliationItems, error: itemsError } = await supabase
          .from("reconciliation_items")
          .select("*")
          .eq("reconciliation_id", reconciliationId);

        if (itemsError) {
          console.error("Error fetching reconciliation_items:", itemsError);
          reconciledError = itemsError;
        } else if (reconciliationItems && reconciliationItems.length > 0) {
          console.log(`Found ${reconciliationItems.length} reconciliation items`);

          // Get the transaction IDs
          const transactionIds = reconciliationItems
            .filter(item => item.transaction_id) // Filter out null transaction_ids
            .map(item => item.transaction_id);

          if (transactionIds.length > 0) {
            // Fetch from account_transactions view
            const { data: txViewData, error: txViewError } = await supabase
              .from("account_transactions")
              .select("*")
              .in("id", transactionIds)
              .order("date", { ascending: false });

            if (txViewError) {
              console.error("Error fetching transactions from account_transactions:", txViewError);
              reconciledError = txViewError;
            } else if (txViewData && txViewData.length > 0) {
              console.log(`Retrieved ${txViewData.length} transactions from account_transactions`);

              // Create a map of reconciliation items by transaction ID
              const itemMap = {};
              reconciliationItems.forEach(item => {
                itemMap[item.transaction_id] = item;
              });

              // Add is_reconciled flag to each transaction
              reconciledData = txViewData.map(tx => {
                const item = itemMap[tx.id];
                return {
                  ...tx,
                  is_reconciled: item ? item.is_cleared : false,
                  reconciliation_id: reconciliationId
                };
              });
            }
          }
        } else {
          console.log("No reconciliation items found, trying account_tx_table");

          // Try account_tx_table
          const { data: reconciledTxTable, error: txTableError } = await supabase
            .from("account_tx_table")
            .select("*")
            .eq("reconciliation_id", reconciliationId)
            .order("date", { ascending: false });

          if (txTableError) {
            console.error("Error fetching reconciled transactions from account_tx_table:", txTableError);
            reconciledError = txTableError;
          } else if (reconciledTxTable && reconciledTxTable.length > 0) {
            console.log(`Found ${reconciledTxTable.length} reconciled transactions in account_tx_table`);

            // Ensure all transactions have the is_reconciled property
            reconciledData = reconciledTxTable.map(tx => ({
              ...tx,
              is_reconciled: tx.is_reconciled === null ? true : tx.is_reconciled,
              reconciliation_id: reconciliationId
            }));
          } else {
            console.log("No reconciled transactions found in account_tx_table");
          }
        }
      } catch (err) {
        console.error("Error fetching reconciled transactions:", err);
        reconciledError = { message: String(err) };
      }

      // Even if there's an error with reconciled transactions, we can still return the main transactions
      if (reconciledError) {
        console.warn("Error with reconciled transactions, but continuing with main transactions:", reconciledError.message);
      }

      // Combine the datasets, removing duplicates
      const allTransactions = [...data];

      // Add reconciled transactions that might be outside the date range
      reconciledData.forEach(reconciledTx => {
        if (!allTransactions.some(tx => tx.id === reconciledTx.id)) {
          allTransactions.push(reconciledTx);
        } else {
          // Update existing transaction with reconciliation data
          const index = allTransactions.findIndex(tx => tx.id === reconciledTx.id);
          if (index !== -1) {
            allTransactions[index] = {
              ...allTransactions[index],
              is_reconciled: reconciledTx.is_reconciled,
              reconciliation_id: reconciledTx.reconciliation_id
            };
          }
        }
      });

      console.log(`Returning ${allTransactions.length} total transactions`);
      return NextResponse.json({ data: allTransactions });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in GET /api/finance/reconciliation:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions", message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/reconciliation
 * Update transaction reconciliation status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a batch update
    if (Array.isArray(body.transaction_ids)) {
      const result = batchUpdateReconciliationSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: result.error.format() },
          { status: 400 }
        );
      }

      const { transaction_ids, is_reconciled, reconciliation_id } = result.data;

      // First check if account_tx_table exists and has the is_reconciled column
      let error;

      try {
        console.log(`Batch updating ${transaction_ids.length} transactions, setting is_reconciled=${is_reconciled}`);

        // First update transaction_reconciliations table since it's the most reliable
        if (is_reconciled) {
          // For each transaction, insert or update a record in transaction_reconciliations
          const insertData = transaction_ids.map(id => ({
            transaction_id: id,
            reconciliation_id,
            is_reconciled,
            reconciled_at: new Date().toISOString(),
          }));

          const { error: insertError } = await supabase
            .from("transaction_reconciliations")
            .upsert(insertData, { onConflict: 'transaction_id, reconciliation_id' });

          if (insertError) {
            console.error("Error upserting transaction_reconciliations:", insertError);
            error = insertError;
          } else {
            console.log(`Successfully upserted ${insertData.length} records in transaction_reconciliations`);
          }
        } else {
          // Delete records from transaction_reconciliations
          const { error: deleteError } = await supabase
            .from("transaction_reconciliations")
            .delete()
            .eq("reconciliation_id", reconciliation_id)
            .in("transaction_id", transaction_ids);

          if (deleteError) {
            console.error("Error deleting from transaction_reconciliations:", deleteError);
            error = deleteError;
          } else {
            console.log(`Successfully deleted records for ${transaction_ids.length} transactions from transaction_reconciliations`);
          }
        }

        // Also try to update account_tx_table if it exists
        const txTableResult = await supabase
          .from("account_tx_table")
          .update({
            is_reconciled,
            reconciled_at: is_reconciled ? new Date().toISOString() : null,
            reconciliation_id: is_reconciled ? reconciliation_id : null,
          })
          .in("id", transaction_ids);

        if (txTableResult.error) {
          console.error("Error updating account_tx_table:", txTableResult.error);
          // Don't set error here as we've already updated transaction_reconciliations
        } else {
          console.log(`Successfully updated ${transaction_ids.length} transactions in account_tx_table`);
        }

        // Also update the reconciliation_items table
        if (is_reconciled) {
          // Get transaction details for all transactions
          const { data: txData, error: txError } = await supabase
            .from("account_tx_table")
            .select("*")
            .in("id", transaction_ids);

          if (txError) {
            console.error("Error fetching transaction details:", txError);
          } else if (txData && txData.length > 0) {
            // Check which transactions already have reconciliation items
            const { data: existingItems, error: checkError } = await supabase
              .from("reconciliation_items")
              .select("transaction_id")
              .eq("reconciliation_id", reconciliation_id)
              .in("transaction_id", transaction_ids);

            if (checkError) {
              console.error("Error checking reconciliation_items:", checkError);
            } else {
              // Create a set of transaction IDs that already have reconciliation items
              const existingItemIds = new Set((existingItems || []).map(item => item.transaction_id));

              // Prepare data for new items
              const newItems = txData
                .filter(tx => !existingItemIds.has(tx.id))
                .map(tx => ({
                  reconciliation_id,
                  transaction_id: tx.id,
                  transaction_type: tx.transaction_type,
                  amount: tx.amount,
                  date: tx.date,
                  is_cleared: true,
                  notes: "Reconciled via enhanced reconciliation batch update"
                }));

              if (newItems.length > 0) {
                // Insert new reconciliation items
                const { error: insertError } = await supabase
                  .from("reconciliation_items")
                  .insert(newItems);

                if (insertError) {
                  console.error("Error inserting reconciliation_items:", insertError);
                } else {
                  console.log(`Successfully inserted ${newItems.length} reconciliation_items`);
                }
              }

              // Update existing items
              if (existingItems && existingItems.length > 0) {
                const { error: updateError } = await supabase
                  .from("reconciliation_items")
                  .update({
                    is_cleared: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq("reconciliation_id", reconciliation_id)
                  .in("transaction_id", transaction_ids);

                if (updateError) {
                  console.error("Error updating reconciliation_items:", updateError);
                } else {
                  console.log(`Successfully updated ${existingItems.length} reconciliation_items`);
                }
              }
            }
          }
        } else {
          // If unreconciling, update the reconciliation_items table
          const { error: updateError } = await supabase
            .from("reconciliation_items")
            .update({
              is_cleared: false,
              updated_at: new Date().toISOString()
            })
            .eq("reconciliation_id", reconciliation_id)
            .in("transaction_id", transaction_ids);

          if (updateError) {
            console.error("Error updating reconciliation_items:", updateError);
          } else {
            console.log(`Successfully updated reconciliation_items for ${transaction_ids.length} transactions to unreconciled`);
          }
        }

        // We've already updated transaction_reconciliations table at the beginning
      } catch (err) {
        console.error("Error updating reconciliation status:", err);
        error = { message: String(err) };
      }

      if (error) {
        return NextResponse.json(
          { error: "Failed to update transactions", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Transactions updated successfully" });
    } else {
      // Single transaction update
      const result = updateReconciliationSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: result.error.format() },
          { status: 400 }
        );
      }

      const { transaction_id, is_reconciled, reconciliation_id } = result.data;

      // First check if account_tx_table exists and has the is_reconciled column
      let error;

      try {
        console.log(`Updating transaction ${transaction_id}, setting is_reconciled=${is_reconciled}`);

        // First update transaction_reconciliations table since it's the most reliable
        if (is_reconciled) {
          const { error: upsertError } = await supabase
            .from("transaction_reconciliations")
            .upsert({
              transaction_id,
              reconciliation_id,
              is_reconciled,
              reconciled_at: new Date().toISOString(),
            }, { onConflict: 'transaction_id, reconciliation_id' });

          if (upsertError) {
            console.error("Error upserting transaction_reconciliations:", upsertError);
            error = upsertError;
          } else {
            console.log(`Successfully upserted record in transaction_reconciliations for transaction ${transaction_id}`);
          }
        } else {
          const { error: deleteError } = await supabase
            .from("transaction_reconciliations")
            .delete()
            .eq("transaction_id", transaction_id)
            .eq("reconciliation_id", reconciliation_id);

          if (deleteError) {
            console.error("Error deleting from transaction_reconciliations:", deleteError);
            error = deleteError;
          } else {
            console.log(`Successfully deleted record for transaction ${transaction_id} from transaction_reconciliations`);
          }
        }

        // Also try to update account_tx_table if it exists
        const txTableResult = await supabase
          .from("account_tx_table")
          .update({
            is_reconciled,
            reconciled_at: is_reconciled ? new Date().toISOString() : null,
            reconciliation_id: is_reconciled ? reconciliation_id : null,
          })
          .eq("id", transaction_id);

        if (txTableResult.error) {
          console.error("Error updating account_tx_table:", txTableResult.error);
          // Don't set error here as we've already updated transaction_reconciliations
        } else {
          console.log(`Successfully updated transaction ${transaction_id} in account_tx_table`);
        }

        // Also update the reconciliation_items table
        if (is_reconciled) {
          // Check if item already exists
          const { data: existingItems, error: checkError } = await supabase
            .from("reconciliation_items")
            .select("id")
            .eq("reconciliation_id", reconciliation_id)
            .eq("transaction_id", transaction_id);

          if (checkError) {
            console.error("Error checking reconciliation_items:", checkError);
          } else if (!existingItems || existingItems.length === 0) {
            // Get transaction details
            const { data: txData, error: txError } = await supabase
              .from("account_tx_table")
              .select("*")
              .eq("id", transaction_id)
              .single();

            if (txError) {
              console.error("Error fetching transaction details:", txError);
            } else if (txData) {
              // Insert into reconciliation_items
              const { error: insertError } = await supabase
                .from("reconciliation_items")
                .insert({
                  reconciliation_id,
                  transaction_id,
                  transaction_type: txData.transaction_type,
                  amount: txData.amount,
                  date: txData.date,
                  is_cleared: true,
                  notes: "Reconciled via enhanced reconciliation"
                });

              if (insertError) {
                console.error("Error inserting reconciliation_item:", insertError);
              } else {
                console.log(`Successfully inserted reconciliation_item for transaction ${transaction_id}`);
              }
            }
          } else {
            // Update existing item
            const { error: updateError } = await supabase
              .from("reconciliation_items")
              .update({
                is_cleared: true,
                updated_at: new Date().toISOString()
              })
              .eq("reconciliation_id", reconciliation_id)
              .eq("transaction_id", transaction_id);

            if (updateError) {
              console.error("Error updating reconciliation_item:", updateError);
            } else {
              console.log(`Successfully updated reconciliation_item for transaction ${transaction_id}`);
            }
          }
        } else {
          // If unreconciling, update the reconciliation_items table
          const { error: updateError } = await supabase
            .from("reconciliation_items")
            .update({
              is_cleared: false,
              updated_at: new Date().toISOString()
            })
            .eq("reconciliation_id", reconciliation_id)
            .eq("transaction_id", transaction_id);

          if (updateError) {
            console.error("Error updating reconciliation_item:", updateError);
          } else {
            console.log(`Successfully updated reconciliation_item for transaction ${transaction_id} to unreconciled`);
          }
        }

        // We've already updated transaction_reconciliations table at the beginning
      } catch (err) {
        console.error("Error updating reconciliation status:", err);
        error = { message: String(err) };
      }

      if (error) {
        return NextResponse.json(
          { error: "Failed to update transaction", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Transaction updated successfully" });
    }
  } catch (error) {
    console.error("Error in POST /api/finance/reconciliation:", error);
    return NextResponse.json(
      { error: "Failed to update transaction", message: String(error) },
      { status: 500 }
    );
  }
}
