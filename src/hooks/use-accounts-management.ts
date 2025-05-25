"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Account } from "@/types/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import { invalidateQueriesWithPrefix } from "@/lib/query-cache-utils";

/**
 * Custom hook for comprehensive account management operations
 */
export function useAccountsManagement() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all accounts with calculated balances
  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    refetch: refetchAccounts
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      // Get all accounts
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (error) throw error;

      // For each account, calculate the correct balance
      const accountsWithCalculatedBalances = await Promise.all(
        data.map(async (account) => {
          // Fetch transactions for this account
          const { data: transactions, error: txError } = await supabase
            .from("account_transactions")
            .select("*")
            .eq("account_id", account.id);

          if (txError) {
            console.error(`Error fetching transactions for account ${account.id}:`, txError);
            return account;
          }

          // Check if there's an opening balance entry in the transactions
          const hasOpeningBalanceEntry = transactions?.some(tx =>
            tx.transaction_type === "income" &&
            (tx.description?.includes("Opening Balance") ||
             tx.description?.includes("[Bal c/d]") ||
             (tx.payment_details && tx.payment_details.type === "opening_balance"))
          );

          // Calculate the balance from transactions
          let calculatedBalance = hasOpeningBalanceEntry ? 0 : (account.opening_balance || 0);
          if (transactions && transactions.length > 0) {
            calculatedBalance += transactions.reduce((sum, tx) => sum + tx.amount, 0);
          }

          return {
            ...account,
            calculatedBalance
          };
        })
      );

      return accountsWithCalculatedBalances;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Create a new account
  const createAccount = useMutation({
    mutationFn: async (values: {
      name: string;
      account_type: string;
      bank_name?: string;
      account_number?: string;
      opening_balance: number;
      description?: string;
      is_default: boolean;
    }) => {
      // Check if account with same name already exists
      const { data: existingAccount, error: checkError } = await supabase
        .from("accounts")
        .select("id")
        .eq("name", values.name)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingAccount) throw new Error("An account with this name already exists");

      // If this is set as default, update all other accounts to not be default
      if (values.is_default) {
        const { error: updateError } = await supabase
          .from("accounts")
          .update({ is_default: false })
          .not("id", "is", null);

        if (updateError) throw updateError;
      }

      // Prepare account data
      const accountData = {
        name: values.name,
        account_type: values.account_type,
        bank_name: values.account_type !== "cash" ? values.bank_name : null,
        account_number: values.account_type !== "cash" ? values.account_number : null,
        opening_balance: values.opening_balance,
        balance: values.opening_balance, // Initially, balance = opening_balance
        description: values.description || null,
        is_default: values.is_default,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert the new account
      const { data: newAccount, error } = await supabase
        .from("accounts")
        .insert(accountData)
        .select()
        .single();

      if (error) throw error;

      // If opening balance is greater than 0, create a "Bal c/d" entry in income
      if (values.opening_balance > 0) {
        try {
          // First, check if we have a valid income category for opening balances
          // If not, we'll need to create one or use a default one
          let openingBalanceCategoryId = process.env.NEXT_PUBLIC_OPENING_BALANCE_CATEGORY_ID;

          if (!openingBalanceCategoryId) {
            // Try to find an existing category for opening balances
            const { data: categories, error: categoryError } = await supabase
              .from("income_categories")
              .select("id")
              .eq("name", "Opening Balance")
              .maybeSingle();

            if (categoryError) {
              console.error("Error finding opening balance category:",
                categoryError.message || JSON.stringify(categoryError));
            } else if (categories) {
              openingBalanceCategoryId = categories.id;
            } else {
              // Create a new category for opening balances
              try {
                const { data: newCategory, error: createCategoryError } = await supabase
                  .from("income_categories")
                  .insert({
                    name: "Opening Balance",
                    description: "System category for account opening balances",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .select()
                  .single();

                if (createCategoryError) {
                  console.error("Error creating opening balance category:",
                    createCategoryError.message || JSON.stringify(createCategoryError));
                } else if (newCategory) {
                  openingBalanceCategoryId = newCategory.id;
                }
              } catch (createCategoryError) {
                console.error("Exception creating opening balance category:", createCategoryError);
              }
            }
          }

          // If we still don't have a category ID, use a placeholder UUID
          if (!openingBalanceCategoryId) {
            console.warn("Using placeholder UUID for opening balance category");
            openingBalanceCategoryId = "00000000-0000-0000-0000-000000000000";
          }

          const today = new Date();
          const incomeData = {
            date: format(today, "yyyy-MM-dd"),
            category_id: openingBalanceCategoryId,
            amount: values.opening_balance,
            description: `Opening Balance - ${values.name}`,
            payment_method: "system",
            account_id: newAccount.id,
            payment_details: {
              type: "opening_balance",
              account_id: newAccount.id,
              account_name: values.name
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log("Creating opening balance entry with data:", JSON.stringify(incomeData, null, 2));

          // Insert the income entry
          const { data: incomeEntry, error: incomeError } = await supabase
            .from("income_entries")
            .insert(incomeData)
            .select()
            .single();

          if (incomeError) {
            console.error("Error creating opening balance entry:",
              incomeError.message || JSON.stringify(incomeError));
            // We don't throw here to avoid rolling back the account creation
          } else {
            console.log("Successfully created opening balance entry:", incomeEntry?.id);
          }
        } catch (openingBalanceError) {
          console.error("Error handling opening balance:",
            openingBalanceError instanceof Error
              ? openingBalanceError.message
              : JSON.stringify(openingBalanceError));
          // We don't throw here to avoid rolling back the account creation
        }
      }

      return newAccount;
    },
    onSuccess: () => {
      // Use AccountBalanceService to invalidate all finance-related queries
      // This ensures all components using financial data are updated
      const { AccountBalanceService } = require("@/services/account-balance-service");
      AccountBalanceService.invalidateAllFinanceQueries(queryClient);

      toast.success("Account created successfully");
    },
    onError: (error) => {
      console.error("Error creating account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create account");
    }
  });

  // Update an existing account
  const updateAccount = useMutation({
    mutationFn: async (values: {
      id: string;
      name: string;
      account_type: string;
      bank_name?: string;
      account_number?: string;
      opening_balance: number;
      description?: string;
      is_default: boolean;
      currentBalance: number;
      currentOpeningBalance: number;
    }) => {
      // Check if account with same name already exists (excluding this account)
      const { data: existingAccount, error: checkError } = await supabase
        .from("accounts")
        .select("id")
        .eq("name", values.name)
        .neq("id", values.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingAccount) throw new Error("Another account with this name already exists");

      // If this is set as default, update all other accounts to not be default
      if (values.is_default) {
        const { error: updateError } = await supabase
          .from("accounts")
          .update({ is_default: false })
          .neq("id", values.id);

        if (updateError) throw updateError;
      }

      // Calculate the balance adjustment if opening balance changed
      const balanceAdjustment = values.opening_balance - values.currentOpeningBalance;
      const newBalance = values.currentBalance + balanceAdjustment;

      // Prepare account data
      const accountData = {
        name: values.name,
        account_type: values.account_type,
        bank_name: values.account_type !== "cash" ? values.bank_name : null,
        account_number: values.account_type !== "cash" ? values.account_number : null,
        opening_balance: values.opening_balance,
        balance: newBalance,
        description: values.description || null,
        is_default: values.is_default,
        updated_at: new Date().toISOString(),
      };

      // Update the account
      const { data: updatedAccount, error } = await supabase
        .from("accounts")
        .update(accountData)
        .eq("id", values.id)
        .select()
        .single();

      if (error) throw error;

      // If opening balance changed, update or create the "Bal c/d" entry
      if (balanceAdjustment !== 0) {
        try {
          // First, check if an opening balance entry already exists
          const { data: existingEntries, error: fetchError } = await supabase
            .from("income_entries")
            .select("*")
            .eq("account_id", values.id)
            .eq("payment_method", "system")
            .like("description", "Opening Balance%");

          if (fetchError) throw fetchError;

          const today = new Date();

          if (existingEntries && existingEntries.length > 0) {
            // Update the existing entry
            const existingEntry = existingEntries[0];
            const newAmount = existingEntry.amount + balanceAdjustment;

            // If new amount is <= 0, delete the entry
            if (newAmount <= 0) {
              const { error: deleteError } = await supabase
                .from("income_entries")
                .delete()
                .eq("id", existingEntry.id);

              if (deleteError) throw deleteError;
            } else {
              // Otherwise update it
              const { error: updateError } = await supabase
                .from("income_entries")
                .update({
                  amount: newAmount,
                  description: `Opening Balance - ${values.name}`,
                  updated_at: new Date().toISOString()
                })
                .eq("id", existingEntry.id);

              if (updateError) throw updateError;
            }
          } else if (values.opening_balance > 0) {
            // Create a new opening balance entry
            const incomeData = {
              date: format(today, "yyyy-MM-dd"),
              category_id: process.env.NEXT_PUBLIC_OPENING_BALANCE_CATEGORY_ID || "00000000-0000-0000-0000-000000000000",
              amount: values.opening_balance,
              description: `Opening Balance - ${values.name}`,
              payment_method: "system",
              account_id: values.id,
              payment_details: {
                type: "opening_balance",
                account_id: values.id,
                account_name: values.name
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Insert the income entry
            const { error: incomeError } = await supabase
              .from("income_entries")
              .insert(incomeData);

            if (incomeError) throw incomeError;
          }
        } catch (openingBalanceError) {
          console.error("Error handling opening balance change:", openingBalanceError);
          // We don't throw here to avoid rolling back the account update
        }
      }

      return updatedAccount;
    },
    onSuccess: () => {
      // Use AccountBalanceService to invalidate all finance-related queries
      // This ensures all components using financial data are updated
      const { AccountBalanceService } = require("@/services/account-balance-service");
      AccountBalanceService.invalidateAllFinanceQueries(queryClient);

      toast.success("Account updated successfully");
    },
    onError: (error) => {
      console.error("Error updating account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update account");
    }
  });

  // Delete an account
  const deleteAccount = useMutation({
    mutationFn: async (params: { accountId: string, deleteTransactions: boolean }) => {
      const { accountId, deleteTransactions } = params;

      try {
        // First, get the account details for the response
        const { data: account, error: accountError } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (accountError) throw accountError;

        if (deleteTransactions) {
          // Delete with transactions - use direct SQL for more reliable deletion
          console.log("Deleting account with all transactions...");

          // Note: We'll proceed with individual operations without explicit transaction support
          // as the Supabase client implementation may not support transaction methods

          try {
            // Note: account_transactions is a view, not a table, so we can't delete from it directly.
            // Instead, we'll delete from the source tables (income_entries, expenditure_entries, etc.)
            // which will automatically remove the corresponding entries from the view.

            // Try to delete from account_tx_table if it exists
            try {
              const { error: txTableError } = await supabase
                .from("account_tx_table")
                .delete()
                .eq("account_id", accountId);

              if (txTableError) {
                console.log("Note: account_tx_table might not exist or couldn't be accessed:",
                  txTableError.message || JSON.stringify(txTableError));
              } else {
                console.log("Successfully deleted entries from account_tx_table");
              }
            } catch (txTableDeleteError) {
              console.log("Note: account_tx_table might not exist:", txTableDeleteError);
              // Continue with other deletions
            }

            // 2. Delete income entries
            try {
              const { error: incomeError } = await supabase
                .from("income_entries")
                .delete()
                .eq("account_id", accountId);

              if (incomeError) {
                console.error("Error deleting income entries:", incomeError.message || JSON.stringify(incomeError));
              }
            } catch (incomeDeleteError) {
              console.error("Exception deleting income entries:", incomeDeleteError);
              // Continue with other deletions
            }

            // 3. Delete expenditure entries
            try {
              const { error: expError } = await supabase
                .from("expenditure_entries")
                .delete()
                .eq("account_id", accountId);

              if (expError) {
                console.error("Error deleting expenditure entries:", expError.message || JSON.stringify(expError));
              }
            } catch (expDeleteError) {
              console.error("Exception deleting expenditure entries:", expDeleteError);
              // Continue with other deletions
            }

            // 4. Delete transfers where this account is the source
            try {
              const { error: sourceTransferError } = await supabase
                .from("account_transfers")
                .delete()
                .eq("source_account_id", accountId);

              if (sourceTransferError) {
                console.error("Error deleting source transfers:", sourceTransferError.message || JSON.stringify(sourceTransferError));
              }
            } catch (sourceTransferDeleteError) {
              console.error("Exception deleting source transfers:", sourceTransferDeleteError);
              // Continue with other deletions
            }

            // 5. Delete transfers where this account is the destination
            try {
              const { error: destTransferError } = await supabase
                .from("account_transfers")
                .delete()
                .eq("destination_account_id", accountId);

              if (destTransferError) {
                console.error("Error deleting destination transfers:", destTransferError.message || JSON.stringify(destTransferError));
              }
            } catch (destTransferDeleteError) {
              console.error("Exception deleting destination transfers:", destTransferDeleteError);
              // Continue with other deletions
            }

            // 6. Check for liability entries that reference this account
            try {
              // First, check if there are any liability entries with this account_id
              const { data: liabilityEntries, error: liabilityCheckError } = await supabase
                .from("liability_entries")
                .select("id, creditor_name")
                .eq("account_id", accountId);

              if (liabilityCheckError) {
                console.error("Error checking liability entries:", liabilityCheckError.message || JSON.stringify(liabilityCheckError));
              } else if (liabilityEntries && liabilityEntries.length > 0) {
                console.log(`Found ${liabilityEntries.length} liability entries referencing this account`);

                // Update each liability entry to remove the account reference
                for (const entry of liabilityEntries) {
                  console.log(`Removing account reference from liability entry ${entry.id} (${entry.creditor_name})`);

                  const { error: updateError } = await supabase
                    .from("liability_entries")
                    .update({ account_id: null })
                    .eq("id", entry.id);

                  if (updateError) {
                    console.error(`Error updating liability entry ${entry.id}:`, updateError.message || JSON.stringify(updateError));
                  }
                }
              }
            } catch (liabilityError) {
              console.error("Exception handling liability entries:", liabilityError);
              // Continue with deletion
            }

            // 7. Finally, delete the account itself
            try {
              const { error: deleteError } = await supabase
                .from("accounts")
                .delete()
                .eq("id", accountId);

              if (deleteError) {
                console.error("Error deleting account:", deleteError.message || JSON.stringify(deleteError));
                throw deleteError;
              }
            } catch (accountDeleteError) {
              console.error("Exception deleting account:", accountDeleteError);
              throw accountDeleteError;
            }

            // Transaction completed with individual operations

            return { success: true, account };
          } catch (error) {
            // Error occurred during operations, but we can't rollback as we're using individual operations

            throw error;
          }
        } else {
          // Check if the account has any transactions
          const { count: transactionCount, error: countError } = await supabase
            .from("account_transactions")
            .select("*", { count: "exact", head: true })
            .eq("account_id", accountId);

          if (countError) throw countError;

          if (transactionCount && transactionCount > 0) {
            throw new Error(`This account has ${transactionCount} transactions. Please use the enhanced delete option to delete the account with its transactions.`);
          }

          // Simple delete without transactions
          try {
            // First, check for liability entries that reference this account
            try {
              // Check if there are any liability entries with this account_id
              const { data: liabilityEntries, error: liabilityCheckError } = await supabase
                .from("liability_entries")
                .select("id, creditor_name")
                .eq("account_id", accountId);

              if (liabilityCheckError) {
                console.error("Error checking liability entries:", liabilityCheckError.message || JSON.stringify(liabilityCheckError));
              } else if (liabilityEntries && liabilityEntries.length > 0) {
                console.log(`Found ${liabilityEntries.length} liability entries referencing this account`);

                // Update each liability entry to remove the account reference
                for (const entry of liabilityEntries) {
                  console.log(`Removing account reference from liability entry ${entry.id} (${entry.creditor_name})`);

                  const { error: updateError } = await supabase
                    .from("liability_entries")
                    .update({ account_id: null })
                    .eq("id", entry.id);

                  if (updateError) {
                    console.error(`Error updating liability entry ${entry.id}:`, updateError.message || JSON.stringify(updateError));
                  }
                }
              }
            } catch (liabilityError) {
              console.error("Exception handling liability entries:", liabilityError);
              // Continue with deletion
            }

            // Now delete the account
            const { error: deleteError } = await supabase
              .from("accounts")
              .delete()
              .eq("id", accountId);

            if (deleteError) {
              console.error("Error deleting account (simple):", deleteError.message || JSON.stringify(deleteError));
              throw deleteError;
            }
          } catch (accountDeleteError) {
            console.error("Exception deleting account (simple):", accountDeleteError);
            throw accountDeleteError;
          }

          return { success: true, account };
        }
      } catch (error) {
        console.error("Account deletion error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all account-related queries
      invalidateQueriesWithPrefix(queryClient, 'accounts');
      queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      toast.success("Account deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete account");
    }
  });

  // Recalculate account balances
  const recalculateBalances = useMutation({
    mutationFn: async () => {
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("id");

      if (accountsError) throw accountsError;

      const results = [];

      for (const account of accounts) {
        const { data, error } = await supabase
          .rpc("recalculate_account_balance", { account_id: account.id });

        if (error) {
          console.error(`Error recalculating balance for account ${account.id}:`, error);
          results.push({ accountId: account.id, success: false, error: error.message });
        } else {
          results.push({ accountId: account.id, success: true, newBalance: data });
        }
      }

      return results;
    },
    onSuccess: () => {
      // Invalidate all account-related queries
      invalidateQueriesWithPrefix(queryClient, 'accounts');

      toast.success("Account balances recalculated successfully");
    },
    onError: (error) => {
      console.error("Error recalculating account balances:", error);
      toast.error(error instanceof Error ? error.message : "Failed to recalculate account balances");
    }
  });

  return {
    accounts,
    isLoadingAccounts,
    refetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    recalculateBalances,
    isLoading
  };
}
