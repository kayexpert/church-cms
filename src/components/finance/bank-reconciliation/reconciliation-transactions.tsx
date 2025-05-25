"use client";

import { useState } from "react";
import { Plus, CheckCircle2, XCircle, ArrowUpDown, Filter } from "lucide-react";
import { IncomeEntry, ExpenditureEntry, ReconciliationItem } from "@/types/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReconciliationTransactionsProps {
  incomeEntries: IncomeEntry[];
  expenditureEntries: ExpenditureEntry[];
  reconciliationItems: ReconciliationItem[];
  onAddItem: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  reconciliationId: string;
}

export function ReconciliationTransactions({
  incomeEntries,
  expenditureEntries,
  reconciliationItems,
  onAddItem,
  formatCurrency,
  formatDate,
  reconciliationId,
}: ReconciliationTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"all" | "income" | "expenditure">("all");
  const [reconciliationStatusFilter, setReconciliationStatusFilter] = useState<"all" | "reconciled" | "unreconciled">("all");
  const [isReconciling, setIsReconciling] = useState(false);
  const [transactionsBeingReconciled, setTransactionsBeingReconciled] = useState<string[]>([]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Create a combined array of transactions with type information
  type CombinedTransaction = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "income" | "expenditure";
    category: string;
    isReconciled: boolean;
    originalEntry: IncomeEntry | ExpenditureEntry;
  };

  // Map income entries to combined format
  const mappedIncomeEntries: CombinedTransaction[] = incomeEntries.map(entry => ({
    id: entry.id,
    date: entry.date,
    description: entry.description || "",
    amount: entry.amount,
    type: "income",
    category: entry.income_categories?.name || "Uncategorized",
    isReconciled: isInReconciliationItems("income", entry.id),
    originalEntry: entry
  }));

  // Map expenditure entries to combined format
  const mappedExpenditureEntries: CombinedTransaction[] = expenditureEntries.map(entry => ({
    id: entry.id,
    date: entry.date,
    description: entry.description || "",
    amount: entry.amount,
    type: "expenditure",
    category: entry.expenditure_categories?.name || "Uncategorized",
    isReconciled: isInReconciliationItems("expenditure", entry.id),
    originalEntry: entry
  }));

  // Combine all transactions
  const allTransactions = [...mappedIncomeEntries, ...mappedExpenditureEntries];

  // Filter and sort all transactions
  const filteredAndSortedTransactions = allTransactions
    .filter((transaction) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          transaction.description.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query) ||
          transaction.amount.toString().includes(query) ||
          transaction.date.includes(query);

        if (!matchesSearch) return false;
      }

      // Apply transaction type filter
      if (transactionTypeFilter !== "all" && transaction.type !== transactionTypeFilter) {
        return false;
      }

      // Apply reconciliation status filter
      if (reconciliationStatusFilter === "reconciled" && !transaction.isReconciled) {
        return false;
      } else if (reconciliationStatusFilter === "unreconciled" && transaction.isReconciled) {
        return false;
      }

      return true;
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
      } else if (sortColumn === "category") {
        return sortDirection === "asc"
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      return 0;
    });

  // Check if a transaction is already in reconciliation items
  const isInReconciliationItems = (type: "income" | "expenditure", id: string) => {
    return reconciliationItems.some(
      item => item.transaction_type === type && item.transaction_id === id
    );
  };

  // Handle reconciliation of a transaction
  const handleReconcileTransaction = async (transaction: CombinedTransaction) => {
    if (isReconciling || transactionsBeingReconciled.includes(transaction.id)) {
      return; // Prevent double-clicking
    }

    // Add this transaction to the list of transactions being reconciled
    setTransactionsBeingReconciled(prev => [...prev, transaction.id]);
    setIsReconciling(true);

    try {
      // Call the API to update the reconciliation status
      const response = await fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transaction.id,
          is_reconciled: !transaction.isReconciled, // Toggle the status
          reconciliation_id: reconciliationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update reconciliation status');
      }

      // Update the local state to reflect the change
      // This is done by updating the reconciliationItems array
      if (!transaction.isReconciled) {
        // Add to reconciliation items
        const newItem: ReconciliationItem = {
          id: `temp-${transaction.id}`, // This will be replaced when we refresh
          reconciliation_id: reconciliationId,
          transaction_type: transaction.type,
          transaction_id: transaction.id,
          date: transaction.date,
          amount: transaction.amount,
          is_cleared: true,
          notes: transaction.description,
          created_at: new Date().toISOString(),
        };

        // Update the reconciliationItems array
        reconciliationItems.push(newItem);
      } else {
        // Remove from reconciliation items
        const index = reconciliationItems.findIndex(
          item => item.transaction_type === transaction.type && item.transaction_id === transaction.id
        );

        if (index !== -1) {
          reconciliationItems.splice(index, 1);
        }
      }

      // Show success message
      toast.success(
        transaction.isReconciled
          ? 'Transaction removed from reconciliation'
          : 'Transaction added to reconciliation'
      );

    } catch (error) {
      console.error('Error reconciling transaction:', error);
      toast.error('Failed to update reconciliation status. Please try again.');
    } finally {
      // Remove this transaction from the list of transactions being reconciled
      setTransactionsBeingReconciled(prev => prev.filter(id => id !== transaction.id));
      setIsReconciling(false);
    }
  };

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

            {/* Transaction Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Filter className="h-4 w-4" />
                  {transactionTypeFilter === "all"
                    ? "All Types"
                    : transactionTypeFilter === "income"
                      ? "Income Only"
                      : "Expenditure Only"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reconciliation Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Filter className="h-4 w-4" />
                  {reconciliationStatusFilter === "all"
                    ? "All Status"
                    : reconciliationStatusFilter === "reconciled"
                      ? "Reconciled Only"
                      : "Unreconciled Only"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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

            <Button onClick={onAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableHead>Type</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center">
                    Category
                    {sortColumn === "category" && (
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
                    No transactions found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTransactions.map((transaction) => (
                  <TooltipProvider key={`${transaction.type}-${transaction.id}`}>
                    <TableRow
                      className={`${transaction.isReconciled ? "opacity-60 bg-muted/30" : ""} ${
                        transactionsBeingReconciled.includes(transaction.id) ? "animate-pulse" : ""
                      } cursor-pointer hover:bg-muted/50`}
                      onClick={() => handleReconcileTransaction(transaction)}
                    >
                      <TableCell>
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === "income" ? "success" : "destructive"}>
                          {transaction.type === "income" ? "Income" : "Expenditure"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`max-w-[200px] truncate ${transaction.isReconciled ? "line-through" : ""}`}
                      >
                        {transaction.description || "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${transaction.isReconciled ? "line-through" : ""}`}
                      >
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {transaction.isReconciled ? (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Reconciled
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <XCircle className="h-3 w-3" />
                                Not Reconciled
                              </Badge>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {transaction.isReconciled
                              ? "This transaction has been reconciled"
                              : "This transaction has not been reconciled yet"}
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
      </CardContent>
    </Card>
  );
}
