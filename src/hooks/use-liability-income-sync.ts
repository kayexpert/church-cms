"use client";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LiabilityEntry } from "@/types/finance";

// Extended LiabilityEntry type with account_id and payment_method for internal use
interface ExtendedLiabilityEntry extends LiabilityEntry {
  account_id?: string;
  payment_method?: string;
}
import { updateAccountBalance } from "@/lib/account-balance";
import { syncIncomeEntryWithAccountTransactions } from "@/lib/sync-account-transactions";

/**
 * Synchronizes a liability entry with its corresponding income entry if it's a loan
 * @param liability The liability entry to sync
 * @returns Promise that resolves when the sync is complete
 */
export async function syncLiabilityWithIncome(liability: LiabilityEntry | ExtendedLiabilityEntry): Promise<void> {
  // Only sync if the liability is a loan
  // Convert the is_loan value to a boolean to ensure proper type checking
  const isLoan = typeof liability.is_loan === 'string'
    ? liability.is_loan.toLowerCase() === 'true'
    : !!liability.is_loan;

  console.log("Checking if liability is a loan:", {
    isLoan,
    originalValue: liability.is_loan,
    type: typeof liability.is_loan
  });

  if (!isLoan) {
    console.log("Liability is not a loan, skipping income entry sync");
    return;
  }

  try {
    // First, check if there's an existing income entry for this liability
    // Try multiple approaches to find the matching income entry

    console.log("Searching for existing income entry for liability:", {
      liabilityId: liability.id,
      creditorName: liability.creditor_name
    });

    // 1. First try to find by payment_details.liability_id
    console.log("Attempt 1: Searching by payment_details->liability_id");
    let existingIncomeEntries = null;
    let fetchError = null;

    try {
      const result = await supabase
        .from("income_entries")
        .select("*");

      // Check for errors in the initial query
      if (result.error) {
        console.error("Error in basic income entries query:", result.error);
        fetchError = result.error;
      } else {
        console.log(`Successfully fetched ${result.data?.length || 0} income entries`);

        // Now manually filter for entries with matching liability_id in payment_details
        existingIncomeEntries = (result.data || []).filter(entry => {
          try {
            if (!entry.payment_details) return false;

            const paymentDetails = typeof entry.payment_details === 'string'
              ? JSON.parse(entry.payment_details)
              : entry.payment_details;

            return paymentDetails &&
                   paymentDetails.liability_id &&
                   paymentDetails.liability_id === liability.id;
          } catch (e) {
            console.log(`Error parsing payment_details for entry ${entry.id}:`, e);
            return false;
          }
        });

        console.log(`Found ${existingIncomeEntries.length} entries with matching liability_id in payment_details`);
      }
    } catch (error) {
      console.error("Exception in payment_details query:", error);
      fetchError = error;
    }

    if (existingIncomeEntries && existingIncomeEntries.length > 0) {
      console.log(`Found ${existingIncomeEntries.length} entries by payment_details->liability_id`);
    } else {
      console.log("No entries found by payment_details->liability_id");
    }

    // 2. If not found, try by description with liability ID
    if (!existingIncomeEntries || existingIncomeEntries.length === 0) {
      console.log("Attempt 2: Searching by description with liability ID");

      try {
        // First get all income entries
        const { data: allEntries, error: allEntriesError } = await supabase
          .from("income_entries")
          .select("*");

        if (allEntriesError) {
          console.error("Error fetching all income entries:", allEntriesError);
        } else if (allEntries && allEntries.length > 0) {
          console.log(`Fetched ${allEntries.length} income entries, filtering by liability ID in description`);

          // Manually filter entries that contain the liability ID in the description
          const entriesByLiabilityId = allEntries.filter(entry =>
            entry.description &&
            entry.description.includes(`Liability ID: ${liability.id}`)
          );

          if (entriesByLiabilityId.length > 0) {
            console.log(`Found ${entriesByLiabilityId.length} entries by liability ID in description`);
            existingIncomeEntries = entriesByLiabilityId;
          } else {
            console.log("No entries found by liability ID in description");
          }
        } else {
          console.log("No income entries found to search by liability ID in description");
        }
      } catch (error) {
        console.error("Exception searching by liability ID in description:", error);
      }
    }

    // 3. If still not found, try by description with creditor name
    if (!existingIncomeEntries || existingIncomeEntries.length === 0) {
      console.log("Attempt 3: Searching by description with creditor name");

      try {
        // First get all income entries if we haven't already
        const { data: allEntries, error: allEntriesError } = await supabase
          .from("income_entries")
          .select("*");

        if (allEntriesError) {
          console.error("Error fetching all income entries:", allEntriesError);
        } else if (allEntries && allEntries.length > 0) {
          console.log(`Fetched ${allEntries.length} income entries, filtering by creditor name in description`);

          // Manually filter entries that contain the creditor name in the description
          const searchText = `Loan from ${liability.creditor_name}`;
          console.log("Searching for text:", searchText);

          const entriesByCreditorName = allEntries.filter(entry =>
            entry.description &&
            entry.description.includes(searchText)
          );

          if (entriesByCreditorName.length > 0) {
            console.log(`Found ${entriesByCreditorName.length} entries by creditor name in description`);
            existingIncomeEntries = entriesByCreditorName;
          } else {
            console.log("No entries found by creditor name in description");
          }
        } else {
          console.log("No income entries found to search by creditor name in description");
        }
      } catch (error) {
        console.error("Exception searching by creditor name in description:", error);
      }
    }

    // Sort by created_at to get the most recent one
    if (existingIncomeEntries && existingIncomeEntries.length > 0) {
      console.log(`Found ${existingIncomeEntries.length} total income entries, sorting by created_at`);

      // Log all entries before sorting
      existingIncomeEntries.forEach((entry, index) => {
        console.log(`Entry ${index + 1}:`, {
          id: entry.id,
          description: entry.description,
          amount: entry.amount,
          date: entry.date,
          created_at: entry.created_at
        });
      });

      existingIncomeEntries.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      console.log("Entries after sorting (most recent first):");
      existingIncomeEntries.forEach((entry, index) => {
        console.log(`Entry ${index + 1}:`, {
          id: entry.id,
          description: entry.description,
          amount: entry.amount,
          date: entry.date,
          created_at: entry.created_at
        });
      });
    } else {
      console.log("No income entries found for this liability");
    }

    if (fetchError) {
      console.error("Error checking for existing income entry:", fetchError);
      throw fetchError;
    }

    const existingIncomeEntry = existingIncomeEntries && existingIncomeEntries.length > 0
      ? existingIncomeEntries[0]
      : null;

    if (existingIncomeEntry) {
      console.log("Selected income entry for update:", {
        id: existingIncomeEntry.id,
        description: existingIncomeEntry.description,
        amount: existingIncomeEntry.amount,
        date: existingIncomeEntry.date,
        payment_details: existingIncomeEntry.payment_details
      });
    } else {
      console.log("No existing income entry found, will create a new one");
    }

    // If there's no existing income entry and the liability is a loan, create one
    if (!existingIncomeEntry) {
      console.log("No existing income entry found, creating a new one");

      try {
        // Get the category ID for loans
        const categoryId = await getDefaultLoanCategoryId();
        console.log(`Using category ID for loan income: ${categoryId}`);

        // Get the account_id from the liability entry
        let accountId = null;

        // First check if the liability has an account_id directly
        if (liability.account_id) {
          accountId = liability.account_id;
          console.log(`Using account_id from liability: ${accountId}`);
        } else {
          // If not, try to fetch it from the liability_entries table
          try {
            const { data: liabilityData, error: liabilityError } = await supabase
              .from("liability_entries")
              .select("account_id")
              .eq("id", liability.id)
              .single();

            if (liabilityError) {
              console.error("Error fetching liability account_id:", liabilityError);
            } else if (liabilityData && liabilityData.account_id) {
              accountId = liabilityData.account_id;
              console.log(`Found account_id in liability_entries table: ${accountId}`);
            }
          } catch (error) {
            console.error("Error fetching liability account_id:", error);
          }
        }

        // If we still don't have an account_id, check localStorage
        if (!accountId && typeof window !== 'undefined') {
          try {
            const storedData = localStorage.getItem(`liability_data_${liability.id}`);
            if (storedData) {
              const parsedData = JSON.parse(storedData);
              if (parsedData.account_id) {
                accountId = parsedData.account_id;
                console.log(`Using account_id from localStorage: ${accountId}`);
              }
            }
          } catch (e) {
            console.error("Error retrieving stored liability data:", e);
          }
        }

        console.log(`Final account_id for income entry: ${accountId}`);

        // Prepare the income entry data
        const incomeEntryData = {
          date: liability.date,
          amount: liability.total_amount,
          category_id: categoryId,
          description: `Loan from ${liability.creditor_name}`,
          payment_method: liability.payment_method || "other",
          account_id: accountId,
          payment_details: {
            source: "liability",
            liability_id: liability.id
          }
        };

        console.log("Creating new income entry with data:", incomeEntryData);

        // This is a new loan, so create a corresponding income entry
        const { data, error: insertError } = await supabase
          .from("income_entries")
          .insert(incomeEntryData)
          .select();

        if (insertError) {
          console.error("Error creating income entry for loan:", insertError);
          console.error("Error details:", JSON.stringify(insertError, null, 2));
          throw insertError;
        }

        console.log("Created new income entry for loan liability:", data);

        // Ensure the income entry is recorded in account transactions
        if (data && data[0] && data[0].id) {
          try {
            await syncIncomeEntryWithAccountTransactions(data[0].id);
            console.log("Successfully synced income entry with account transactions");
          } catch (syncError) {
            console.error("Error syncing income entry with account transactions:", syncError);
          }
        }

        // Update account balance if an account was selected
        if (accountId) {
          try {
            // Convert total_amount to a number if it's a string
            const amount = typeof liability.total_amount === 'string'
              ? parseFloat(liability.total_amount)
              : liability.total_amount;

            console.log("Updating account balance for loan:", {
              accountId: accountId,
              amount: amount,
              operation: 'create',
              type: 'income'
            });

            await updateAccountBalance(
              accountId,
              amount,
              'create',
              'income'
            );
            console.log("Successfully updated account balance for loan");
          } catch (balanceError) {
            console.error("Error updating account balance:", balanceError);
            toast.warning("Loan recorded but account balance may not be accurate");
          }
        } else {
          console.log("No account_id available, skipping account balance update");
        }

        return;
      } catch (error) {
        console.error("Exception creating income entry for loan:", error);

        // Log more detailed error information
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        } else {
          console.error("Unknown error type:", typeof error);
          console.error("Error details:", JSON.stringify(error, null, 2));
        }

        throw error;
      }
    }

    // If there is an existing income entry, update it if needed
    console.log("Found existing income entry, checking if update is needed");

    // Initialize variables to track if update is needed
    let needsUpdate = false;
    let paymentDetails = existingIncomeEntry.payment_details || {};

    // Check if basic fields need updating
    console.log("Comparing values:", {
      existingAmount: existingIncomeEntry.amount,
      newAmount: liability.total_amount,
      existingDate: existingIncomeEntry.date,
      newDate: liability.date,
      existingDescription: existingIncomeEntry.description,
      newDescription: `Loan from ${liability.creditor_name}`,
      existingPaymentMethod: existingIncomeEntry.payment_method,
      newPaymentMethod: liability.payment_method,
      existingAccountId: existingIncomeEntry.account_id,
      newAccountId: liability.account_id
    });

    if (existingIncomeEntry.amount !== liability.total_amount) {
      console.log("Amount needs updating");
      needsUpdate = true;
    }

    if (existingIncomeEntry.date !== liability.date) {
      console.log("Date needs updating");
      needsUpdate = true;
    }

    if (existingIncomeEntry.description !== `Loan from ${liability.creditor_name}`) {
      console.log("Description needs updating");
      needsUpdate = true;
    }

    // Check if payment method needs updating
    if (liability.payment_method && existingIncomeEntry.payment_method !== liability.payment_method) {
      console.log("Payment method needs updating");
      needsUpdate = true;
    }

    // Check if account_id needs updating
    if (liability.account_id && existingIncomeEntry.account_id !== liability.account_id) {
      console.log("Account ID needs updating");
      needsUpdate = true;
    }

    // Check if we need to update payment_details
    if (typeof paymentDetails === 'string') {
      try {
        paymentDetails = JSON.parse(paymentDetails);
      } catch (e) {
        console.log("Could not parse payment_details, creating new object");
        paymentDetails = {};
        needsUpdate = true;
      }
    }

    // Ensure payment_details has the correct liability_id
    console.log("Checking payment_details:", {
      currentPaymentDetails: paymentDetails,
      hasLiabilityId: !!paymentDetails.liability_id,
      currentLiabilityId: paymentDetails.liability_id,
      expectedLiabilityId: liability.id
    });

    if (!paymentDetails.liability_id || paymentDetails.liability_id !== liability.id) {
      console.log("Payment details need updating with correct liability ID");
      paymentDetails = {
        ...paymentDetails,
        source: "liability",
        liability_id: liability.id
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log("Updating existing income entry with new values:", {
        id: existingIncomeEntry.id,
        newAmount: liability.total_amount,
        newDate: liability.date,
        newDescription: `Loan from ${liability.creditor_name}`,
        newPaymentDetails: paymentDetails
      });

      try {
        // Get the account_id from the liability entry
        let accountId = null;

        // First check if the liability has an account_id directly
        if (liability.account_id) {
          accountId = liability.account_id;
          console.log(`Using account_id from liability: ${accountId}`);
        } else {
          // If not, try to fetch it from the liability_entries table
          try {
            const { data: liabilityData, error: liabilityError } = await supabase
              .from("liability_entries")
              .select("account_id")
              .eq("id", liability.id)
              .single();

            if (liabilityError) {
              console.error("Error fetching liability account_id:", liabilityError);
            } else if (liabilityData && liabilityData.account_id) {
              accountId = liabilityData.account_id;
              console.log(`Found account_id in liability_entries table: ${accountId}`);
            }
          } catch (error) {
            console.error("Error fetching liability account_id:", error);
          }
        }

        // If we still don't have an account_id, check localStorage
        if (!accountId && typeof window !== 'undefined') {
          try {
            const storedData = localStorage.getItem(`liability_data_${liability.id}`);
            if (storedData) {
              const parsedData = JSON.parse(storedData);
              if (parsedData.account_id) {
                accountId = parsedData.account_id;
                console.log(`Using account_id from localStorage: ${accountId}`);
              }
            }
          } catch (e) {
            console.error("Error retrieving stored liability data:", e);
          }
        }

        // Use existing account_id as fallback
        accountId = accountId || existingIncomeEntry.account_id || null;
        console.log(`Final account_id for income entry update: ${accountId}`);

        const { data, error: updateError } = await supabase
          .from("income_entries")
          .update({
            amount: liability.total_amount,
            date: liability.date,
            description: `Loan from ${liability.creditor_name}`,
            payment_method: liability.payment_method || existingIncomeEntry.payment_method || "other",
            account_id: accountId,
            payment_details: paymentDetails
          })
          .eq("id", existingIncomeEntry.id)
          .select();

        if (updateError) {
          console.error("Error updating income entry for loan:", updateError);
          console.error("Error details:", JSON.stringify(updateError, null, 2));
          throw updateError;
        }

        console.log("Updated existing income entry for loan liability:", data);

        // Ensure the income entry is recorded in account transactions
        if (data && data[0] && data[0].id) {
          try {
            await syncIncomeEntryWithAccountTransactions(data[0].id);
            console.log("Successfully synced updated income entry with account transactions");
          } catch (syncError) {
            console.error("Error syncing updated income entry with account transactions:", syncError);
          }
        }

        // Update account balance if an account was selected
        if (accountId) {
          try {
            // Convert amounts to numbers if they're strings
            const newAmount = typeof liability.total_amount === 'string'
              ? parseFloat(liability.total_amount)
              : liability.total_amount;

            const existingAmount = typeof existingIncomeEntry.amount === 'string'
              ? parseFloat(existingIncomeEntry.amount)
              : existingIncomeEntry.amount;

            console.log("Account balance update scenario:", {
              existingAccountId: existingIncomeEntry.account_id,
              newAccountId: accountId,
              existingAmount: existingAmount,
              newAmount: newAmount,
              accountsChanged: existingIncomeEntry.account_id !== accountId,
              amountChanged: existingAmount !== newAmount
            });

            // If the account has changed, we need to handle both accounts
            if (existingIncomeEntry.account_id && existingIncomeEntry.account_id !== accountId) {
              console.log("Account changed - updating both old and new accounts");

              // First, reverse the previous entry's effect on the old account
              await updateAccountBalance(
                existingIncomeEntry.account_id,
                existingAmount,
                'delete',
                'income'
              );

              // Then add the new entry's effect to the new account
              await updateAccountBalance(
                accountId,
                newAmount,
                'create',
                'income'
              );
            }
            // If the account is the same but the amount changed
            else if (existingIncomeEntry.account_id === accountId &&
                     existingAmount !== newAmount) {
              // Calculate the difference and update accordingly
              const difference = newAmount - existingAmount;

              console.log("Amount changed for same account - updating with difference:", {
                accountId: accountId,
                difference: difference,
                operation: difference > 0 ? 'create' : 'delete'
              });

              await updateAccountBalance(
                accountId,
                Math.abs(difference),
                difference > 0 ? 'create' : 'delete',
                'income'
              );
            }
            // If this is a new account assignment (previously had none)
            else if (!existingIncomeEntry.account_id) {
              console.log("New account assignment - adding full amount to account");

              await updateAccountBalance(
                accountId,
                newAmount,
                'create',
                'income'
              );
            } else {
              console.log("No account balance update needed - no changes detected");
            }

            console.log("Successfully updated account balance for loan");
          } catch (balanceError) {
            console.error("Error updating account balance:", balanceError);
            toast.warning("Loan updated but account balance may not be accurate");
          }
        }
        // If the account was removed, reverse the previous entry's effect
        else if (existingIncomeEntry.account_id && !liability.account_id) {
          try {
            const existingAmount = typeof existingIncomeEntry.amount === 'string'
              ? parseFloat(existingIncomeEntry.amount)
              : existingIncomeEntry.amount;

            console.log("Account removed - removing amount from previous account:", {
              accountId: existingIncomeEntry.account_id,
              amount: existingAmount
            });

            await updateAccountBalance(
              existingIncomeEntry.account_id,
              existingAmount,
              'delete',
              'income'
            );
            console.log("Successfully removed account balance effect for loan");
          } catch (balanceError) {
            console.error("Error updating account balance:", balanceError);
            toast.warning("Loan updated but account balance may not be accurate");
          }
        }
      } catch (error) {
        console.error("Exception during income entry update:", error);
        throw error;
      }
    } else {
      console.log("No update needed for income entry");
    }
  } catch (error) {
    console.error("Error syncing liability with income:", error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", typeof error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    }

    toast.error("Failed to update related income entry. Check console for details.");
  }
}

/**
 * Gets the default category ID for loan income entries
 * If a "Loans" category doesn't exist, it creates one
 * @returns Promise that resolves to the category ID
 */
async function getDefaultLoanCategoryId(): Promise<string> {
  try {
    console.log("Looking for a default loan category");

    // First try to get all income categories
    const { data: allCategories, error: allCategoriesError } = await supabase
      .from("income_categories")
      .select("*");

    if (allCategoriesError) {
      console.error("Error fetching all income categories:", allCategoriesError);
      throw allCategoriesError;
    }

    console.log(`Found ${allCategories?.length || 0} income categories`);

    // Manually filter for loan-related categories
    const loanCategories = (allCategories || []).filter(category => {
      const name = (category.name || "").toLowerCase();
      return name.includes("loan") ||
             name.includes("debt") ||
             name.includes("borrow");
    });

    // If a suitable category exists, use it
    if (loanCategories.length > 0) {
      console.log(`Found existing loan category: ${loanCategories[0].name} (${loanCategories[0].id})`);
      return loanCategories[0].id;
    }

    console.log("No existing loan category found, creating a new one");

    // Otherwise, create a new "Loans" category
    try {
      const { data: newCategory, error: insertError } = await supabase
        .from("income_categories")
        .insert({
          name: "Loans",
          description: "Income from loans and borrowed funds",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating loan category:", insertError);
        throw insertError;
      }

      console.log(`Created new loan category with ID: ${newCategory.id}`);
      return newCategory.id;
    } catch (insertError) {
      console.error("Exception creating loan category:", insertError);

      // As a fallback, try to find any category to use
      if (allCategories && allCategories.length > 0) {
        console.log(`Using first available category as fallback: ${allCategories[0].name} (${allCategories[0].id})`);
        return allCategories[0].id;
      }

      throw new Error("Failed to create or find a suitable income category");
    }
  } catch (error) {
    console.error("Error in getDefaultLoanCategoryId:", error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", typeof error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    }

    throw error;
  }
}
