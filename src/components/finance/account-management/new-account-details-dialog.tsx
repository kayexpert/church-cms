"use client";

import { useState, useEffect, useCallback } from "react";
import { Account, AccountTransaction } from "@/types/finance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";
import { TransactionTable } from "@/components/finance/common/transaction-table";

import { supabase } from "@/lib/supabase";
import { isOpeningBalanceEntry } from "@/lib/identify-special-income-entries";


interface AccountDetailsDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAccountDetailsDialog({ account, open, onOpenChange }: AccountDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for direct data fetching (no React Query caching)
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<Error | null>(null);

  // State for summary calculations
  const [summary, setSummary] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    totalTransfersIn: 0,
    totalTransfersOut: 0,
    totalLoanInflow: 0,
  });

  // State for calculated balance
  const [calculatedBalance, setCalculatedBalance] = useState(0);

  // Function to fetch transactions directly from the database
  const fetchTransactions = useCallback(async () => {
    if (!open || !account.id) return;

    setIsLoadingTransactions(true);
    setTransactionsError(null);

    try {
      console.log(`Directly fetching transactions for account ${account.id}`);

      // First try to get transactions from the account_tx_table
      const { data, error } = await supabase
        .from("account_tx_table")
        .select("*")
        .eq("account_id", account.id)
        .order("date", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching from account_tx_table:", error);
        throw new Error(`Failed to load account transactions: ${error.message}`);
      }

      // Update state with the fetched transactions
      setTransactions(data || []);
      setIsLoadingTransactions(false);

      // Calculate summary from the transactions
      calculateSummary(data || []);

    } catch (error) {
      console.error("Error fetching account transactions:", error);
      setTransactionsError(error instanceof Error ? error : new Error("Failed to load account transactions"));
      setIsLoadingTransactions(false);
    }
  }, [open, account.id]);

  // Function to calculate summary from transactions
  const calculateSummary = useCallback((transactionData: AccountTransaction[]) => {
    const newSummary = transactionData.reduce(
      (acc, transaction) => {
        // Check if this is an income transaction
        if (transaction.transaction_type === "income") {
          // Skip opening balance entries when calculating inflow
          const isOpeningBalance = isOpeningBalanceEntry({
            ...transaction,
            category_id: transaction.category_id || '',
            created_at: transaction.created_at || '',
            updated_at: transaction.updated_at || ''
          });

          if (!isOpeningBalance) {
            // Include regular income entries (not opening balances)
            acc.totalInflow += transaction.amount;

            // If this is a loan income entry, also track it separately
            if (transaction.description?.includes("Loan from")) {
              acc.totalLoanInflow += transaction.amount;
            }
          }
        } else if (transaction.transaction_type === "expenditure") {
          acc.totalOutflow += Math.abs(transaction.amount);
        } else if (transaction.transaction_type === "transfer_in") {
          acc.totalTransfersIn += transaction.amount;
        } else if (transaction.transaction_type === "transfer_out") {
          acc.totalTransfersOut += Math.abs(transaction.amount);
        }
        return acc;
      },
      {
        totalInflow: 0,
        totalOutflow: 0,
        totalTransfersIn: 0,
        totalTransfersOut: 0,
        totalLoanInflow: 0,
      }
    );

    // Update summary state
    setSummary(newSummary);

    // Calculate the correct balance
    const newCalculatedBalance =
      (account.opening_balance || 0) +
      (newSummary.totalInflow || 0) +
      (newSummary.totalTransfersIn || 0) -
      (newSummary.totalOutflow || 0) -
      (newSummary.totalTransfersOut || 0);

    // Update calculated balance state
    setCalculatedBalance(newCalculatedBalance);

  }, [account.opening_balance]);



  // Set up realtime subscriptions for database changes
  useEffect(() => {
    if (!open || !account.id) return;

    console.log("Setting up realtime subscriptions for account", account.id);

    // Set up a subscription to the account_tx_table
    const txSubscription = supabase
      .channel('account-tx-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'account_tx_table',
        filter: `account_id=eq.${account.id}`
      }, (payload) => {
        console.log('Account transaction changed:', payload);
        fetchTransactions();
      })
      .subscribe();

    // Listen for changes to income entries
    const incomeSubscription = supabase
      .channel('income-entries-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'income_entries',
        filter: `account_id=eq.${account.id}`
      }, (payload) => {
        console.log('Income entry changed:', payload);
        fetchTransactions();
      })
      .subscribe();

    // Listen for changes to expenditure entries
    const expenditureSubscription = supabase
      .channel('expenditure-entries-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenditure_entries',
        filter: `account_id=eq.${account.id}`
      }, (payload) => {
        console.log('Expenditure entry changed:', payload);
        fetchTransactions();
      })
      .subscribe();

    // Listen for changes to account transfers
    const transfersSubscription = supabase
      .channel('account-transfers-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'account_transfers',
        filter: `source_account_id=eq.${account.id}`
      }, (payload) => {
        console.log('Account transfer (source) changed:', payload);
        fetchTransactions();
      })
      .subscribe();

    const transfersDestSubscription = supabase
      .channel('account-transfers-dest-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'account_transfers',
        filter: `destination_account_id=eq.${account.id}`
      }, (payload) => {
        console.log('Account transfer (destination) changed:', payload);
        fetchTransactions();
      })
      .subscribe();

    // Clean up subscriptions
    return () => {
      console.log("Cleaning up realtime subscriptions");
      txSubscription.unsubscribe();
      incomeSubscription.unsubscribe();
      expenditureSubscription.unsubscribe();
      transfersSubscription.unsubscribe();
      transfersDestSubscription.unsubscribe();
    };
  }, [open, account.id, fetchTransactions]);

  // Function to manually refresh transaction data
  const handleRefresh = () => {
    toast.info("Refreshing account transactions...");

    // Use the refetch function from the hook
    fetchTransactions()
      .then(() => {
        // Also invalidate account balance query
        queryClient.invalidateQueries({
          queryKey: financeKeys.accounts.balance(account.id)
        });

        toast.success("Account transactions refreshed");
      })
      .catch((error) => {
        console.error("Error refreshing transactions:", error);
        toast.error("Failed to refresh account transactions");
      });
  };

  // Handle dialog open/close
  const handleOpenChange = useCallback((newOpenState: boolean) => {
    if (newOpenState && !open) {
      // Dialog is being opened, refresh data
      fetchTransactions();
    }

    // Call the parent's onOpenChange handler
    onOpenChange(newOpenState);
  }, [open, fetchTransactions, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[1200px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account.name}</DialogTitle>
          <DialogDescription>
            {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
            {account.bank_name && ` - ${account.bank_name}`}
            {account.account_number && ` (${account.account_number})`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Account Overview</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-blue-500 font-bold">
                    {formatCurrency(calculatedBalance)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Opening Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-yellow-500 font-bold">{formatCurrency(account.opening_balance || 0)}</div>
                </CardContent>
              </Card>

              {isLoadingTransactions ? (
                <>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-24" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-24" />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Total Inflows</CardTitle>
                      <CardDescription>Income (excl. opening balance) + Transfers In</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency((summary.totalInflow || 0) + (summary.totalTransfersIn || 0))}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {summary.totalLoanInflow > 0 && (
                          <div>
                            Includes {formatCurrency(summary.totalLoanInflow)} from loans
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Total Outflows</CardTitle>
                      <CardDescription>Expenditure + Transfers Out</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency((summary.totalOutflow || 0) + (summary.totalTransfersOut || 0))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Add a note about the data being real-time */}
            <div className="mt-4 text-sm text-muted-foreground">
              <p>This data is updated in real-time as transactions are made.</p>
            </div>
          </TabsContent>

          {/* Transactions Tab Content */}
          <TabsContent value="transactions">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Transaction History</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {transactionsError ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-red-800 text-sm font-medium mb-1">
                        Error loading account transactions
                      </p>
                      <p className="text-red-800 text-sm">
                        {transactionsError instanceof Error
                          ? transactionsError.message
                          : "An unknown error occurred"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <TransactionTable
                    transactions={transactions}
                    isLoading={isLoadingTransactions}
                    emptyMessage="No transactions found for this account."
                    formatCurrency={formatCurrency}
                    className="w-full"
                  />
                </div>
              )}

              {transactions.length === 0 && !isLoadingTransactions && !transactionsError && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
                  <p className="text-amber-800 text-sm font-medium mb-1">
                    No transactions found for this account
                  </p>
                  <p className="text-amber-800 text-sm">
                    Transactions are automatically synchronized when income or expenditure entries are created.
                    If you're missing transactions, they should appear automatically when new entries are added.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
