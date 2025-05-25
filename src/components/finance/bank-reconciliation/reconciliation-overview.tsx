"use client";

import { BankReconciliation, AccountTransaction } from "@/types/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ArrowUpCircle, ArrowDownCircle, AlertTriangle, PlusCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ReconciliationOverviewProps {
  reconciliation: BankReconciliation & {
    onCreateAdjustment?: () => void;
  };
  transactions?: AccountTransaction[];
  summary: {
    totalTransactions: number;
    reconciledTransactions: number;
    totalAmount: number;
    reconciledAmount: number;
    difference: number;
  };
  formatCurrency: (amount: number) => string;
}

export function ReconciliationOverview({
  reconciliation,
  transactions = [],
  summary,
  formatCurrency,
}: ReconciliationOverviewProps) {
  // Ensure bank_balance and book_balance are numbers
  const bankBalance = typeof reconciliation.bank_balance === 'number'
    ? reconciliation.bank_balance
    : parseFloat(reconciliation.bank_balance as any) || 0;

  const bookBalance = typeof reconciliation.book_balance === 'number'
    ? reconciliation.book_balance
    : parseFloat(reconciliation.book_balance as any) || 0;

  // Calculate reconciliation progress percentage
  const progressPercentage = summary.totalTransactions > 0
    ? Math.round((summary.reconciledTransactions / summary.totalTransactions) * 100)
    : 0;

  // Calculate the correct difference between bank balance and book balance
  // Always use the direct difference between bank and book balance
  const correctDifference = bankBalance - bookBalance;

  // Log the calculation for debugging
  console.log('Reconciliation difference calculation:', {
    bankBalance,
    bookBalance,
    correctDifference,
    summaryDifference: summary.difference
  });

  // Determine if reconciliation is balanced (use a small epsilon to account for floating point errors)
  const isBalanced = Math.abs(correctDifference) < 0.01;

  // Use the correct difference (bank - book) for display
  // This ensures we're showing the actual difference between bank and book balances
  const displayDifference = correctDifference;

  // Log the difference values for debugging
  console.log('Reconciliation overview display difference:', {
    summaryDifference: summary?.difference,
    correctDifference,
    displayDifference,
    isBalanced
  });

  // Calculate income and expenditure totals
  const incomeTransactions = transactions.filter(tx =>
    tx.transaction_type === 'income' || tx.transaction_type === 'transfer_in'
  );
  const expenditureTransactions = transactions.filter(tx =>
    tx.transaction_type === 'expenditure' || tx.transaction_type === 'transfer_out'
  );

  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenditure = expenditureTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Calculate reconciled income and expenditure
  const reconciledIncome = incomeTransactions
    .filter(tx => tx.is_reconciled)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const reconciledExpenditure = expenditureTransactions
    .filter(tx => tx.is_reconciled)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="space-y-6">
      {/* Reconciliation Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Overview</CardTitle>
          <CardDescription>
            Current status and progress of account reconciliation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Status and Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Reconciliation Progress</h3>
                <Badge
                  variant={reconciliation.status === 'completed' ? "success" : "outline"}
                  className="flex items-center gap-1"
                >
                  {reconciliation.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      In Progress
                    </>
                  )}
                </Badge>
              </div>

              <Progress value={progressPercentage} className="h-2" />

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{summary.reconciledTransactions} of {summary.totalTransactions} transactions reconciled</span>
                <span>{progressPercentage}%</span>
              </div>
            </div>

            <Separator />

            {/* Balance Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 p-4 border rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                <h3 className="text-lg font-medium text-green-600 dark:text-green-400">Bank Balance</h3>

                {/* Large prominent display of the bank balance */}
                <div className="mt-2 mb-4">
                  {bankBalance !== 0 ? (
                    <h2 className="text-4xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(bankBalance)}
                    </h2>
                  ) : (
                    <h2 className="text-4xl font-bold text-red-500">Not Available</h2>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Balance as per bank statement
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Account: {reconciliation.account?.name || "Unknown"}
                </div>

              </div>
              <div className="space-y-2 p-4 border rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400">Book Balance</h3>

                {/* Large prominent display of the book balance */}
                <div className="mt-2 mb-4">
                  {bookBalance !== 0 ? (
                    <h2 className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(bookBalance)}
                    </h2>
                  ) : (
                    <h2 className="text-4xl font-bold text-red-500">Not Available</h2>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Balance as per accounting records
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  As of: {format(new Date(), "dd-MMM-yy")}
                </div>

              </div>
            </div>

            <Separator />

            {/* Difference */}
            <div className={`p-4 border rounded-lg bg-white dark:bg-slate-800 shadow-sm ${isBalanced ? "border-green-300 dark:border-green-700" : "border-amber-300 dark:border-amber-700"}`}>
              {/* Header with title and adjustment button */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Balance Difference</h3>

                {!isBalanced && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => reconciliation.onCreateAdjustment && reconciliation.onCreateAdjustment()}
                    className="ml-auto"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Adjustment
                  </Button>
                )}
              </div>

              {/* Large prominent display of the difference */}
              <div className="mt-2 mb-4 flex items-center">
                {isBalanced ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
                )}
                <h2 className={`text-4xl font-bold ${isBalanced ? "text-green-500" : "text-amber-500"}`}>
                  {formatCurrency(Math.abs(displayDifference))}
                </h2>
              </div>

              {!isBalanced && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Bank balance is {displayDifference > 0 ? "higher" : "lower"} than book balance
                  </p>
                </div>
              )}

              {isBalanced ? (
                <p className="text-sm text-green-500 mt-2">
                  The bank and book balances match perfectly
                </p>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    There is a difference of {formatCurrency(Math.abs(displayDifference))} that needs to be reconciled
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click the "Create Adjustment" button to balance the difference automatically.
                  </p>
                </div>
              )}

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
          <CardDescription>
            Summary of income and expenditure transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Summary */}
            <div className="p-4 border rounded-lg bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30">
              <div className="flex items-center mb-3">
                <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-green-700 dark:text-green-400">Income Transactions</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Reconciled</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">{formatCurrency(reconciledIncome)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-xl font-semibold">{incomeTransactions.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Reconciled</p>
                  <p className="text-xl font-semibold">
                    {incomeTransactions.filter(tx => tx.is_reconciled).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Expenditure Summary */}
            <div className="p-4 border rounded-lg bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30">
              <div className="flex items-center mb-3">
                <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-red-700 dark:text-red-400">Expenditure Transactions</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Total Expenditure</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(totalExpenditure)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Reconciled</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(reconciledExpenditure)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-xl font-semibold">{expenditureTransactions.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                  <p className="text-sm text-muted-foreground">Reconciled</p>
                  <p className="text-xl font-semibold">
                    {expenditureTransactions.filter(tx => tx.is_reconciled).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
