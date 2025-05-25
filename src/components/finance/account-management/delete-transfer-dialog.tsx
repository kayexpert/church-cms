"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { formatCurrency } from "@/lib/format-currency";
import { useDeleteAccountTransferMutation } from "@/hooks/use-account-transfers";

interface DeleteTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: any; // The transfer to delete
  onSuccess?: () => void;
}

export function DeleteTransferDialog({
  open,
  onOpenChange,
  transfer,
  onSuccess,
}: DeleteTransferDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Use our custom mutation hook
  const deleteTransferMutation = useDeleteAccountTransferMutation();

  // Handle delete confirmation
  const handleDelete = () => {
    if (!transfer?.id) return;
    
    setIsDeleting(true);
    deleteTransferMutation.mutate(transfer.id, {
      onSuccess: () => {
        setIsDeleting(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      },
      onError: () => {
        setIsDeleting(false);
      }
    });
  };

  if (!transfer) return null;

  // Format the transfer date
  const formattedDate = transfer.date 
    ? format(new Date(transfer.date), "PPP") 
    : "Unknown date";

  // Get source and destination account names
  const sourceAccountName = transfer.source_account?.name || "Unknown Account";
  const destinationAccountName = transfer.destination_account?.name || "Unknown Account";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Transfer
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this transfer? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Date:</div>
              <div className="text-sm font-medium">{formattedDate}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">From:</div>
              <div className="text-sm font-medium">{sourceAccountName}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">To:</div>
              <div className="text-sm font-medium">{destinationAccountName}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Amount:</div>
              <div className="text-sm font-medium">{formatCurrency(transfer.amount)}</div>
            </div>
            {transfer.description && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Description:</div>
                <div className="text-sm font-medium">{transfer.description}</div>
              </div>
            )}
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Transfer"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
