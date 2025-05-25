"use client";

import React, { useState, useEffect, useCallback } from "react";
// Router import removed as we're using window.location for navigation
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ExpenditureCategory, LiabilityEntry, LiabilityCategory, Account, ExpenditureEntry } from "@/types/finance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filterSystemExpenditureCategories } from "@/lib/identify-system-categories";
import { formatCurrency } from "@/lib/format-currency";
import { FinanceFormContainer } from "@/components/finance/common/finance-form-container";
import { MobileOptimizedForm } from "@/components/ui/mobile-optimized-form";
import { AccountField } from "./account-field";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Alert,
  AlertTitle,
  AlertDescription
} from "@/components/ui/alert";

// Form schema with strong validation
const expenditureFormSchema = z.object({
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Please select a valid date",
  }).refine(date => !!date, {
    message: "Date is required",
  }),
  category_id: z.string({
    required_error: "Category is required",
  }),
  department_id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    {
      message: "Amount must be a positive number",
    }
  ),
  recipient: z.string().optional(),
  payment_method: z.string({
    required_error: "Payment method is required",
  }),
  account_id: z.string({
    required_error: "Account is required",
  }),
  liability_payment: z.boolean().optional().default(false),
  liability_id: z.string().optional(),
}).refine(
  (data) => {
    // If liability_payment is true, liability_id is required
    if (data.liability_payment) {
      return !!data.liability_id;
    }
    return true;
  },
  {
    message: "Liability must be selected for liability payments",
    path: ["liability_id"],
  }
);

export type ExpenditureFormValues = z.infer<typeof expenditureFormSchema>;

interface EnhancedExpenditureFormProps {
  expenditureCategories: ExpenditureCategory[];
  liabilityEntries: LiabilityEntry[];
  liabilityCategories: LiabilityCategory[];
  accounts: Account[];
  entry?: ExpenditureEntry | null;
  isEditing?: boolean;
  isDialog?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  selectedLiabilityId?: string | null;
  showLiabilityPaymentOption?: boolean; // New prop to control visibility of liability payment checkbox
}

