"use client";

import { useState } from "react";
import { Account } from "@/types/finance";
import { formatCurrency } from "@/lib/format-currency";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface BudgetIncomeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  amount: number;
  account: Account | null;
  budgetTitle: string;
}

export function BudgetIncomeConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  amount,
  account,
  budgetTitle,
}: BudgetIncomeConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onConfirm();
    } catch (error) {
      console.error("Error in confirmation dialog:", error);
      // The error will be handled by the parent component
    } finally {
      setIsConfirming(false);
    }
  };

  // Check if account has sufficient balance
  const hasSufficientBalance = account &&
    (account.calculatedBalance !== undefined
      ? account.calculatedBalance >= amount
      : (account.balance || 0) >= amount);

  const accountBalance = account
    ? (account.calculatedBalance !== undefined
        ? account.calculatedBalance
        : (account.balance || 0))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Budget Income Creation</DialogTitle>
          <DialogDescription>
            Creating a budget income item will automatically deduct funds from the selected account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Budget</p>
              <p className="text-sm font-semibold">{budgetTitle}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-sm font-semibold">{formatCurrency(amount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Source Account</p>
              <p className="text-sm font-semibold">{account?.name || "Unknown"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Account Balance</p>
              <p className="text-sm font-semibold">{formatCurrency(accountBalance)}</p>
            </div>
          </div>

          {!hasSufficientBalance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Insufficient Balance</AlertTitle>
              <AlertDescription>
                The selected account does not have sufficient balance for this transaction.
                Current balance: {formatCurrency(accountBalance)}, Required: {formatCurrency(amount)}
              </AlertDescription>
            </Alert>
          )}

          {hasSufficientBalance && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>What will happen</AlertTitle>
              <AlertDescription>
                This action will perform the following operations:
              </AlertDescription>
              <div className="col-start-2 w-full mt-2 pr-2">
                <div className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground">
                  <div className="flex items-start">
                    <div className="min-w-[12px] mr-1.5 text-muted-foreground">•</div>
                    <div className="flex-1">A budget income item will be created for {formatCurrency(amount)}</div>
                  </div>
                  <div className="flex items-start">
                    <div className="min-w-[12px] mr-1.5 text-muted-foreground">•</div>
                    <div className="flex-1">An expenditure entry will be created to deduct {formatCurrency(amount)} from {account?.name}</div>
                  </div>
                  <div className="flex items-start">
                    <div className="min-w-[12px] mr-1.5 text-muted-foreground">•</div>
                    <div className="flex-1">The account balance will be updated to reflect this deduction</div>
                  </div>
                </div>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || !hasSufficientBalance}
          >
            {isConfirming ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
