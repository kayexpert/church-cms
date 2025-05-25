"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { financeKeys } from "@/lib/query-keys";
import { BankReconciliation, AccountTransaction } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReconciliationOverview } from "./reconciliation-overview";
import { EnhancedReconciliationTransactions } from "./enhanced-reconciliation-transactions";
import { ReconciliationAdjustmentDialog } from "./reconciliation-adjustment-dialog";
import { useReconciliationTransactions, useReconciliationSummary } from "@/hooks/use-reconciliation";

interface EnhancedReconciliationDetailViewProps {
  reconciliation: BankReconciliation;
  onBack: () => void;
  onRefresh: () => void;
}

export function EnhancedReconciliationDetailView({
  reconciliation: initialReconciliation,
  onBack,
  onRefresh
}: EnhancedReconciliationDetailViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Track the latest reconciliation data
  const [reconciliation, setReconciliation] = useState<BankReconciliation>(initialReconciliation);

  // Function to fetch the latest reconciliation data
  const fetchLatestReconciliationData = useCallback(async () => {
    try {
      console.log("Fetching latest reconciliation data for ID:", initialReconciliation.id);

      // First, get the basic reconciliation data
      const { data, error } = await supabase
        .from("bank_reconciliations")
        .select("*")
        .eq("id", initialReconciliation.id)
        .single();

      if (error) {
        console.error("Error fetching latest reconciliation data:", error);
        return null;
      }

      if (data) {
        // Now get the account data separately
        const { data: accountData, error: accountError } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", data.account_id)
          .single();

        if (accountError) {
          console.error("Error fetching account data:", accountError);
        } else if (accountData) {
          // Combine the data
          const combinedData = {
            ...data,
            account: accountData
          };

          console.log("Fetched latest reconciliation data:", combinedData);
          setReconciliation(combinedData);
          return combinedData;
        } else {
          // Just use the reconciliation data without account details
          console.log("Fetched latest reconciliation data (without account details):", data);
          setReconciliation({
            ...data,
            account: { name: "Unknown Account" }
          });
          return data;
        }
      }
    } catch (error) {
      console.error("Exception fetching latest reconciliation data:", error);
    }
    return null;
  }, [initialReconciliation.id]);

  // Update local state when initialReconciliation changes
  useEffect(() => {
    setReconciliation(initialReconciliation);
  }, [initialReconciliation]);

  // Fetch transactions for the reconciliation
  const {
    data: transactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions
  } = useReconciliationTransactions(
    reconciliation.account_id,
    reconciliation.start_date,
    reconciliation.end_date,
    reconciliation.id
  );

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      console.log("Manually refreshing reconciliation data");

      // Recalculate the account balance but preserve the book balance if it has manual adjustments
      try {
        // First, check if there are any reconciliation adjustments
        // We'll use the payment_method field to identify reconciliation adjustments
        // and also check the description for [RECONCILIATION] prefix as a backup
        const { data: adjustments, error: adjustmentsError } = await supabase
          .from("income_entries")
          .select("id")
          .eq("account_id", reconciliation.account_id)
          .or(`payment_method.eq.reconciliation,description.ilike.[RECONCILIATION]%`)
          .limit(1);

        const { data: expAdjustments, error: expAdjustmentsError } = await supabase
          .from("expenditure_entries")
          .select("id")
          .eq("account_id", reconciliation.account_id)
          .or(`payment_method.eq.reconciliation,description.ilike.[RECONCILIATION]%`)
          .limit(1);

        const hasAdjustments =
          (adjustments && adjustments.length > 0) ||
          (expAdjustments && expAdjustments.length > 0);

        console.log(`Checking for reconciliation adjustments: ${hasAdjustments ? "Found" : "None found"}`);

        // Get all transactions for this account
        const { data: transactions, error: txError } = await supabase
          .from("account_tx_table")
          .select("amount")
          .eq("account_id", reconciliation.account_id);

        if (txError) {
          console.error(`Error fetching transactions for account ${reconciliation.account_id}:`, txError);
        } else {
          // Calculate the new balance
          let newBalance = 0;

          if (transactions && transactions.length > 0) {
            newBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
          }

          // Get the opening balance
          const { data: accountData, error: accountError } = await supabase
            .from("accounts")
            .select("opening_balance")
            .eq("id", reconciliation.account_id)
            .single();

          if (accountError) {
            console.error(`Error fetching opening balance for account ${reconciliation.account_id}:`, accountError);
          } else if (accountData && accountData.opening_balance) {
            newBalance += accountData.opening_balance;
          }

          // Update the account balance
          const { error: updateError } = await supabase
            .from("accounts")
            .update({
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq("id", reconciliation.account_id);

          if (updateError) {
            console.error(`Error updating balance for account ${reconciliation.account_id}:`, updateError);
          } else {
            console.log(`Account ${reconciliation.account_id} balance manually recalculated to: ${newBalance}`);

            // We'll rely solely on checking for reconciliation adjustments in the income and expenditure tables
            // since the has_manual_adjustments column might not exist in the schema
            const hasManualAdjustments = hasAdjustments;

            // Only update the book_balance if there are no manual adjustments
            if (!hasManualAdjustments) {
              console.log("No manual adjustments found, updating book balance to match account balance");
              const { error: reconcUpdateError } = await supabase
                .from("bank_reconciliations")
                .update({
                  book_balance: newBalance,
                  updated_at: new Date().toISOString()
                })
                .eq("id", reconciliation.id);

              if (reconcUpdateError) {
                console.error(`Error updating book_balance for reconciliation ${reconciliation.id}:`, reconcUpdateError);
              } else {
                console.log(`Reconciliation ${reconciliation.id} book_balance updated to: ${newBalance}`);
              }
            } else {
              console.log("Manual adjustments found, preserving current book balance:", reconciliation.book_balance);

              // Log the difference between account balance and book balance
              const difference = newBalance - reconciliation.book_balance;
              console.log(`Difference between account balance (${newBalance}) and book balance (${reconciliation.book_balance}): ${difference}`);
            }
          }
        }
      } catch (error) {
        console.error("Error manually recalculating account balance:", error);
      }

      // Invalidate all reconciliation queries
      queryClient.invalidateQueries({
        queryKey: financeKeys.reconciliation.all,
        refetchType: 'all'
      });

      // Invalidate specific reconciliation transactions query
      queryClient.invalidateQueries({
        queryKey: financeKeys.reconciliation.transactions(
          reconciliation.account_id,
          reconciliation.start_date,
          reconciliation.end_date,
          reconciliation.id
        ),
        refetchType: 'all'
      });

      // Invalidate account queries to refresh book balance
      queryClient.invalidateQueries({
        queryKey: financeKeys.accounts.all,
        refetchType: 'all'
      });

      // Specifically invalidate the account details query
      queryClient.invalidateQueries({
        queryKey: financeKeys.accounts.detail(reconciliation.account_id),
        refetchType: 'all'
      });

      // Refetch the reconciliation detail to get updated book balance
      queryClient.invalidateQueries({
        queryKey: financeKeys.reconciliation.detail(reconciliation.id),
        refetchType: 'all'
      });

      // Fetch the latest reconciliation data directly
      try {
        console.log("Fetching latest reconciliation data during refresh");
        const latestData = await fetchLatestReconciliationData();
        console.log("Latest data fetched:", latestData ? "Success" : "No data returned");
      } catch (fetchError) {
        console.error("Error fetching latest reconciliation data during refresh:", fetchError);
      }

      // Refetch transactions
      await refetchTransactions();

      // Call parent's refresh function
      onRefresh();

      toast.success("Reconciliation data refreshed");
    } catch (error) {
      console.error("Error refreshing reconciliation data:", error);
      toast.error("Failed to refresh reconciliation data");
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, reconciliation, refetchTransactions, onRefresh, fetchLatestReconciliationData]);

  // Calculate reconciliation summary
  const summary = useReconciliationSummary(transactions, reconciliation.bank_balance);

  // Format currency with useMemo
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    });

    return (amount: number) => {
      return formatter.format(amount).replace('GH₵', '₵'); // Replace the default "GH₵" with just "₵"
    };
  }, []);

  // Format date with useMemo
  const formatDateDisplay = useMemo(() => {
    return (dateString: string) => {
      try {
        // Parse the date string directly without timezone adjustments
        // This ensures the exact date is displayed as stored in the database
        const [year, month, day] = dateString.split('-').map(Number);

        // Create a date object with the local timezone
        const date = new Date(year, month - 1, day);

        // Format the date using our standard format (dd-MMM-yy)
        return format(date, "dd-MMM-yy");
      } catch (error) {
        console.error("Error formatting date:", error, dateString);
        return dateString; // Return the original string if parsing fails
      }
    };
  }, []);

  // Handle complete reconciliation
  const handleCompleteReconciliation = async () => {
    setIsCompleting(true);

    try {
      // Update only the status field to 'completed'
      const response = await supabase
        .from("bank_reconciliations")
        .update({
          status: 'completed', // Changed from 'done' to 'completed' to match UI expectations
          updated_at: new Date().toISOString(),
        })
        .eq("id", reconciliation.id);

      if (response.error) {
        console.error("Error completing reconciliation:",
          response.error.message || "Unknown error");
        toast.error("Failed to mark reconciliation as complete. Please try again.");
      } else {
        toast.success("Reconciliation marked as complete");
        setShowCompleteDialog(false);

        // Force immediate refresh to update UI
        queryClient.invalidateQueries({
          queryKey: financeKeys.reconciliation.detail(reconciliation.id),
          refetchType: 'all',
        });

        // Also invalidate the list to update status in the list view
        queryClient.invalidateQueries({
          queryKey: financeKeys.reconciliation.all,
          refetchType: 'all',
        });

        // Call parent's refresh function
        onRefresh();
      }
    } catch (err) {
      console.error("Exception in complete reconciliation operation:", err);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Calculate traditional summary for backward compatibility using useMemo
  const { traditionalSummary, difference, adjustedBookBalance, finalDifference } = useMemo(() => {
    const traditionalSummary = {
      totalIncome: transactions
        .filter(tx => tx.transaction_type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0),
      totalExpenditure: transactions
        .filter(tx => tx.transaction_type === 'expenditure')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      clearedIncome: transactions
        .filter(tx => tx.transaction_type === 'income' && tx.is_reconciled)
        .reduce((sum, tx) => sum + tx.amount, 0),
      clearedExpenditure: transactions
        .filter(tx => tx.transaction_type === 'expenditure' && tx.is_reconciled)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      unclearedIncome: transactions
        .filter(tx => tx.transaction_type === 'income' && !tx.is_reconciled)
        .reduce((sum, tx) => sum + tx.amount, 0),
      unclearedExpenditure: transactions
        .filter(tx => tx.transaction_type === 'expenditure' && !tx.is_reconciled)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    };

    // Calculate difference
    const difference = reconciliation.bank_balance - reconciliation.book_balance;
    const adjustedBookBalance = reconciliation.book_balance +
      traditionalSummary.unclearedIncome - traditionalSummary.unclearedExpenditure;
    const finalDifference = reconciliation.bank_balance - adjustedBookBalance;

    return { traditionalSummary, difference, adjustedBookBalance, finalDifference };
  }, [transactions, reconciliation.bank_balance, reconciliation.book_balance]);

  return (
    <>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {reconciliation.account?.name || "Account"} Reconciliation
            </h2>
            <p className="text-muted-foreground">
              {formatDateDisplay(reconciliation.start_date)} - {formatDateDisplay(reconciliation.end_date)}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingTransactions}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>

            {/* Only show the adjustment button if there's a difference and not completed */}
            {reconciliation.status !== 'completed' && reconciliation.bank_balance !== reconciliation.book_balance && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdjustmentDialog(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Create Adjustment
              </Button>
            )}

            {reconciliation.status === 'completed' ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Reconciled
              </Badge>
            ) : (
              <Button onClick={() => setShowCompleteDialog(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Reconciled
              </Button>
            )}
          </div>
        </div>

        {/* Reconciliation Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <ReconciliationOverview
              reconciliation={{
                ...reconciliation,
                onCreateAdjustment: () => setShowAdjustmentDialog(true)
              }}
              transactions={transactions}
              summary={summary}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {transactionsError ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <XCircle className="h-10 w-10 text-destructive mb-4" />
                    <h3 className="text-lg font-medium">Error Loading Transactions</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-4">
                      {transactionsError instanceof Error
                        ? transactionsError.message
                        : "Failed to load transactions. Please try refreshing."}
                    </p>
                    <Button onClick={handleRefresh} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EnhancedReconciliationTransactions
                reconciliation={reconciliation}
                transactions={transactions}
                isLoading={isLoadingTransactions || isRefreshing}
                onTransactionsChange={refetchTransactions}
                formatCurrency={formatCurrency}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Complete Reconciliation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Mark Reconciliation as Complete</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this reconciliation as complete? This will update the status to "Reconciled".
            </DialogDescription>
            {reconciliation.bank_balance !== reconciliation.book_balance && (
              <div className="mt-2 text-destructive">
                Warning: There is still a difference of {formatCurrency(Math.abs(reconciliation.bank_balance - reconciliation.book_balance))} between the bank balance and book balance.
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteReconciliation} disabled={isCompleting}>
              {isCompleting ? "Processing..." : "Mark as Reconciled"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Adjustment Dialog */}
      <ReconciliationAdjustmentDialog
        open={showAdjustmentDialog}
        onOpenChange={setShowAdjustmentDialog}
        accountId={reconciliation.account_id}
        reconciliationId={reconciliation.id}
        difference={reconciliation.bank_balance - reconciliation.book_balance}
        onSuccess={handleRefresh}
        fetchLatestReconciliation={fetchLatestReconciliationData}
      />
    </>
  );
}
