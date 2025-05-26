"use client";

import React, { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { EnhancedExpenditureForm } from "./enhanced-expenditure-form";
import { EnhancedExpenditureList } from "./enhanced-expenditure-list";
import { ExpenditureDetailView } from "./expenditure-detail-view";
import { ExpenditureCategory, LiabilityEntry, LiabilityCategory, Account, ExpenditureEntry } from "@/types/finance";
import { toast } from "sonner";
import { ExpenditureManagementSkeleton } from "@/components/finance";
import { DeleteConfirmationDialog } from "../common/delete-confirmation-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useExpenditureMutations } from "@/hooks/use-expenditure-mutations";
import { useExpenditureCategories } from "@/hooks/use-expenditure-management";
import { useAccounts } from "@/hooks/use-accounts";
import { supabase } from "@/lib/supabase";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBudgetExpenditureEntry, getBudgetEntryMessage } from "@/lib/identify-budget-entries";
import { isReconciliationExpenditureEntry, getReconciliationEntryMessage } from "@/lib/identify-reconciliation-entries";

export default function EnhancedExpenditureManagement() {
  return <ExpenditureManagementContent />;
}

function ExpenditureManagementContent() {
  const queryClient = useQueryClient();

  // State for edit/delete/detail dialogs
  const [currentEntry, setCurrentEntry] = useState<ExpenditureEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);

  // Get URL params for potential liability payment
  const searchParams = useSearchParams();
  const selectedLiabilityId = searchParams.get("liability");

  // Fetch required data with React Query
  const { data: expenditureCategories = [], isLoading: isCategoriesLoading } = useExpenditureCategories(true); // true = include system categories for liability payments
  const { data: liabilityCategories = [], isLoading: isLiabilityCategoriesLoading } = useLiabilityCategories();
  const { data: accounts = [], isLoading: isAccountsLoading } = useAccounts({
    refreshInterval: 15000, // Refresh every 15 seconds
    staleTime: 0, // No stale time to ensure fresh data on every render
    enabled: true, // Always enabled
  });
  const { data: liabilityEntries = [], isLoading: isLiabilityEntriesLoading } = useLiabilityEntriesForPayment();

  // Get mutations
  const { deleteExpenditureMutation } = useExpenditureMutations();

  // Check if data is still loading
  const isLoading = isCategoriesLoading || isLiabilityCategoriesLoading || isAccountsLoading || isLiabilityEntriesLoading;

  // Handle add expenditure success
  const handleAddExpenditureSuccess = useCallback(() => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
    queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });

    // Force immediate refetch of accounts to update form dropdowns
    queryClient.refetchQueries({ queryKey: ["accounts"] });

    toast.success("Expenditure added successfully");
  }, []);

  // Handle edit button click
  const handleEditClick = useCallback((entry: ExpenditureEntry) => {
    // Check if this is a budget-related entry
    if (isBudgetExpenditureEntry(entry)) {
      toast.warning(getBudgetEntryMessage());
      return;
    }

    // Check if this is a reconciliation entry
    if (isReconciliationExpenditureEntry(entry)) {
      toast.warning(getReconciliationEntryMessage());
      return;
    }

    setCurrentEntry(entry);
    setShowEditDialog(true);
  }, []);

  // Handle delete button click
  const handleDeleteClick = useCallback((entry: ExpenditureEntry) => {
    // Check if this is a budget-related entry
    if (isBudgetExpenditureEntry(entry)) {
      toast.warning(getBudgetEntryMessage());
      return;
    }

    // Reconciliation entries can be deleted, so we don't check for them here

    setCurrentEntry(entry);
    setShowDeleteDialog(true);
  }, []);

  // Handle view details click
  const handleViewDetails = useCallback((entry: ExpenditureEntry) => {
    setCurrentEntry(entry);
    setShowDetailView(true);
  }, []);

  // Handle edit success
  const handleEditSuccess = useCallback(() => {
    setShowEditDialog(false);
    setCurrentEntry(null);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });

    // Force immediate refetch of accounts to update form dropdowns
    queryClient.refetchQueries({ queryKey: ["accounts"] });

    toast.success("Expenditure updated successfully");
  }, []);

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!currentEntry) {
      return;
    }

    try {
      // Pass the entire entry object instead of just the ID
      await deleteExpenditureMutation.mutateAsync(currentEntry);
      setShowDeleteDialog(false);
      setCurrentEntry(null);

      // Force refresh the list, accounts, and budget-related data
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      queryClient.refetchQueries({ queryKey: ["expenditureEntries"] });
      queryClient.refetchQueries({ queryKey: ["accounts"] });
      queryClient.refetchQueries({ queryKey: ["budgetItems"] });
      queryClient.refetchQueries({ queryKey: ["budgets"] });

      // Note: Toast is already shown in deleteFinancialEntry function
    } catch (error) {
      toast.error("Failed to delete expenditure");
    }
  }, [currentEntry, deleteExpenditureMutation, queryClient]);

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setShowEditDialog(false);
    setShowDeleteDialog(false);
    setShowDetailView(false);
    setCurrentEntry(null);
  }, []);

  // Show skeleton while loading
  if (isLoading) {
    return <ExpenditureManagementSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Expenditure Form */}
        <div className="md:col-span-1">
          <EnhancedExpenditureForm
            expenditureCategories={expenditureCategories}
            liabilityEntries={liabilityEntries}
            liabilityCategories={liabilityCategories}
            accounts={accounts}
            onSuccess={handleAddExpenditureSuccess}
            selectedLiabilityId={selectedLiabilityId}
            showLiabilityPaymentOption={false} // Hide the liability payment checkbox by default
          />
        </div>

        {/* Enhanced Expenditure List */}
        <div className="md:col-span-2">
          <EnhancedExpenditureList
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      {showEditDialog && currentEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Expenditure</h2>
              <Button variant="ghost" size="icon" onClick={handleDialogClose}>
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <EnhancedExpenditureForm
              expenditureCategories={expenditureCategories}
              liabilityEntries={liabilityEntries}
              liabilityCategories={liabilityCategories}
              accounts={accounts}
              entry={currentEntry}
              isEditing={true}
              isDialog={true}
              onSuccess={handleEditSuccess}
              onCancel={handleDialogClose}
              showLiabilityPaymentOption={false} // Hide the liability payment checkbox in edit mode too
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && currentEntry && (
        <DeleteConfirmationDialog
          isOpen={showDeleteDialog}
          title="Delete Expenditure"
          message={`Are you sure you want to delete this expenditure of ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "GHS",
          }).format(currentEntry.amount).replace('GH₵', '₵')} for ${currentEntry.description}?`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDialogClose}
          isDeleting={deleteExpenditureMutation.isPending}
        />
      )}

      {/* Detail View Dialog */}
      {showDetailView && currentEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <ExpenditureDetailView
              expenditureId={currentEntry.id}
              onBack={handleDialogClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Custom hooks for data fetching

function useLiabilityCategories() {
  return useQuery({
    queryKey: ["liabilityCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liability_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as LiabilityCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Using the imported useAccounts hook instead of a local implementation

function useLiabilityEntriesForPayment() {
  return useQuery({
    queryKey: ["liabilityEntriesForPayment"],
    queryFn: async () => {
      try {
        // First, fetch liability entries without join
        const { data: liabilityEntries, error: liabilityError } = await supabase
          .from("liability_entries")
          .select("*")
          .or("status.eq.unpaid,status.eq.partial")
          .order("date", { ascending: false });

        if (liabilityError) {
          throw liabilityError;
        }

        // Then, fetch all liability categories
        const { data: categories } = await supabase
          .from("liability_categories")
          .select("*");

        // Continue without categories rather than failing completely if there's an error

        // Create a map of categories for quick lookup
        const categoryMap = new Map();
        if (categories) {
          categories.forEach(category => {
            categoryMap.set(category.id, category);
          });
        }

        // Format the data and manually add category info
        const formattedData = (liabilityEntries || []).map(entry => {
          // Convert amount fields to numbers if they're stored as strings
          const totalAmount = typeof entry.total_amount === 'string'
            ? parseFloat(entry.total_amount)
            : entry.total_amount;

          const amountPaid = typeof entry.amount_paid === 'string'
            ? parseFloat(entry.amount_paid)
            : entry.amount_paid;

          const amountRemaining = typeof entry.amount_remaining === 'string'
            ? parseFloat(entry.amount_remaining)
            : entry.amount_remaining;

          // Look up the category if available
          const category = categoryMap.get(entry.category_id) || null;

          return {
            ...entry,
            total_amount: totalAmount,
            amount_paid: amountPaid,
            amount_remaining: amountRemaining,
            is_loan: entry.is_loan === 'true' || entry.is_loan === true,
            category: category
          };
        }) as LiabilityEntry[];

        return formattedData;
      } catch (error) {
        // Return empty array to prevent app from crashing
        return [] as LiabilityEntry[];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
