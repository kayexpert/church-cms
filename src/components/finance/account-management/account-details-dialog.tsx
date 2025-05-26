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
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";
import { TransactionTable } from "@/components/finance/common/transaction-table";
import { supabase } from "@/lib/supabase";

import { calculateAccountBalance, calculateTransactionSummary, isOpeningBalanceTransaction } from "@/lib/calculate-account-balance";

interface AccountDetailsDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Enhanced account details dialog with real-time updates and direct data fetching
 * This component is designed to show accurate, up-to-date account information
 * by bypassing the React Query cache and fetching data directly from the database.
 */
export function AccountDetailsDialog({ account, open, onOpenChange }: AccountDetailsDialogProps) {
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

      // Get transactions from the account_transactions table (not account_tx_table)
      const { data, error } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", account.id)
        .order("date", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching from account_transactions:", error);
        throw new Error(`Failed to load account transactions: ${error.message}`);
      }

      // Update state with the fetched transactions
      setTransactions(data || []);
      setIsLoadingTransactions(false);

      // Calculate summary from the transactions using our centralized utility
      const summary = calculateTransactionSummary(data || []);
      setSummary(summary);

      // Calculate the correct balance using our centralized utility
      const calculatedBal = calculateAccountBalance(account, data || []);
      setCalculatedBalance(calculatedBal);

    } catch (error) {
      console.error("Error fetching account transactions:", error);
      setTransactionsError(error instanceof Error ? error : new Error("Failed to load account transactions"));
      setIsLoadingTransactions(false);
    }
  }, [open, account.id]);





  // Set up realtime subscriptions for database changes
  useEffect(() => {
    if (!open || !account.id) return;

    console.log("Setting up realtime subscriptions for account", account.id);

    // Set up a subscription to the account_transactions table (not account_tx_table)
    const txSubscription = supabase
      .channel('account-transactions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'account_transactions',
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
        // Also invalidate React Query cache to ensure UI consistency
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
        // Also invalidate React Query cache to ensure UI consistency
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
        // Also invalidate React Query cache to ensure UI consistency
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
        // Also invalidate React Query cache to ensure UI consistency
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      })
      .subscribe();

    // Listen for changes to the account itself
    const accountSubscription = supabase
      .channel('account-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'accounts',
        filter: `id=eq.${account.id}`
      }, (payload) => {
        console.log('Account changed:', payload);
        fetchTransactions();
        // Also invalidate React Query cache to ensure UI consistency
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
      accountSubscription.unsubscribe();
    };
  }, [open, account.id, fetchTransactions, queryClient]);

  // Initial data fetch when dialog opens
  useEffect(() => {
    if (open && account.id) {
      fetchTransactions();
    }
  }, [open, account.id, fetchTransactions]);

  // Function to manually refresh transaction data
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);

    // Fetch fresh data directly
    fetchTransactions()
      .then(() => {
        // Invalidate all relevant queries to ensure UI consistency
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });
        queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
        queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
        queryClient.invalidateQueries({ queryKey: ["account", account.id] });

        // Force refetch of accounts data
        queryClient.refetchQueries({ queryKey: ["accounts"] });

        setIsRefreshing(false);
        toast.success("Account transactions refreshed");
      })
      .catch((error) => {
        console.error("Error refreshing transactions:", error);
        setIsRefreshing(false);
        toast.error("Failed to refresh account transactions");
      });
  }, [fetchTransactions, queryClient, account.id]);

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
                  <CardDescription>Opening Balance + Inflows - Outflows</CardDescription>
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
                  <CardDescription>Used in balance calculation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-yellow-500 font-bold">
                    {formatCurrency(
                      // Find opening balance transaction if it exists
                      transactions?.find(isOpeningBalanceTransaction)?.amount || account.opening_balance || 0
                    )}
                  </div>
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
                        {formatCurrency((summary?.totalInflow || 0) + (summary?.totalTransfersIn || 0))}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {summary?.totalLoanInflow > 0 && (
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
                        {formatCurrency((summary?.totalOutflow || 0) + (summary?.totalTransfersOut || 0))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

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
                  <p className="text-red-800 text-sm font-medium mb-1">
                    Error loading account transactions
                  </p>
                  <p className="text-red-800 text-sm">
                    {transactionsError.message || "An unknown error occurred"}
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
              ) : (
                <div className="w-full">
                  <TransactionTable
                    transactions={Array.isArray(transactions) ? transactions : []}
                    isLoading={isLoadingTransactions}
                    emptyMessage="No transactions found for this account."
                    formatCurrency={formatCurrency}
                    className="w-full"
                  />
                </div>
              )}

              {Array.isArray(transactions) && transactions.length === 0 && !isLoadingTransactions && !transactionsError && (
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
