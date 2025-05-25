"use client";

import React, { useState, useEffect, Suspense } from "react";
import { IncomeCategory, Account, IncomeEntry } from "@/types/finance";
import { IncomeManagementSkeleton } from "@/components/finance";
import { useIncomeEntries, useIncomeEntryMutations } from "@/hooks/use-income-entries";
import { useIncomeCategories } from "@/hooks/use-income-management";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/format-currency";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormFieldSkeleton } from "@/components/finance/consolidated-skeletons";
import dynamic from "next/dynamic";
import { isOpeningBalanceEntry, isLoanIncomeEntry } from "@/lib/identify-special-income-entries";
import { isBudgetIncomeEntry, getBudgetEntryMessage } from "@/lib/identify-budget-entries";
import { isReconciliationIncomeEntry, getReconciliationEntryMessage } from "@/lib/identify-reconciliation-entries";
import { isAssetDisposalEntry, getAssetDisposalEntryMessage } from "@/lib/identify-asset-disposal-entries";
import { IncomeDetailView } from "./income-detail-view";
import { MemberIdMigrationAlert } from "./member-id-migration-alert";

// Extended IncomeEntry type with joined tables
interface ExtendedIncomeEntry extends IncomeEntry {
  income_categories?: IncomeCategory | null;
}

