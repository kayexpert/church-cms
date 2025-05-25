"use client";

import React, { useState, useCallback } from "react";
// Router import removed as we're using window.location for navigation
import { EnhancedLiabilityList } from "./enhanced-liability-list";
import { EnhancedLiabilityForm } from "./enhanced-liability-form";
import { LiabilityDetailView } from "./liability-detail-view";
import { LiabilityCategory, LiabilityEntry } from "@/types/finance";
import { toast } from "sonner";
import { LiabilityManagementSkeleton } from "@/components/finance";
import { DeleteConfirmationDialog } from "../common/delete-confirmation-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiabilityMutations } from "@/hooks/use-liability-mutations";
import { supabase } from "@/lib/supabase";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EnhancedLiabilityManagement() {
  return <LiabilityManagementContent />;
}

function LiabilityManagementContent() {
  const queryClient = useQueryClient();

  // State for edit/delete/detail dialogs
  const [currentEntry, setCurrentEntry] = useState<LiabilityEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);

  // Fetch liability categories with React Query
  const { data: liabilityCategories = [], isLoading } = useLiabilityCategories();

  // Get mutations
  const { deleteLiabilityMutation } = useLiabilityMutations();

  // Handle add liability success
  const handleAddLiabilitySuccess = useCallback(() => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });

    toast.success("Liability added successfully");
  }, []);

  // Handle edit button click
  const handleEditClick = useCallback((entry: LiabilityEntry) => {
    setCurrentEntry(entry);
    setShowEditDialog(true);
  }, []);

  // Handle delete button click
  const handleDeleteClick = useCallback((entry: LiabilityEntry) => {
    setCurrentEntry(entry);
    setShowDeleteDialog(true);
  }, []);

  // Handle make payment
  const handleMakePayment = useCallback((entry: LiabilityEntry) => {
    // Show toast before navigation
    console.log(`Redirecting to expenditure form with liability ID: ${entry.id}`);

    // Show a toast message to guide the user
    const amountRemaining = typeof entry.amount_remaining === 'string'
      ? parseFloat(entry.amount_remaining)
      : entry.amount_remaining;

    toast.info("Redirecting to expenditure form to make payment", {
      description: `Making payment for ${entry.creditor_name} - ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
      }).format(amountRemaining).replace('GH₵', '₵')} remaining`,
      duration: 5000
    });

    // Use window.location for a full page navigation to ensure proper rendering
    setTimeout(() => {
      window.location.href = `/finance?tab=expenditure&liability=${entry.id}&t=${Date.now()}`;
    }, 300);
  }, []);

  // Handle edit success
  const handleEditSuccess = useCallback(() => {
    setShowEditDialog(false);
    setCurrentEntry(null);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });

    toast.success("Liability updated successfully");
  }, []);

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!currentEntry) {
      console.log("No current entry to delete");
      return;
    }

    console.log("Deleting liability:", currentEntry);

    try {
      // Pass the entire entry object instead of just the ID
      await deleteLiabilityMutation.mutateAsync(currentEntry);
      console.log("Liability deleted successfully");
      setShowDeleteDialog(false);
      setCurrentEntry(null);

      // Force refresh the list
      queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
      queryClient.refetchQueries({ queryKey: ["liabilityEntries"] });

      // Note: Toast is already shown in deleteFinancialEntry function
    } catch (error) {
      toast.error("Failed to delete liability");
      console.error("Delete error:", error);
    }
  }, [currentEntry, deleteLiabilityMutation, queryClient]);

  // Handle view details
  const handleViewDetails = useCallback((entry: LiabilityEntry) => {
    setCurrentEntry(entry);
    setShowDetailView(true);
  }, []);

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setShowEditDialog(false);
    setShowDeleteDialog(false);
    setShowDetailView(false);
    setCurrentEntry(null);
  }, []);

  // Show skeleton while loading
  if (isLoading) {
    return <LiabilityManagementSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Liability Form */}
        <div className="md:col-span-1">
          <EnhancedLiabilityForm
            liabilityCategories={liabilityCategories}
            onSuccess={handleAddLiabilitySuccess}
          />
        </div>

        {/* Enhanced Liability List */}
        <div className="md:col-span-2">
          <EnhancedLiabilityList
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onMakePayment={handleMakePayment}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      {showEditDialog && currentEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Liability</h2>
              <Button variant="ghost" size="icon" onClick={handleDialogClose}>
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <EnhancedLiabilityForm
              liabilityCategories={liabilityCategories}
              entry={currentEntry}
              isEditing={true}
              isDialog={true}
              onSuccess={handleEditSuccess}
              onCancel={handleDialogClose}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && currentEntry && (
        <DeleteConfirmationDialog
          isOpen={showDeleteDialog}
          title="Delete Liability"
          message={`Are you sure you want to delete this liability of ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "GHS",
          }).format(currentEntry.total_amount).replace('GH₵', '₵')} for ${currentEntry.creditor_name}?`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDialogClose}
          isDeleting={deleteLiabilityMutation.isPending}
        />
      )}

      {/* Detail View Dialog */}
      {showDetailView && currentEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <LiabilityDetailView
              liabilityId={currentEntry.id}
              onBack={handleDialogClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Custom hook for fetching liability categories
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
