"use client";

import { useState, useRef } from "react";
import { Account } from "@/types/finance";
import { useAccountsManagement } from "@/hooks/use-accounts-management";
import { AccountForm, AccountFormValues, AccountFormRef } from "./account-form";
import { AccountsTable } from "./accounts-table";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format-currency";
import { AlertTriangle } from "lucide-react";
import { AccountDetailsDialog } from "@/components/finance/account-management/account-details-dialog";

export function AccountsSettings() {
  // State for dialogs
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [accountToView, setAccountToView] = useState<Account | null>(null);
  const [deleteWithTransactions, setDeleteWithTransactions] = useState(true);

  // Reference to the account form for resetting
  const accountFormRef = useRef<AccountFormRef>(null);

  // Use the accounts management hook
  const {
    accounts,
    isLoadingAccounts,
    refetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccountsManagement();

  // Handle account creation
  const handleCreateAccount = (values: AccountFormValues) => {
    createAccount.mutate(values, {
      onSuccess: () => {
        // Explicitly refetch accounts to update the table immediately
        refetchAccounts();

        // Reset the form to its default values
        if (accountFormRef.current) {
          accountFormRef.current.reset();
        }
      },
      onError: (error) => {
        // Error is already handled by the mutation's onError callback
        // which shows a toast notification
        console.error("Account creation error:", error);
        // We don't need to do anything else here as the error will be shown in the toast
      }
    });
  };

  // Handle account update
  const handleUpdateAccount = (values: AccountFormValues) => {
    if (!accountToEdit) return;

    updateAccount.mutate(
      {
        id: accountToEdit.id,
        ...values,
        currentBalance: accountToEdit.calculatedBalance !== undefined
          ? accountToEdit.calculatedBalance
          : (accountToEdit.balance || 0),
        currentOpeningBalance: accountToEdit.opening_balance || 0,
      },
      {
        onSuccess: () => {
          setShowEditDialog(false);
          setAccountToEdit(null);
          // Explicitly refetch accounts to update the table immediately
          refetchAccounts();
        },
      }
    );
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    if (!accountToDelete) return;

    deleteAccount.mutate(
      {
        accountId: accountToDelete.id,
        deleteTransactions: deleteWithTransactions,
      },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setAccountToDelete(null);
          setDeleteWithTransactions(true); // Reset to default true
          // Explicitly refetch accounts to update the table immediately
          refetchAccounts();
        },
      }
    );
  };

  // Handle opening the edit dialog
  const handleEditClick = (account: Account) => {
    setAccountToEdit(account);
    setShowEditDialog(true);
  };

  // Handle opening the delete dialog
  const handleDeleteClick = (account: Account) => {
    setAccountToDelete(account);
    setShowDeleteDialog(true);
  };

  // Handle opening the details dialog
  const handleViewClick = (account: Account) => {
    setAccountToView(account);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-8">
      {/* Add New Account Form */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Add New Account</h3>
                 <AccountForm
              ref={accountFormRef}
              onSubmit={handleCreateAccount}
              isSubmitting={createAccount.isPending}
              mode="create"
            />
      </div>

      {/* Accounts Table */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Accounts</h3>
        {isLoadingAccounts ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <AccountsTable
            accounts={accounts}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onView={handleViewClick}
          />
        )}
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the account details and settings
            </DialogDescription>
          </DialogHeader>
          {accountToEdit && (
            <AccountForm
              account={accountToEdit}
              onSubmit={handleUpdateAccount}
              isSubmitting={updateAccount.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-destructive/10 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete the account{" "}
              <strong>{accountToDelete?.name}</strong>?
            </AlertDialogDescription>

            {accountToDelete && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    Current balance: {formatCurrency(
                      accountToDelete.calculatedBalance !== undefined
                        ? accountToDelete.calculatedBalance
                        : accountToDelete.balance || 0
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="delete-transactions"
                    checked={deleteWithTransactions}
                    onCheckedChange={setDeleteWithTransactions}
                  />
                  <label htmlFor="delete-transactions" className="text-sm cursor-pointer">
                    Also delete all associated transactions (income, expenditure, transfers)
                  </label>
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t pt-4 mt-4">
            <AlertDialogCancel disabled={deleteAccount.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteAccount.isPending}
              className="gap-2"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Details Dialog */}
      {accountToView && (
        <AccountDetailsDialog
          account={accountToView}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}
    </div>
  );
}