// Dynamically import heavy components with consistent skeleton fallbacks
const IncomeForm = dynamic(
  () => import("./income-form").then(mod => ({ default: mod.IncomeForm })),
  {
    loading: () => (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FormFieldSkeleton labelWidth="w-32" />
            <FormFieldSkeleton labelWidth="w-24" />
            <div className="grid grid-cols-2 gap-4">
              <FormFieldSkeleton labelWidth="w-20" />
              <FormFieldSkeleton labelWidth="w-36" />
            </div>
            <FormFieldSkeleton labelWidth="w-28" />
            <FormFieldSkeleton labelWidth="w-32" />
            <FormFieldSkeleton labelWidth="w-32" inputHeight="h-24" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
);

const EnhancedIncomeList = dynamic(
  () => import("./enhanced-income-list").then(mod => ({ default: mod.EnhancedIncomeList })),
  {
    loading: () => (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                {/* Table Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 bg-muted/50 p-3">
                  <Skeleton className="h-4 w-24" /> {/* Date */}
                  <Skeleton className="h-4 w-32" /> {/* Category */}
                  <Skeleton className="h-4 w-40" /> {/* Description */}
                  <Skeleton className="h-4 w-24 ml-auto" /> {/* Amount */}
                  <Skeleton className="h-4 w-16 ml-auto" /> {/* Actions */}
                </div>
                {/* Table Rows */}
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <div
                    key={`row-${rowIndex}`}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 p-3 border-b hover:bg-muted/5"
                  >
                    <Skeleton className="h-5 w-24" /> {/* Date */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-2 rounded-full bg-green-500/50" />
                      <Skeleton className="h-5 w-32" /> {/* Category */}
                    </div>
                    <Skeleton className="h-5 w-40" /> {/* Description */}
                    <Skeleton className="h-5 w-24 ml-auto" /> {/* Amount */}
                    <div className="flex gap-2 justify-end">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
);

const DeleteConfirmationDialog = dynamic(
  () => import("../common/delete-confirmation-dialog").then(mod => ({ default: mod.DeleteConfirmationDialog })),
  { ssr: false }
);

export default function IncomeManagement() {
  return <IncomeManagementContent />;
}

function IncomeManagementContent() {
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<ExtendedIncomeEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  // Use React Query to fetch income entries with pagination
  const {
    data: incomeEntriesData,
    isLoading: isLoadingEntries,
    error: entriesError,
    isFetching: isQueryFetching
  } = useIncomeEntries({
    search: searchQuery || undefined,
    page: currentPage,
    pageSize: 10,
    refreshTrigger
  });

  // Ensure we have a valid data structure even if the query fails
  const safeIncomeEntriesData = {
    data: incomeEntriesData?.data || [],
    count: incomeEntriesData?.count || 0
  };

  // Use our custom hooks to fetch income categories and accounts
  const {
    allCategories: incomeCategories,
    isLoading: isLoadingCategories
  } = useIncomeCategories();

  // Use our custom hook to fetch accounts
  const {
    data: accounts,
    isLoading: isLoadingAccounts
  } = useAccounts({
    refreshInterval: 60000 // 1 minute refresh interval
  });

  // Get mutations for income entries
  const { deleteIncomeEntry } = useIncomeEntryMutations();

  // Handle add income success
  const handleAddIncomeSuccess = () => {
    // Trigger a refresh of the income entries
    setRefreshTrigger(prev => prev + 1);

    // Also refresh accounts to update balances in dropdowns
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.refetchQueries({ queryKey: ["accounts"] });
  };

  // Handle edit button click
  const handleEditClick = (entry: ExtendedIncomeEntry) => {
    // Check if this is a special entry that shouldn't be edited directly
    if (isOpeningBalanceEntry(entry)) {
      toast.warning("Opening balance entries can only be modified in Account Settings");
      return;
    }

    if (isLoanIncomeEntry(entry)) {
      toast.warning("Loan entries can only be modified in Liabilities");
      return;
    }

    // Check if this is a budget-related entry
    if (isBudgetIncomeEntry(entry)) {
      toast.warning(getBudgetEntryMessage());
      return;
    }

    // Check if this is a reconciliation entry
    if (isReconciliationIncomeEntry(entry)) {
      toast.warning(getReconciliationEntryMessage());
      return;
    }

    // Check if this is an asset disposal entry
    if (isAssetDisposalEntry(entry)) {
      toast.warning(getAssetDisposalEntryMessage());
      return;
    }

    setCurrentEntry(entry);
    setShowEditDialog(true);
  };

  // Handle view details
  const handleViewDetails = (entry: ExtendedIncomeEntry) => {
    setCurrentEntry(entry);
    setShowDetailView(true);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    // Trigger a refresh of the income entries
    setRefreshTrigger(prev => prev + 1);

    // Also refresh accounts to update balances in dropdowns
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.refetchQueries({ queryKey: ["accounts"] });

    setShowEditDialog(false);
    setCurrentEntry(null);
  };

  // Handle delete button click
  const handleDeleteClick = (entry: ExtendedIncomeEntry) => {
    // Check if this is a special entry that shouldn't be deleted directly
    if (isOpeningBalanceEntry(entry)) {
      toast.warning("Opening balance entries can only be modified in Account Settings");
      return;
    }

    if (isLoanIncomeEntry(entry)) {
      toast.warning("Loan entries can only be modified in Liabilities");
      return;
    }

    // Check if this is a budget-related entry
    if (isBudgetIncomeEntry(entry)) {
      toast.warning(getBudgetEntryMessage());
      return;
    }

    // Check if this is an asset disposal entry (but not a reconciliation entry)
    if (isAssetDisposalEntry(entry) && !isReconciliationIncomeEntry(entry)) {
      toast.warning(getAssetDisposalEntryMessage());
      return;
    }

    // Reconciliation entries can be deleted, so we don't check for them here

    setCurrentEntry(entry);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!currentEntry) {
      console.log("No current entry to delete");
      return;
    }

    console.log("Deleting income entry:", currentEntry);

    try {
      // Pass the ID to the mutation
      await deleteIncomeEntry.mutateAsync(currentEntry.id);
      console.log("Income entry deleted successfully");
      setShowDeleteDialog(false);
      setCurrentEntry(null);

      // Refresh the list after deletion
      setRefreshTrigger(prev => prev + 1);

      // Also invalidate liability queries since we might have deleted a loan
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });

      // Also invalidate budget-related queries
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      queryClient.refetchQueries({ queryKey: ["liabilityEntries"] });
      queryClient.refetchQueries({ queryKey: ["accounts"] });
      queryClient.refetchQueries({ queryKey: ["budgetItems"] });
      queryClient.refetchQueries({ queryKey: ["budgets"] });

      // Note: Toast is already shown in deleteFinancialEntry function
    } catch (error) {
      toast.error("Failed to delete income entry");
      console.error("Error deleting income entry:", error);
    }
  };

  // Update isFetching state when isQueryFetching changes
  useEffect(() => {
    setIsFetching(isQueryFetching);
  }, [isQueryFetching]);

  // Handle manual refresh
  const handleRefresh = () => {
    setIsFetching(true);
    queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
    queryClient.refetchQueries({ queryKey: ["incomeEntries"] })
      .then(() => {
        setIsFetching(false);
      })
      .catch(() => {
        setIsFetching(false);
      });
  };

  // Check if any data is loading
  const isLoading = isLoadingEntries || isLoadingCategories || isLoadingAccounts;

  // Show skeleton while initial data is loading
  if (isLoading && (!incomeEntriesData || !incomeCategories || !accounts)) {
    return <IncomeManagementSkeleton />;
  }

  // Show error message if there's an error
  if (entriesError) {
    console.error('Income entries error details:', entriesError);

    // Check if it's a connection error
    const isConnectionError = entriesError instanceof Error &&
      (entriesError.message.includes('connection') ||
       entriesError.message.includes('network') ||
       entriesError.message.includes('authenticate') ||
       entriesError.message.includes('configuration'));

    // Check if it's a table error
    const isTableError = entriesError instanceof Error &&
      entriesError.message.includes('table');

    return (
      <div className="p-8 text-center border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
          {isConnectionError ? 'Database Connection Error' :
           isTableError ? 'Database Table Error' :
           'Error Loading Income Entries'}
        </h3>

        <p className="text-red-600 dark:text-red-400 mt-2">
          {entriesError instanceof Error
            ? entriesError.message
            : 'An unexpected error occurred. Please try again later.'}
        </p>

        {isConnectionError && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400 max-w-md mx-auto">
            <p>Please check your Supabase configuration:</p>
            <ul className="list-disc text-left pl-8 mt-2">
              <li>Verify that your Supabase URL and API key are correct</li>
              <li>Check that your Supabase project is running</li>
              <li>Ensure you have an active internet connection</li>
            </ul>
          </div>
        )}

        {isTableError && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400 max-w-md mx-auto">
            <p>The required database tables may not exist:</p>
            <ul className="list-disc text-left pl-8 mt-2">
              <li>Run the database setup script to create missing tables</li>
              <li>Check the database permissions in your Supabase project</li>
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md dark:bg-red-800 dark:hover:bg-red-700 dark:text-red-100"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Migration Alert */}
      <MemberIdMigrationAlert />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Income Form */}
        <div className="md:col-span-1">
          <Suspense fallback={
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <FormFieldSkeleton labelWidth="w-32" />
                  <FormFieldSkeleton labelWidth="w-24" />
                  <div className="grid grid-cols-2 gap-4">
                    <FormFieldSkeleton labelWidth="w-20" />
                    <FormFieldSkeleton labelWidth="w-36" />
                  </div>
                  <FormFieldSkeleton labelWidth="w-28" />
                  <FormFieldSkeleton labelWidth="w-32" />
                  <FormFieldSkeleton labelWidth="w-32" inputHeight="h-24" />
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          }>
            <IncomeForm
              incomeCategories={incomeCategories || []}
              accounts={accounts || []}
              onSuccess={handleAddIncomeSuccess}
            />
          </Suspense>
        </div>

        {/* Income Entries List - Using Enhanced List for better performance */}
        <div className="md:col-span-2">
          <Suspense fallback={
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64 mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-64" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="max-h-[600px] overflow-y-auto">
                      {/* Table Header */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 bg-muted/50 p-3">
                        <Skeleton className="h-4 w-24" /> {/* Date */}
                        <Skeleton className="h-4 w-32" /> {/* Category */}
                        <Skeleton className="h-4 w-40" /> {/* Description */}
                        <Skeleton className="h-4 w-24 ml-auto" /> {/* Amount */}
                        <Skeleton className="h-4 w-16 ml-auto" /> {/* Actions */}
                      </div>
                      {/* Table Rows */}
                      {Array.from({ length: 6 }).map((_, rowIndex) => (
                        <div
                          key={`row-${rowIndex}`}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 p-3 border-b hover:bg-muted/5"
                        >
                          <Skeleton className="h-5 w-24" /> {/* Date */}
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-2 w-2 rounded-full bg-green-500/50" />
                            <Skeleton className="h-5 w-32" /> {/* Category */}
                          </div>
                          <Skeleton className="h-5 w-40" /> {/* Description */}
                          <Skeleton className="h-5 w-24 ml-auto" /> {/* Amount */}
                          <div className="flex gap-2 justify-end">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          }>
            <EnhancedIncomeList
              incomeEntries={safeIncomeEntriesData.data}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onViewDetails={handleViewDetails}
              onRefresh={handleRefresh}
              isFetching={isFetching}
            />
          </Suspense>
        </div>
      </div>

      {/* Edit Dialog */}
      {showEditDialog && currentEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Edit Income Entry</h2>
            <Suspense fallback={
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="space-y-4">
                  <FormFieldSkeleton labelWidth="w-32" />
                  <FormFieldSkeleton labelWidth="w-24" />
                  <div className="grid grid-cols-2 gap-4">
                    <FormFieldSkeleton labelWidth="w-20" />
                    <FormFieldSkeleton labelWidth="w-36" />
                  </div>
                  <FormFieldSkeleton labelWidth="w-28" />
                  <FormFieldSkeleton labelWidth="w-32" />
                  <FormFieldSkeleton labelWidth="w-32" inputHeight="h-24" />
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              </div>
            }>
              <IncomeForm
                incomeCategories={incomeCategories || []}
                accounts={accounts || []}
                entry={currentEntry}
                isEditing={true}
                onSuccess={handleEditSuccess}
                onCancel={() => {
                  setShowEditDialog(false);
                  setCurrentEntry(null);
                }}
                isDialog={true}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && currentEntry && (
        <DeleteConfirmationDialog
          isOpen={showDeleteDialog}
          title="Delete Income Entry"
          message={`Are you sure you want to delete this income entry of ${formatCurrency(currentEntry.amount)} for ${currentEntry.description || "this entry"}?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isDeleting={deleteIncomeEntry.isPending}
        />
      )}

      {/* Detail View Dialog */}
      {showDetailView && currentEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <IncomeDetailView
              incomeId={currentEntry.id}
              onBack={() => {
                setShowDetailView(false);
                setCurrentEntry(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
