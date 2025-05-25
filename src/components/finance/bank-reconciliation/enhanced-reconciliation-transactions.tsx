"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Plus, CheckCircle2, XCircle, ArrowUpDown, Filter, FileX, RefreshCw } from "lucide-react";
import { AccountTransaction, BankReconciliation } from "@/types/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDatabaseDate } from "@/lib/date-utils";
import { useUpdateReconciliationStatus, useBatchUpdateReconciliationStatus } from "@/hooks/use-reconciliation";
import { useQueryClient } from "@tanstack/react-query";
import { financeKeys } from "@/lib/query-keys";
import { toast } from "sonner";

interface EnhancedReconciliationTransactionsProps {
  reconciliation: BankReconciliation;
  transactions: AccountTransaction[];
  isLoading: boolean;
  onTransactionsChange: () => void;
  formatCurrency: (amount: number) => string;
}

// Memoized transaction type badge component
const TransactionTypeBadge = memo(({ type }: { type: string }) => {
  switch (type) {
    case "income":
      return <Badge variant="success">Income</Badge>;
    case "expenditure":
      return <Badge variant="destructive">Expenditure</Badge>;
    case "transfer_in":
      return <Badge variant="outline" className="border-blue-500 text-blue-500">Transfer In</Badge>;
    case "transfer_out":
      return <Badge variant="outline" className="border-orange-500 text-orange-500">Transfer Out</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
});

// Main component
export function EnhancedReconciliationTransactions({
  reconciliation,
  transactions,
  isLoading,
  onTransactionsChange,
  formatCurrency,
}: EnhancedReconciliationTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [reconciliationStatusFilter, setReconciliationStatusFilter] = useState<"all" | "reconciled" | "unreconciled">("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"all" | "income" | "expenditure" | "transfer_in" | "transfer_out">("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Get the query client for cache updates
  const queryClient = useQueryClient();

  // Mutations for updating reconciliation status
  const updateReconciliationStatus = useUpdateReconciliationStatus();
  const batchUpdateReconciliationStatus = useBatchUpdateReconciliationStatus();

  // Reset selected transactions when transactions change
  useEffect(() => {
    setSelectedTransactions([]);
  }, [transactions]);

  // Handle sort with useCallback to prevent unnecessary re-renders
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prevDirection => prevDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  // Memoized filtered and sorted transactions
  const filteredAndSortedTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        // Filter by reconciliation status
        if (reconciliationStatusFilter === "reconciled" && !transaction.is_reconciled) return false;
        if (reconciliationStatusFilter === "unreconciled" && transaction.is_reconciled) return false;

        // Filter by transaction type
        if (transactionTypeFilter !== "all" && transaction.transaction_type !== transactionTypeFilter) return false;

        // Filter by search query
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          transaction.description?.toLowerCase().includes(query) ||
          transaction.transaction_type.toLowerCase().includes(query) ||
          transaction.amount.toString().includes(query) ||
          formatDatabaseDate(transaction.date).toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortColumn === "date") {
          return sortDirection === "asc"
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortColumn === "amount") {
          return sortDirection === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        } else if (sortColumn === "type") {
          return sortDirection === "asc"
            ? a.transaction_type.localeCompare(b.transaction_type)
            : b.transaction_type.localeCompare(a.transaction_type);
        }
        return 0;
      });
  }, [transactions, reconciliationStatusFilter, transactionTypeFilter, searchQuery, sortColumn, sortDirection]);

  // Handle checkbox change for a single transaction with useCallback
  const handleCheckboxChange = useCallback(async (transactionId: string, isChecked: boolean) => {
    try {
      // Find the transaction to update
      const transactionToUpdate = transactions.find(tx => tx.id === transactionId);
      if (!transactionToUpdate) {
        toast.error("Transaction not found. Please refresh and try again.");
        return;
      }

      // Optimistically update the UI immediately
      const updatedTransactions = transactions.map(tx => {
        if (tx.id === transactionId) {
          return {
            ...tx,
            is_reconciled: isChecked,
            reconciliation_id: isChecked ? reconciliation.id : null
          };
        }
        return tx;
      });

      // Update the transactions in the queryClient cache
      queryClient.setQueryData(
        financeKeys.reconciliation.transactions(
          reconciliation.account_id,
          reconciliation.start_date,
          reconciliation.end_date,
          reconciliation.id
        ),
        updatedTransactions
      );

      // Call the API to update the server
      await updateReconciliationStatus.mutateAsync({
        transactionId,
        isReconciled: isChecked,
        reconciliationId: reconciliation.id,
      });

      // Show success message
      toast.success(
        isChecked
          ? "Transaction marked as reconciled"
          : "Transaction marked as unreconciled"
      );

      // Call the parent's refresh function
      onTransactionsChange();
    } catch (error) {
      console.error("Error updating reconciliation status:", error);

      // If there's an error, revert the optimistic update
      queryClient.setQueryData(
        financeKeys.reconciliation.transactions(
          reconciliation.account_id,
          reconciliation.start_date,
          reconciliation.end_date,
          reconciliation.id
        ),
        transactions // Revert to original transactions
      );

      toast.error("Failed to update reconciliation status. Please try again.");
    }
  }, [transactions, reconciliation, queryClient, updateReconciliationStatus, onTransactionsChange]);

  // Handle select all checkbox with useCallback
  const handleSelectAll = useCallback((isChecked: boolean) => {
    if (isChecked) {
      setSelectedTransactions(filteredAndSortedTransactions.map(tx => tx.id));
    } else {
      setSelectedTransactions([]);
    }
  }, [filteredAndSortedTransactions]);

  // Handle batch reconciliation with useCallback
  const handleBatchReconcile = useCallback(async (isReconciled: boolean) => {
    if (selectedTransactions.length === 0) {
      toast.error("No transactions selected");
      return;
    }

    try {
      // Optimistically update the UI immediately
      const updatedTransactions = transactions.map(tx => {
        if (selectedTransactions.includes(tx.id)) {
          return {
            ...tx,
            is_reconciled: isReconciled,
            reconciliation_id: isReconciled ? reconciliation.id : null
          };
        }
        return tx;
      });

      // Update the transactions in the queryClient cache
      queryClient.setQueryData(
        financeKeys.reconciliation.transactions(
          reconciliation.account_id,
          reconciliation.start_date,
          reconciliation.end_date,
          reconciliation.id
        ),
        updatedTransactions
      );

      // Call the API to update the server
      await batchUpdateReconciliationStatus.mutateAsync({
        transactionIds: selectedTransactions,
        isReconciled,
        reconciliationId: reconciliation.id,
      });

      // Show success message
      toast.success(
        isReconciled
          ? `${selectedTransactions.length} transactions marked as reconciled`
          : `${selectedTransactions.length} transactions marked as unreconciled`
      );

      // Clear selected transactions
      setSelectedTransactions([]);

      // Call the parent's refresh function
      onTransactionsChange();
    } catch (error) {
      console.error("Error batch updating reconciliation status:", error);

      // If there's an error, revert the optimistic update
      queryClient.setQueryData(
        financeKeys.reconciliation.transactions(
          reconciliation.account_id,
          reconciliation.start_date,
          reconciliation.end_date,
          reconciliation.id
        ),
        transactions // Revert to original transactions
      );

      toast.error("Failed to update reconciliation status. Please try again.");
    }
  }, [selectedTransactions, transactions, reconciliation, queryClient, batchUpdateReconciliationStatus, onTransactionsChange]);

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-8 w-[200px] bg-muted animate-pulse rounded"></div>
              <div className="h-8 w-[120px] bg-muted animate-pulse rounded"></div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-6 w-[120px] bg-muted animate-pulse rounded"></div>
                  <div className="h-6 w-[200px] bg-muted animate-pulse rounded"></div>
                  <div className="h-6 w-[100px] bg-muted animate-pulse rounded"></div>
                  <div className="h-6 w-[80px] bg-muted animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <FileX className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Transactions Found</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              There are no transactions for this account in the selected date range.
            </p>
            <Button onClick={onTransactionsChange} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Transactions for the reconciliation period
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              type="search"
              placeholder="Search transactions..."
              className="w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {/* Transaction Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <Filter className="h-4 w-4" />
                    {transactionTypeFilter === "all"
                      ? "All Types"
                      : transactionTypeFilter === "income"
                        ? "Income Only"
                        : transactionTypeFilter === "expenditure"
                          ? "Expenditure Only"
                          : transactionTypeFilter === "transfer_in"
                            ? "Transfers In"
                            : "Transfers Out"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={transactionTypeFilter === "all"}
                    onCheckedChange={() => setTransactionTypeFilter("all")}
                  >
                    All Types
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={transactionTypeFilter === "income"}
                    onCheckedChange={() => setTransactionTypeFilter("income")}
                  >
                    Income Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={transactionTypeFilter === "expenditure"}
                    onCheckedChange={() => setTransactionTypeFilter("expenditure")}
                  >
                    Expenditure Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={transactionTypeFilter === "transfer_in"}
                    onCheckedChange={() => setTransactionTypeFilter("transfer_in")}
                  >
                    Transfers In
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={transactionTypeFilter === "transfer_out"}
                    onCheckedChange={() => setTransactionTypeFilter("transfer_out")}
                  >
                    Transfers Out
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Reconciliation Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <Filter className="h-4 w-4" />
                    {reconciliationStatusFilter === "all"
                      ? "All Status"
                      : reconciliationStatusFilter === "reconciled"
                        ? "Reconciled Only"
                        : "Unreconciled Only"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={reconciliationStatusFilter === "all"}
                    onCheckedChange={() => setReconciliationStatusFilter("all")}
                  >
                    All Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={reconciliationStatusFilter === "reconciled"}
                    onCheckedChange={() => setReconciliationStatusFilter("reconciled")}
                  >
                    Reconciled Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={reconciliationStatusFilter === "unreconciled"}
                    onCheckedChange={() => setReconciliationStatusFilter("unreconciled")}
                  >
                    Unreconciled Only
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedTransactions.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchReconcile(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Selected as Reconciled
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchReconcile(false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Selected as Unreconciled
                </Button>
              </div>
            )}
          </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          filteredAndSortedTransactions.length > 0 &&
                          selectedTransactions.length === filteredAndSortedTransactions.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all transactions"
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date
                        {sortColumn === "date" && (
                          <ArrowUpDown
                            className={`ml-1 h-4 w-4 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        {sortColumn === "type" && (
                          <ArrowUpDown
                            className={`ml-1 h-4 w-4 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("amount")}
                    >
                      <div className="flex items-center justify-end">
                        Amount
                        {sortColumn === "amount" && (
                          <ArrowUpDown
                            className={`ml-1 h-4 w-4 ${
                              sortDirection === "asc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedTransactions.map((transaction) => (
                      <TooltipProvider key={transaction.id}>
                        <TableRow
                          className={transaction.is_reconciled ? "opacity-60 bg-muted/30" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTransactions.includes(transaction.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTransactions([...selectedTransactions, transaction.id]);
                                } else {
                                  setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id));
                                }
                              }}
                              aria-label={`Select transaction ${transaction.id}`}
                            />
                          </TableCell>
                          <TableCell>{formatDatabaseDate(transaction.date)}</TableCell>
                          <TableCell>
                            <TransactionTypeBadge type={transaction.transaction_type} />
                          </TableCell>
                          <TableCell
                            className={`max-w-[200px] truncate ${transaction.is_reconciled ? "line-through" : ""}`}
                          >
                            {transaction.description || "-"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${transaction.is_reconciled ? "line-through" : ""}`}
                          >
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`reconciled-${transaction.id}`}
                                    checked={transaction.is_reconciled}
                                    onCheckedChange={(checked) =>
                                      handleCheckboxChange(transaction.id, !!checked)
                                    }
                                  />
                                  <label
                                    htmlFor={`reconciled-${transaction.id}`}
                                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                                      transaction.is_reconciled ? "text-green-600" : ""
                                    }`}
                                  >
                                    {transaction.is_reconciled ? "Reconciled" : "Unreconciled"}
                                  </label>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {transaction.is_reconciled
                                  ? "This transaction has been reconciled. Click to unreconcile."
                                  : "This transaction has not been reconciled yet. Click to reconcile."}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      </TooltipProvider>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
