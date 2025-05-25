"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { deleteFinancialEntry } from "@/lib/delete-financial-entry";

interface DeleteEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  entryId: string;
  entryType: string;
  onSuccess: () => void;
}

export function DeleteEntryDialog({
  open,
  onOpenChange,
  tableName,
  entryId,
  entryType,
  onSuccess,
}: DeleteEntryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteFinancialEntry(tableName, entryId);
      if (success) {
        // Invalidate and refetch relevant queries
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });

        // Invalidate specific entity queries based on table name
        if (tableName === "income_entries") {
          queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
        } else if (tableName === "expenditure_entries") {
          queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
        } else if (tableName === "liability_entries") {
          queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
        } else if (tableName === "account_transfers") {
          queryClient.invalidateQueries({ queryKey: ["accountTransfers"] });
        }

        // Always invalidate bank reconciliation queries since the entry might be a reconciliation entry
        queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });
        queryClient.invalidateQueries({ queryKey: ["reconciliationItems"] });

        // Force immediate refetch to update UI
        queryClient.refetchQueries({ queryKey: ["accounts"] });
        queryClient.refetchQueries({ queryKey: ["accountTransactions"] });
        queryClient.refetchQueries({ queryKey: ["bankReconciliations"] });
        queryClient.refetchQueries({ queryKey: ["reconciliationItems"] });

        // Call the success callback
        onSuccess();
        onOpenChange(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this {entryType}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
