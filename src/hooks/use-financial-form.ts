"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { updateAccountBalance } from "@/lib/account-balance";

/**
 * A custom hook for handling financial forms with Supabase integration
 */
export function useFinancialForm<T extends Record<string, any>>({
  formSchema,
  defaultValues,
  tableName,
  successMessage,
  errorMessage,
  resetAfterSubmit = true,
  transformData,
  onSuccess,
  entryId,
}: {
  formSchema: z.ZodSchema<T>;
  defaultValues: Partial<T>;
  tableName: string;
  successMessage: string;
  errorMessage: string;
  resetAfterSubmit?: boolean;
  transformData?: (data: T) => Record<string, any>;
  onSuccess?: () => void;
  entryId?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!entryId;

  // Initialize form
  const form = useForm<T>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues as T,
  });

  // Handle form submission with enhanced validation
  const handleSubmit = async (data: T) => {
    setIsSubmitting(true);
    try {
      // Additional client-side validation for common fields
      // Check for empty required fields that might have been missed by Zod
      if (tableName === "income_entries" || tableName === "expenditure_entries") {
        // Use toast notifications for validation errors instead of throwing exceptions
        if (!data.date) {
          toast.error("Date is required");
          return; // Exit early without logging to console
        }
        if (!data.category_id) {
          toast.error("Category is required");
          return; // Exit early without logging to console
        }
        if (!data.amount || isNaN(parseFloat(data.amount as string)) || parseFloat(data.amount as string) <= 0) {
          toast.error("Amount must be a valid number greater than zero");
          return; // Exit early without logging to console
        }
        if (!data.account_id) {
          toast.error("Account is required");
          return; // Exit early without logging to console
        }
      }

      // Transform data if needed
      const formattedData = transformData ? transformData(data) : data;

      // Log the data being sent to the database
      console.log(`${isEditing ? "Updating" : "Creating"} ${tableName} with data:`, JSON.stringify(formattedData, null, 2));

      // Check for empty account_id and replace with null
      if (formattedData.account_id === "") {
        console.log("Replacing empty account_id with null");
        formattedData.account_id = null;
      }

      // Log the final data after all transformations
      console.log(`Final ${tableName} data after transformations:`, JSON.stringify(formattedData, null, 2));

      if (isEditing) {
        // For income and expenditure entries, we need to handle account balance updates
        if ((tableName === "income_entries" || tableName === "expenditure_entries") &&
            formattedData.account_id) {

          // First, get the original entry to compare amounts
          const { data: originalEntry, error: fetchError } = await supabase
            .from(tableName)
            .select("amount, account_id")
            .eq("id", entryId)
            .single();

          if (fetchError) {
            console.error(`Error fetching original ${tableName}:`, fetchError);
            throw fetchError;
          }

          // Update the entry
          const { data: responseData, error } = await supabase
            .from(tableName)
            .update(formattedData)
            .eq("id", entryId)
            .select();

          if (error) {
            console.error(`Error updating ${tableName}:`, error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            throw error;
          }

          // Handle account balance updates
          try {
            // If account changed, update both old and new account balances
            if (originalEntry.account_id !== formattedData.account_id) {
              // Remove amount from old account
              if (originalEntry.account_id) {
                await updateAccountBalance(
                  originalEntry.account_id,
                  originalEntry.amount,
                  'delete',
                  tableName === "income_entries" ? 'income' : 'expenditure'
                );
              }

              // Add amount to new account
              await updateAccountBalance(
                formattedData.account_id,
                formattedData.amount,
                'create',
                tableName === "income_entries" ? 'income' : 'expenditure'
              );
            }
            // If only amount changed, update the account balance
            else if (originalEntry.amount !== formattedData.amount) {
              await updateAccountBalance(
                formattedData.account_id,
                formattedData.amount,
                'update',
                tableName === "income_entries" ? 'income' : 'expenditure',
                originalEntry.amount
              );
            }
          } catch (balanceError) {
            console.error("Error updating account balance:", balanceError);
            toast.warning("Entry updated but account balance may not be accurate");
          }

          console.log(`Successfully updated ${tableName}:`, responseData);
          toast.success(successMessage);
        } else {
          // For other entry types, just update normally
          const { data: responseData, error } = await supabase
            .from(tableName)
            .update(formattedData)
            .eq("id", entryId)
            .select();

          if (error) {
            console.error(`Error updating ${tableName}:`, error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            throw error;
          }

          console.log(`Successfully updated ${tableName}:`, responseData);
          toast.success(successMessage);
        }
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from(tableName)
          .insert(formattedData)
          .select();

        if (error) {
          console.error(`Error creating ${tableName}:`, error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          throw error;
        }

        console.log(`Successfully created ${tableName}:`, data);
        toast.success(successMessage);

        // Update account balance for income and expenditure entries
        if ((tableName === "income_entries" || tableName === "expenditure_entries") &&
            formattedData.account_id) {
          try {
            await updateAccountBalance(
              formattedData.account_id,
              formattedData.amount,
              'create',
              tableName === "income_entries" ? 'income' : 'expenditure'
            );
          } catch (balanceError) {
            console.error("Error updating account balance:", balanceError);
            toast.warning("Entry created but account balance may not be accurate");
          }
        }

        // Special handling for liability entries that are loans
        if (tableName === "liability_entries" &&
            (formattedData.is_loan === true || formattedData.is_loan === "true")) {
          try {
            console.log("Creating income entry for loan");

            // Find the Loans income category
            const { data: loanCategory, error: categoryError } = await supabase
              .from("income_categories")
              .select("id")
              .eq("name", "Loans")
              .single();

            if (categoryError) {
              console.warn("Could not find Loans income category:", categoryError);
              // Create the category if it doesn't exist
              const { data: newCategory, error: createError } = await supabase
                .from("income_categories")
                .insert({
                  name: "Loans",
                  description: "Income from loans"
                })
                .select();

              if (createError) {
                console.error("Failed to create Loans income category:", createError);
                throw createError;
              }

              var loanCategoryId = newCategory[0].id;
            } else {
              var loanCategoryId = loanCategory.id;
            }

            // Create the income entry with liability ID stored in payment_details, not in description
            const incomeData = {
              date: formattedData.date,
              category_id: loanCategoryId,
              description: `Loan from ${formattedData.creditor_name}${formattedData.details ? ` - ${formattedData.details}` : ''}`,
              amount: typeof formattedData.total_amount === 'string' ? parseFloat(formattedData.total_amount) : formattedData.total_amount,
              payment_method: "other",
              payment_details: { source: "liability", liability_id: data?.[0]?.id || null }
            };

            console.log("Creating income entry with loan data:", incomeData);

            const { error: incomeError } = await supabase
              .from("income_entries")
              .insert(incomeData);

            if (incomeError) {
              console.error("Failed to create income entry for loan:", incomeError);
              // Don't throw here, as the liability was already created successfully
              toast.warning("Liability created but failed to record as income");
            } else {
              console.log("Successfully created income entry for loan");
              toast.success("Loan recorded as income");
            }
          } catch (incomeError) {
            console.error("Error creating income entry for loan:", incomeError);
            toast.warning("Liability created but failed to record as income");
          }
        }

        // Reset form if not in edit mode and resetAfterSubmit is true
        if (resetAfterSubmit) {
          form.reset(defaultValues as T);
        }
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Extract more detailed error information if available
      let detailedError = errorMessage;
      if (error instanceof Error) {
        detailedError = `${errorMessage}: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        try {
          // Try to extract Supabase error details
          const errorObj = error as any;
          if (errorObj.code || errorObj.message || errorObj.details) {
            detailedError = `${errorMessage}: ${errorObj.message || ''} ${errorObj.details || ''} (Code: ${errorObj.code || 'unknown'})`;
          } else {
            detailedError = `${errorMessage}: ${JSON.stringify(error)}`;
          }
        } catch (e) {
          detailedError = `${errorMessage}: Unknown error format`;
        }
      }

      // Only show toast notification without logging to console
      toast.error(detailedError);

      // Re-throw the error but don't include the message to avoid console logging
      throw new Error();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    handleSubmit: form.handleSubmit(handleSubmit),
  };
}