export function EnhancedExpenditureForm({
  expenditureCategories,
  liabilityEntries,
  liabilityCategories,
  accounts,
  entry,
  isEditing = false,
  isDialog = false,
  onSuccess,
  onCancel,
  selectedLiabilityId,
  showLiabilityPaymentOption = false, // Default to false - hide the checkbox
}: EnhancedExpenditureFormProps) {
  // Router removed as we're using window.location for navigation
  const queryClient = useQueryClient();
  const [isLiabilityPayment, setIsLiabilityPayment] = useState(false);

  // Initialize component

  // Initialize form
  const form = useForm<ExpenditureFormValues>({
    resolver: zodResolver(expenditureFormSchema),
    defaultValues: {
      date: entry ? new Date(entry.date) : new Date(),
      category_id: entry?.category_id || "",
      department_id: entry?.department_id || "",
      description: entry?.description || "",
      amount: entry ? entry.amount.toString() : "",
      recipient: entry?.recipient || "",
      payment_method: entry?.payment_method || "cash",
      account_id: entry?.account_id || "", // Use empty string instead of "none"
      liability_payment: entry?.liability_payment || false,
      liability_id: entry?.liability_id || "",
    },
  });

  // Watch for form value changes
  const watchLiabilityPayment = form.watch("liability_payment");
  const watchLiabilityId = form.watch("liability_id");
  const watchAmount = form.watch("amount");

  // Effect to update state when form values change
  useEffect(() => {
    setIsLiabilityPayment(watchLiabilityPayment);

    // If liability payment is checked and no category is selected, auto-select a default category
    if (watchLiabilityPayment && !form.getValues("category_id")) {
      // Find a suitable default category
      const defaultCategory = expenditureCategories.find(cat =>
        cat.name.toLowerCase().includes('bill') ||
        cat.name.toLowerCase().includes('debt') ||
        cat.name.toLowerCase().includes('loan')
      );

      if (defaultCategory) {
        form.setValue("category_id", defaultCategory.id);
      } else if (expenditureCategories.length > 0) {
        // If no suitable category found, use the first available category
        form.setValue("category_id", expenditureCategories[0].id);
      }
    }
  }, [watchLiabilityPayment, form, expenditureCategories]);

  // Handle liability entries changes
  useEffect(() => {
    // If we have a selected liability ID and entries have loaded, try to find and set the liability
    if (selectedLiabilityId && liabilityEntries && liabilityEntries.length > 0 && !isEditing) {
      const selectedLiability = liabilityEntries.find(
        (liability) => liability.id === selectedLiabilityId
      );

      if (selectedLiability) {
        // Set form values if they're not already set
        if (!watchLiabilityId) {
          // Set default category for liability payments
          const defaultCategory = expenditureCategories.find(cat =>
            cat.name.toLowerCase().includes('bill') ||
            cat.name.toLowerCase().includes('debt') ||
            cat.name.toLowerCase().includes('loan')
          );

          if (defaultCategory) {
            form.setValue("category_id", defaultCategory.id);
          }

          // Set form values for liability payment
          form.setValue("liability_payment", true);
          form.setValue("liability_id", selectedLiabilityId);
          form.setValue("recipient", selectedLiability.creditor_name);
          form.setValue("description", `Payment for ${selectedLiability.creditor_name}`);
          form.setValue("payment_method", "cash"); // Set default payment method

          // Convert amount_remaining to number if it's a string
          const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
            ? parseFloat(selectedLiability.amount_remaining)
            : selectedLiability.amount_remaining;

          // If the liability has a remaining amount, suggest it as the payment amount
          if (amountRemaining > 0) {
            form.setValue("amount", amountRemaining.toString());
          }

          setIsLiabilityPayment(true);
        }
      }
    }
  }, [liabilityEntries, selectedLiabilityId, isEditing, form, watchLiabilityId, expenditureCategories]);

  // Fetch the selected liability directly when component mounts
  useEffect(() => {
    if (selectedLiabilityId && !isEditing) {
      const fetchSelectedLiability = async () => {
        try {
          // Try a simple query first
          const { data, error } = await supabase
            .from("liability_entries")
            .select("*")
            .eq("id", selectedLiabilityId)
            .single();

          if (error) {
            return;
          }

          if (data) {
            // Set default category
            const defaultCategory = expenditureCategories.find(cat =>
              cat.name.toLowerCase().includes('bill') ||
              cat.name.toLowerCase().includes('debt') ||
              cat.name.toLowerCase().includes('loan')
            );

            if (defaultCategory) {
              form.setValue("category_id", defaultCategory.id);
            }

            // Set form values
            form.setValue("liability_payment", true);
            form.setValue("liability_id", selectedLiabilityId);
            form.setValue("recipient", data.creditor_name);
            form.setValue("description", `Payment for ${data.creditor_name}`);
            form.setValue("payment_method", "cash");

            // Handle amount
            const amountRemaining = typeof data.amount_remaining === 'string'
              ? parseFloat(data.amount_remaining)
              : data.amount_remaining;

            if (amountRemaining > 0) {
              form.setValue("amount", amountRemaining.toString());
            }

            setIsLiabilityPayment(true);
          }
        } catch (error) {
          // Silent error handling to prevent app from crashing
        }
      };

      fetchSelectedLiability();
    }
  }, [selectedLiabilityId, isEditing, supabase, expenditureCategories, form]);

  // Effect to handle selected liability from URL
  useEffect(() => {
    // Only proceed if we have a liability ID and we're not in edit mode
    if (selectedLiabilityId && !isEditing) {
      // If liabilityEntries is empty or not yet loaded, fetch the specific liability directly
      if (!liabilityEntries || liabilityEntries.length === 0) {
        // Fetch the specific liability directly from Supabase
        const fetchLiability = async () => {
          try {
            const { data, error } = await supabase
              .from("liability_entries")
              .select("*")
              .eq("id", selectedLiabilityId)
              .single();

            if (error) {
              // Try a simpler query without the join
              try {
                const { data: simpleData, error: simpleError } = await supabase
                  .from("liability_entries")
                  .select("*")
                  .eq("id", selectedLiabilityId)
                  .single();

                if (simpleError) {
                  return;
                }

                if (simpleData) {
                  // Format the data to match the expected structure
                  const selectedLiability = {
                    ...simpleData,
                    category: null // No category info in simple query
                  };

                  // Set default category for liability payments
                  const defaultCategory = expenditureCategories.find(cat =>
                    cat.name.toLowerCase().includes('bill') ||
                    cat.name.toLowerCase().includes('debt') ||
                    cat.name.toLowerCase().includes('loan')
                  );

                  if (defaultCategory) {
                    form.setValue("category_id", defaultCategory.id);
                  }

                  // Set form values for liability payment
                  form.setValue("liability_payment", true);
                  form.setValue("liability_id", selectedLiabilityId);
                  form.setValue("recipient", selectedLiability.creditor_name);
                  form.setValue("description", `Payment for ${selectedLiability.creditor_name}`);
                  form.setValue("payment_method", "cash"); // Set default payment method

                  // Convert amount_remaining to number if it's a string
                  const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
                    ? parseFloat(selectedLiability.amount_remaining)
                    : selectedLiability.amount_remaining;

                  // If the liability has a remaining amount, suggest it as the payment amount
                  if (amountRemaining > 0) {
                    form.setValue("amount", amountRemaining.toString());
                  }

                  setIsLiabilityPayment(true);
                  return; // Exit early since we've handled the data
                }
              } catch (fallbackError) {
                return;
              }

              // If we get here, both queries failed
              return;
            }

            if (data) {
              // Format the data to match the expected structure
              const selectedLiability = {
                ...data,
                category: null // No category info since we can't join
              };

              // Set default category for liability payments
              const defaultCategory = expenditureCategories.find(cat =>
                cat.name.toLowerCase().includes('bill') ||
                cat.name.toLowerCase().includes('debt') ||
                cat.name.toLowerCase().includes('loan')
              );

              if (defaultCategory) {
                form.setValue("category_id", defaultCategory.id);
              }

              // Set form values for liability payment
              form.setValue("liability_payment", true);
              form.setValue("liability_id", selectedLiabilityId);
              form.setValue("recipient", selectedLiability.creditor_name);
              form.setValue("description", `Payment for ${selectedLiability.creditor_name}`);
              form.setValue("payment_method", "cash"); // Set default payment method

              // Convert amount_remaining to number if it's a string
              const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
                ? parseFloat(selectedLiability.amount_remaining)
                : selectedLiability.amount_remaining;

              // If the liability has a remaining amount, suggest it as the payment amount
              if (amountRemaining > 0) {
                form.setValue("amount", amountRemaining.toString());
              }

              setIsLiabilityPayment(true);
            }
          } catch (error) {
            // Silent error handling
          }
        };

        fetchLiability();
      } else {
        // Try to find the liability in the existing entries
        const selectedLiability = liabilityEntries.find(
          (liability) => liability.id === selectedLiabilityId
        );

        if (selectedLiability) {
          // Set default category for liability payments
          const defaultCategory = expenditureCategories.find(cat =>
            cat.name.toLowerCase().includes('bill') ||
            cat.name.toLowerCase().includes('debt') ||
            cat.name.toLowerCase().includes('loan')
          );

          if (defaultCategory) {
            form.setValue("category_id", defaultCategory.id);
          }

          // Set form values for liability payment
          form.setValue("liability_payment", true);
          form.setValue("liability_id", selectedLiabilityId);
          form.setValue("recipient", selectedLiability.creditor_name);
          form.setValue("description", `Payment for ${selectedLiability.creditor_name}`);
          form.setValue("payment_method", "cash"); // Set default payment method

          // Convert amount_remaining to number if it's a string
          const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
            ? parseFloat(selectedLiability.amount_remaining)
            : selectedLiability.amount_remaining;

          // If the liability has a remaining amount, suggest it as the payment amount
          if (amountRemaining > 0) {
            form.setValue("amount", amountRemaining.toString());
          }

          setIsLiabilityPayment(true);
        } else {
          // If not found in the entries, fetch directly
          const fetchLiability = async () => {
            try {
              const { data, error } = await supabase
                .from("liability_entries")
                .select("*")
                .eq("id", selectedLiabilityId)
                .single();

              if (error) {
                // Try a simpler query without the join
                try {
                  const { data: simpleData, error: simpleError } = await supabase
                    .from("liability_entries")
                    .select("*")
                    .eq("id", selectedLiabilityId)
                    .single();

                  if (simpleError) {
                    return;
                  }

                  if (simpleData) {
                    // Format the data to match the expected structure
                    const selectedLiability = {
                      ...simpleData,
                      category: null // No category info in simple query
                    };

                    // Set default category for liability payments
                    const defaultCategory = expenditureCategories.find(cat =>
                      cat.name.toLowerCase().includes('bill') ||
                      cat.name.toLowerCase().includes('debt') ||
                      cat.name.toLowerCase().includes('loan')
                    );

                    if (defaultCategory) {
                      form.setValue("category_id", defaultCategory.id);
                    }

                    // Set form values for liability payment
                    form.setValue("liability_payment", true);
                    form.setValue("liability_id", selectedLiabilityId);
                    form.setValue("recipient", selectedLiability.creditor_name);
                    form.setValue("description", `Payment for ${selectedLiability.creditor_name}`);
                    form.setValue("payment_method", "cash"); // Set default payment method

                    // Convert amount_remaining to number if it's a string
                    const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
                      ? parseFloat(selectedLiability.amount_remaining)
                      : selectedLiability.amount_remaining;

                    // If the liability has a remaining amount, suggest it as the payment amount
                    if (amountRemaining > 0) {
                      form.setValue("amount", amountRemaining.toString());
                    }

                    setIsLiabilityPayment(true);
                    return; // Exit early since we've handled the data
                  }
                } catch (fallbackError) {
                  return;
                }

                // If we get here, both queries failed
                return;
              }

              if (data) {
                // Format the data to match the expected structure
                const selectedLiability = {
                  ...data,
                  category: null // No category info since we can't join
                };

                // Set default category for liability payments
                const defaultCategory = expenditureCategories.find(cat =>
                  cat.name.toLowerCase().includes('bill') ||
                  cat.name.toLowerCase().includes('debt') ||
                  cat.name.toLowerCase().includes('loan')
                );

                if (defaultCategory) {
                  form.setValue("category_id", defaultCategory.id);
                }

                // Set form values for liability payment
                form.setValue("liability_payment", true);
                form.setValue("liability_id", selectedLiabilityId);
                form.setValue("recipient", selectedLiability.creditor_name);
                form.setValue("description", `Payment for ${selectedLiability.creditor_name}`);
                form.setValue("payment_method", "cash"); // Set default payment method

                // Convert amount_remaining to number if it's a string
                const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
                  ? parseFloat(selectedLiability.amount_remaining)
                  : selectedLiability.amount_remaining;

                // If the liability has a remaining amount, suggest it as the payment amount
                if (amountRemaining > 0) {
                  form.setValue("amount", amountRemaining.toString());
                }

                setIsLiabilityPayment(true);
              }
            } catch (error) {
              // Silent error handling
            }
          };

          fetchLiability();
        }
      }
    }
  }, [selectedLiabilityId, liabilityEntries, form, isEditing, expenditureCategories, supabase]);

  // Handle liability change
  const handleLiabilityChange = useCallback((liabilityId: string) => {
    const selectedLiability = liabilityEntries.find(
      (liability) => liability.id === liabilityId
    );

    if (selectedLiability) {
      form.setValue("recipient", selectedLiability.creditor_name);
      form.setValue("description", `Payment for ${selectedLiability.creditor_name}`);

      // Convert amount_remaining to number if it's a string
      const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
        ? parseFloat(selectedLiability.amount_remaining)
        : typeof selectedLiability.amount_remaining === 'number'
          ? selectedLiability.amount_remaining
          : 0;

      // If the liability has a remaining amount, suggest it as the payment amount
      if (amountRemaining > 0) {
        form.setValue("amount", amountRemaining.toString());
      }
    }
  }, [liabilityEntries, form]);

  // Effect to update form when liability ID changes
  useEffect(() => {
    if (watchLiabilityId && isLiabilityPayment) {
      handleLiabilityChange(watchLiabilityId);
    }
  }, [watchLiabilityId, isLiabilityPayment, handleLiabilityChange]);

  // Create mutation for adding/updating expenditure
  const expenditureMutation = useMutation({
    mutationFn: async (values: ExpenditureFormValues) => {
      try {
        // Format the data for the database
        const expenditureData = {
          date: format(values.date, "yyyy-MM-dd"),
          category_id: values.category_id,
          department_id: values.department_id || null,
          description: values.description,
          amount: parseFloat(values.amount), // Amount is numeric in the database
          recipient: values.recipient || null,
          payment_method: values.payment_method,
          account_id: values.account_id || null, // Use account_id field
          liability_payment: values.liability_payment,
          liability_id: values.liability_payment ? values.liability_id : null,
        };

        console.log("Formatted expenditure data:", JSON.stringify(expenditureData, null, 2));

        // If this is a liability payment, update the liability first
        if (values.liability_payment && values.liability_id) {
          const selectedLiability = liabilityEntries.find(
            (liability) => liability.id === values.liability_id
          );

          if (selectedLiability) {
            const paymentAmount = parseFloat(values.amount);
            const currentAmountPaid = typeof selectedLiability.amount_paid === 'string'
              ? parseFloat(selectedLiability.amount_paid)
              : selectedLiability.amount_paid;
            const currentTotalAmount = typeof selectedLiability.total_amount === 'string'
              ? parseFloat(selectedLiability.total_amount)
              : selectedLiability.total_amount;

            const newAmountPaid = currentAmountPaid + paymentAmount;
            const newAmountRemaining = Math.max(0, currentTotalAmount - newAmountPaid);
            const newStatus = newAmountPaid >= currentTotalAmount ? "paid" : "partial";

            // Update the liability
            console.log("Updating liability with data:", JSON.stringify({
              amount_paid: newAmountPaid.toString(),
              amount_remaining: newAmountRemaining.toString(),
              status: newStatus,
              payment_date: format(values.date, "yyyy-MM-dd"),
              is_paid: newStatus === "paid" ? true : false,
            }, null, 2));

            const { data: updatedLiability, error: liabilityError } = await supabase
              .from("liability_entries")
              .update({
                amount_paid: newAmountPaid.toString(), // Convert to string for text column
                amount_remaining: newAmountRemaining.toString(), // Convert to string for text column
                status: newStatus,
                payment_date: format(values.date, "yyyy-MM-dd"), // Use payment_date instead of last_payment_date
                is_paid: newStatus === "paid" ? true : false, // Update is_paid field
              })
              .eq("id", values.liability_id)
              .select();

            if (liabilityError) {
              console.error("Error updating liability:", liabilityError);
              console.error("Error details:", JSON.stringify(liabilityError, null, 2));
              throw new Error(`Failed to update liability: ${liabilityError.message || liabilityError.details || JSON.stringify(liabilityError)}`);
            }

            console.log("Successfully updated liability:", updatedLiability);
          }
        }

        // Now save the expenditure
        if (isEditing && entry) {
          // Update existing expenditure entry
          console.log("Updating expenditure with data:", JSON.stringify(expenditureData, null, 2));

          const { data, error } = await supabase
            .from("expenditure_entries")
            .update(expenditureData)
            .eq("id", entry.id)
            .select();

          if (error) {
            console.error("Error updating expenditure:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            throw new Error(`Failed to update expenditure: ${error.message || error.details || JSON.stringify(error)}`);
          }

          console.log("Successfully updated expenditure:", data);
          return data;
        } else {
          // Create new expenditure entry
          console.log("Creating expenditure with data:", JSON.stringify(expenditureData, null, 2));

          const { data, error } = await supabase
            .from("expenditure_entries")
            .insert(expenditureData)
            .select();

          if (error) {
            throw new Error(`Failed to create expenditure: ${error.message || error.details || JSON.stringify(error)}`);
          }

          // Expenditure created successfully

          // If this expenditure is linked to a budget item, update the budget item
          if (data[0]?.budget_item_id) {
            try {
              // Import the updateBudgetItemForExpenditure function dynamically to avoid circular dependencies
              const { updateBudgetItemForExpenditure } = await import("@/lib/update-budget-item-for-expenditure");

              // Update the budget item
              const success = await updateBudgetItemForExpenditure(data[0].id, queryClient);

              if (!success) {
                toast.warning(`Failed to update budget item for expenditure`);
              }
            } catch (budgetUpdateError) {
              toast.error("Error updating budget item for expenditure");
            }
          }

          return data;
        }
      } catch (error) {
        // Don't log to console, just throw the error to be handled by the error handler
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });

      // Force immediate refetch of accounts to refresh account balances
      queryClient.invalidateQueries({
        queryKey: ["accounts"],
        refetchType: 'all'
      });

      // Also invalidate account transactions
      queryClient.invalidateQueries({
        queryKey: ["accountTransactions"],
        refetchType: 'all'
      });

      // Also invalidate budget-related queries
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      // Also invalidate liability queries if this was a liability payment
      if (isLiabilityPayment || selectedLiabilityId) {
        // Force immediate refetch of all liability data
        queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
        queryClient.invalidateQueries({ queryKey: ["liabilityEntriesForPayment"] });
        queryClient.invalidateQueries({ queryKey: ["liabilityEntry"] });

        // Force refetch of all liability data
        queryClient.refetchQueries({ queryKey: ["liabilityEntries"] });
        queryClient.refetchQueries({ queryKey: ["liabilityEntriesForPayment"] });

        // Show success message for liability payment
        toast.success("Payment for liability recorded successfully");

        // If this was a liability payment from URL parameter, redirect back to liabilities tab
        if (selectedLiabilityId) {
          // Reset form first
          form.reset({
            date: new Date(),
            category_id: "",
            department_id: "",
            description: "",
            amount: "",
            recipient: "",
            payment_method: "cash",
            account_id: "",
            liability_payment: false,
            liability_id: "",
          });

          setIsLiabilityPayment(false);

          // Use a different approach for redirection
          // First, call the success callback to update local state
          onSuccess();

          // Then use window.location for a full page navigation to ensure proper rendering
          setTimeout(() => {
            window.location.href = `/finance?tab=liabilities&t=${Date.now()}`;
          }, 300);

          return;
        }
      }

      // Reset form if not editing
      if (!isEditing) {
        form.reset({
          date: new Date(),
          category_id: "",
          department_id: "",
          description: "",
          amount: "",
          recipient: "",
          payment_method: "cash",
          account_id: "", // Use empty string instead of "none"
          liability_payment: false,
          liability_id: "",
        });

        // Reset liability payment state
        if (isLiabilityPayment) {
          setIsLiabilityPayment(false);
        }
      }

      // Call success callback
      onSuccess();
    },
    onError: (error) => {
      // Extract error message if available
      let errorMessage = "Failed to save expenditure";
      if (error instanceof Error) {
        errorMessage = `Failed to save expenditure: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = `Failed to save expenditure: ${JSON.stringify(error)}`;
      }

      // Show error in toast notification only
      toast.error(errorMessage);
    },
  });

  // Handle form submission
  const onSubmit = (values: ExpenditureFormValues) => {
    // Using toast notifications for validation

    // For liability payments, auto-select a default category if none is selected
    if (values.liability_payment && !values.category_id) {
      // Find a suitable default category
      const defaultCategory = expenditureCategories.find(cat =>
        cat.name.toLowerCase().includes('bill') ||
        cat.name.toLowerCase().includes('debt') ||
        cat.name.toLowerCase().includes('loan')
      );

      if (defaultCategory) {
        values.category_id = defaultCategory.id;
        form.setValue("category_id", defaultCategory.id);
      } else if (expenditureCategories.length > 0) {
        // If no suitable category found, use the first available category
        values.category_id = expenditureCategories[0].id;
        form.setValue("category_id", expenditureCategories[0].id);
      }
    }

    // Comprehensive validation for all required fields using toast notifications
    if (!values.date) {
      toast.error('Please select a date');
      return;
    }

    if (!values.category_id) {
      toast.error('Please select a category');
      return;
    }

    if (!values.description || values.description.trim() === '') {
      toast.error('Please enter a description');
      return;
    }

    if (!values.amount || isNaN(parseFloat(values.amount)) || parseFloat(values.amount) <= 0) {
      toast.error('Please enter a valid amount greater than zero');
      return;
    }

    if (!values.payment_method) {
      toast.error('Please select a payment method');
      return;
    }

    if (!values.account_id) {
      toast.error('Please select an account');
      return;
    }

    // Check if expenditure amount exceeds account balance
    if (values.account_id) {
      const selectedAccount = accounts.find(account => account.id === values.account_id);
      if (selectedAccount) {
        const expenditureAmount = parseFloat(values.amount);
        // Use balance or calculatedBalance, whichever is available
        const accountBalance = selectedAccount.balance !== undefined ? selectedAccount.balance :
                              (selectedAccount.calculatedBalance !== undefined ? selectedAccount.calculatedBalance : 0);

        if (expenditureAmount > accountBalance) {
          toast.error(`Expenditure amount (${formatCurrency(expenditureAmount)}) exceeds account balance (${formatCurrency(accountBalance)}). Please select a different account or reduce the amount.`);
          return; // Prevent form submission
        }
      }
    }

    // Validate liability payment
    if (values.liability_payment && values.liability_id) {
      const selectedLiability = liabilityEntries.find(
        (liability) => liability.id === values.liability_id
      );

      if (!selectedLiability) {
        toast.error('Please select a valid liability');
        return;
      }

      if (selectedLiability) {
        const paymentAmount = parseFloat(values.amount);

        // Convert amount_remaining to number if it's a string
        const amountRemaining = typeof selectedLiability.amount_remaining === 'string'
          ? parseFloat(selectedLiability.amount_remaining)
          : typeof selectedLiability.amount_remaining === 'number'
            ? selectedLiability.amount_remaining
            : 0;

        // Check if payment amount exceeds remaining amount
        if (paymentAmount > amountRemaining) {
          toast.warning(`Payment amount (${paymentAmount.toFixed(2)}) exceeds remaining liability amount (${amountRemaining.toFixed(2)})`);
          // Continue with submission despite warning
        }
      }
    }

    try {
      // Submit the form
      expenditureMutation.mutate(values);
    } catch (error) {
      // This catch block is for any synchronous errors that might occur
      // Extract error message without logging to console
      let errorMessage = "Failed to process expenditure";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }

      // Show error in toast notification only
      toast.error(errorMessage);
    }
  };

  // Determine the form title based on context
  const formTitle = isEditing
    ? "Edit Expenditure"
    : selectedLiabilityId
      ? "Make Liability Payment"
      : "Add Expenditure";

  // Determine the submit button label
  const submitLabel = isEditing
    ? "Update"
    : selectedLiabilityId
      ? "Make Payment"
      : "Add Expenditure";

  // Handle cancel action
  const handleCancel = () => {
    if (selectedLiabilityId) {
      // Reset form
      form.reset({
        date: new Date(),
        category_id: "",
        department_id: "",
        description: "",
        amount: "",
        recipient: "",
        payment_method: "cash",
        account_id: "",
        liability_payment: false,
        liability_id: "",
      });
      setIsLiabilityPayment(false);
      // Use window.location for a full page navigation to ensure proper rendering
      window.location.href = `/finance?tab=liabilities&t=${Date.now()}`;
    } else if (onCancel) {
      onCancel();
    }
  };

  // We're using toast notifications instead of alerts

  // For dialog mode, use the FinanceFormContainer
  if (isDialog) {
    return (
      <FinanceFormContainer
        title={formTitle}
        isSubmitting={expenditureMutation.isPending}
        submitLabel={submitLabel}
        onSubmit={form.handleSubmit(onSubmit)}
        onCancel={onCancel}
        isDialog={true}

      >
        <Form {...form}>
          <form id="finance-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col space-y-4">
            {/* Form fields for dialog mode */}
            <div className="space-y-4">
              {/* Date Field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Date</FormLabel>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select date"
                      disabledDates={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Field */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filterSystemExpenditureCategories(expenditureCategories).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description"
                        className="resize-none w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className="pl-7 w-full"
                          onWheel={preventWheelScroll}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recipient Field */}
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Recipient</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter recipient" className="w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Account Field */}
              <AccountField
                form={form}
                accounts={accounts}
                amount={watchAmount}
              />

              {/* Liability Selection Field - Show when making a payment for a specific liability or when liability payment is checked */}
              {(selectedLiabilityId || isLiabilityPayment) && (
                <FormField
                  control={form.control}
                  name="liability_id"
                  render={({ field }) => (
                    <FormItem className={`w-full ${selectedLiabilityId ? "border border-primary/30 p-4 rounded-md bg-primary/5" : ""}`}>
                      <FormLabel>{selectedLiabilityId ? "Selected Liability" : "Select Liability"}</FormLabel>
                      {selectedLiabilityId && (
                        <FormDescription className="text-primary font-medium">
                          Making payment for a specific liability
                        </FormDescription>
                      )}
                      <Select
                        onValueChange={(value) => {
                          // Only allow changing if not making payment for a specific liability
                          if (!selectedLiabilityId) {
                            field.onChange(value);
                            handleLiabilityChange(value);
                          }
                        }}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={Boolean(selectedLiabilityId)} // Disable when making payment for a specific liability
                      >
                        <FormControl className="w-full">
                          <SelectTrigger>
                            <SelectValue placeholder="Select a liability" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {liabilityEntries.map((liability) => {
                            // Safely convert amount_remaining to a number for display
                            const amountRemaining = typeof liability.amount_remaining === 'string'
                              ? parseFloat(liability.amount_remaining)
                              : typeof liability.amount_remaining === 'number'
                                ? liability.amount_remaining
                                : 0;

                            return (
                              <SelectItem key={liability.id} value={liability.id}>
                                {liability.creditor_name} - ${amountRemaining.toFixed(2)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </form>
        </Form>
      </FinanceFormContainer>
    );
  }

  // For regular mode, use the MobileOptimizedForm
  return (
    <Form {...form}>
      <MobileOptimizedForm
        title={formTitle}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={expenditureMutation.isPending}
        submitLabel={submitLabel}
        onCancel={selectedLiabilityId ? handleCancel : undefined}
        cancelLabel="Cancel"
        className="border shadow-sm"
      >
        <div className="flex flex-col space-y-4">
          {/* Date Field */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Date</FormLabel>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select date"
                  disabledDates={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Category Field */}
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl className="w-full">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filterSystemExpenditureCategories(expenditureCategories).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description Field */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter description"
                    className="resize-none w-full"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Account Field */}
          <AccountField
            form={form}
            accounts={accounts}
            amount={watchAmount}
          />

          {/* Amount Field */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className="pl-7 w-full"
                      onWheel={preventWheelScroll}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Recipient Field */}
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Recipient</FormLabel>
                <FormControl>
                  <Input placeholder="Enter recipient" className="w-full" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />



          {/* Liability Payment Checkbox - Only show when explicitly enabled and not making a payment for a specific liability */}
          {showLiabilityPaymentOption && !selectedLiabilityId && (
            <FormField
              control={form.control}
              name="liability_payment"
              render={({ field }) => (
                <FormItem className="w-full flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);

                        // If checked and no category is selected, auto-select a default category
                        if (checked && !form.getValues("category_id")) {
                          console.log("Liability payment checked via checkbox, auto-selecting category");

                          // Find a suitable default category
                          const defaultCategory = expenditureCategories.find(cat =>
                            cat.name.toLowerCase().includes('bill') ||
                            cat.name.toLowerCase().includes('debt') ||
                            cat.name.toLowerCase().includes('loan')
                          );

                          if (defaultCategory) {
                            console.log("Found default category:", defaultCategory.name);
                            form.setValue("category_id", defaultCategory.id);
                          } else if (expenditureCategories.length > 0) {
                            // If no suitable category found, use the first available category
                            console.log("Using first available category");
                            form.setValue("category_id", expenditureCategories[0].id);
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Liability Payment</FormLabel>
                    <FormDescription>
                      Check if this expenditure is a payment for an existing liability
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* Liability Selection Field - Show when making a payment for a specific liability or when liability payment is checked */}
          {(selectedLiabilityId || isLiabilityPayment) && (
            <FormField
              control={form.control}
              name="liability_id"
              render={({ field }) => (
                <FormItem className={`w-full ${selectedLiabilityId ? "border border-primary/30 p-4 rounded-md bg-primary/5" : ""}`}>
                  <FormLabel>{selectedLiabilityId ? "Selected Liability" : "Select Liability"}</FormLabel>
                  {selectedLiabilityId && (
                    <FormDescription className="text-primary font-medium">
                      Making payment for a specific liability
                    </FormDescription>
                  )}
                  <Select
                    onValueChange={(value) => {
                      // Only allow changing if not making payment for a specific liability
                      if (!selectedLiabilityId) {
                        field.onChange(value);
                        handleLiabilityChange(value);
                      }
                    }}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={Boolean(selectedLiabilityId)} // Disable when making payment for a specific liability
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select a liability" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {liabilityEntries.map((liability) => {
                        // Safely convert amount_remaining to a number for display
                        const amountRemaining = typeof liability.amount_remaining === 'string'
                          ? parseFloat(liability.amount_remaining)
                          : typeof liability.amount_remaining === 'number'
                            ? liability.amount_remaining
                            : 0;

                        return (
                          <SelectItem key={liability.id} value={liability.id}>
                            {liability.creditor_name} - ${amountRemaining.toFixed(2)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </MobileOptimizedForm>
    </Form>
  );
}
