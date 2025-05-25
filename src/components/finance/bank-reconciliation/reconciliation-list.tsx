"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Plus, Trash2, CheckCircle2, XCircle, Eye, RefreshCw } from "lucide-react";
import { BankReconciliation } from "@/types/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FinanceDataTable } from "@/components/finance/common/finance-data-table";
import { FinancePagination } from "@/components/finance/common/finance-pagination";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReconciliationListProps {
  reconciliations: BankReconciliation[];
  onSelectReconciliation: (reconciliation: BankReconciliation) => void;
  onCreateReconciliation: () => void;
  onRefresh?: () => void;
}

export function ReconciliationList({
  reconciliations,
  onSelectReconciliation,
  onCreateReconciliation,
  onRefresh
}: ReconciliationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reconciliationToDelete, setReconciliationToDelete] = useState<BankReconciliation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filter and sort reconciliations
  const filteredAndSortedReconciliations = reconciliations
    .filter((reconciliation) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        reconciliation.accounts?.name.toLowerCase().includes(query) ||
        reconciliation.accounts?.bank_name?.toLowerCase().includes(query) ||
        reconciliation.accounts?.account_number?.toLowerCase().includes(query) ||
        reconciliation.start_date.includes(query) ||
        reconciliation.end_date.includes(query)
      );
    })
    .sort((a, b) => {
      if (sortColumn === "account") {
        const accountA = a.accounts?.name || "";
        const accountB = b.accounts?.name || "";
        return sortDirection === "asc"
          ? accountA.localeCompare(accountB)
          : accountB.localeCompare(accountA);
      } else if (sortColumn === "start_date") {
        return sortDirection === "asc"
          ? new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          : new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      } else if (sortColumn === "end_date") {
        return sortDirection === "asc"
          ? new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          : new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
      } else if (sortColumn === "bank_balance") {
        return sortDirection === "asc"
          ? a.bank_balance - b.bank_balance
          : b.bank_balance - a.bank_balance;
      } else if (sortColumn === "book_balance") {
        return sortDirection === "asc"
          ? a.book_balance - b.book_balance
          : b.book_balance - a.book_balance;
      } else if (sortColumn === "status") {
        const isCompletedA = a.status === 'completed' ? 1 : 0;
        const isCompletedB = b.status === 'completed' ? 1 : 0;
        return sortDirection === "asc"
          ? isCompletedA - isCompletedB
          : isCompletedB - isCompletedA;
      } else if (sortColumn === "created_at") {
        return sortDirection === "asc"
          ? new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
          : new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
      return 0;
    });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵'); // Replace the default "GH₵" with just "₵"
  };

  // Format date
  const formatDate = (dateString: string) => {
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

  // Get query client
  const queryClient = useQueryClient();

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      setIsRefreshing(true);

      // Invalidate and refetch reconciliation queries
      queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });

      // Call the parent's onRefresh function
      onRefresh();

      // Refetch queries to ensure data is updated
      queryClient.refetchQueries({ queryKey: ["bankReconciliations"] })
        .then(() => {
          setIsRefreshing(false);
          toast.success("Refreshed reconciliations");
        })
        .catch(() => {
          setIsRefreshing(false);
          toast.error("Failed to refresh reconciliations");
        });
    }
  };

  // Handle delete button click
  const handleDeleteClick = (reconciliation: BankReconciliation) => {
    setReconciliationToDelete(reconciliation);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!reconciliationToDelete) return;

    try {
      setIsDeleting(true);

      // First delete all reconciliation items
      try {
        console.log(`Deleting reconciliation items for reconciliation ${reconciliationToDelete.id}`);

        const { error: itemsError } = await supabase
          .from("reconciliation_items")
          .delete()
          .eq("reconciliation_id", reconciliationToDelete.id);

        if (itemsError) {
          console.error("Error deleting reconciliation items:",
            itemsError.message || JSON.stringify(itemsError));
          throw itemsError;
        } else {
          console.log(`Successfully deleted reconciliation items for reconciliation ${reconciliationToDelete.id}`);
        }
      } catch (itemsDeleteError) {
        console.error("Exception deleting reconciliation items:",
          itemsDeleteError instanceof Error ? itemsDeleteError.message : String(itemsDeleteError));
        throw itemsDeleteError; // Re-throw as this is critical
      }

      // Delete all transaction reconciliation links
      try {
        console.log(`Deleting transaction reconciliation links for reconciliation ${reconciliationToDelete.id}`);

        const { error: linksError } = await supabase
          .from("transaction_reconciliations")
          .delete()
          .eq("reconciliation_id", reconciliationToDelete.id);

        if (linksError) {
          console.error("Error deleting transaction reconciliation links:",
            linksError.message || JSON.stringify(linksError));
          // Continue with deletion even if this fails
        } else {
          console.log(`Successfully deleted transaction reconciliation links for reconciliation ${reconciliationToDelete.id}`);
        }
      } catch (linksDeleteError) {
        console.error("Exception deleting transaction reconciliation links:",
          linksDeleteError instanceof Error ? linksDeleteError.message : String(linksDeleteError));
        // Continue with deletion even if this fails
      }

      // Find and delete all income entries that are reconciliation adjustments
      try {
        console.log(`Finding income entries related to reconciliation ${reconciliationToDelete.id}`);

        // Use proper query builder syntax and only use fields we know exist
        const { data: incomeEntries, error: incomeError } = await supabase
          .from("income_entries")
          .select("id, description")
          .or(
            `payment_method.eq.reconciliation,` +
            `description.ilike.[RECONCILIATION]%`
          );

        if (incomeError) {
          console.error("Error finding reconciliation income adjustments:",
            incomeError.message || JSON.stringify(incomeError));
        } else if (incomeEntries && incomeEntries.length > 0) {
          console.log(`Found ${incomeEntries.length} reconciliation income adjustments to delete:`,
            incomeEntries.map(e => ({ id: e.id, description: e.description })));

          // Delete each income entry
          for (const entry of incomeEntries) {
            try {
              const { error: deleteError } = await supabase
                .from("income_entries")
                .delete()
                .eq("id", entry.id);

              if (deleteError) {
                console.error(`Error deleting reconciliation income adjustment ${entry.id}:`,
                  deleteError.message || JSON.stringify(deleteError));
              } else {
                console.log(`Successfully deleted income adjustment ${entry.id}`);
              }
            } catch (entryError) {
              console.error(`Exception deleting income adjustment ${entry.id}:`,
                entryError instanceof Error ? entryError.message : String(entryError));
            }
          }
        } else {
          console.log(`No income adjustments found for reconciliation ${reconciliationToDelete.id}`);
        }
      } catch (adjustmentError) {
        console.error("Error handling income adjustment deletion:",
          adjustmentError instanceof Error ? adjustmentError.message : String(adjustmentError));
        // Continue with deletion even if this fails
      }

      // Find and delete all expenditure entries that are reconciliation adjustments
      try {
        console.log(`Finding expenditure entries related to reconciliation ${reconciliationToDelete.id}`);

        // Use proper query builder syntax and only use fields we know exist
        const { data: expenditureEntries, error: expenditureError } = await supabase
          .from("expenditure_entries")
          .select("id, description")
          .or(
            `payment_method.eq.reconciliation,` +
            `description.ilike.[RECONCILIATION]%`
          );

        if (expenditureError) {
          console.error("Error finding reconciliation expenditure adjustments:",
            expenditureError.message || JSON.stringify(expenditureError));
        } else if (expenditureEntries && expenditureEntries.length > 0) {
          console.log(`Found ${expenditureEntries.length} reconciliation expenditure adjustments to delete:`,
            expenditureEntries.map(e => ({ id: e.id, description: e.description })));

          // Delete each expenditure entry
          for (const entry of expenditureEntries) {
            try {
              const { error: deleteError } = await supabase
                .from("expenditure_entries")
                .delete()
                .eq("id", entry.id);

              if (deleteError) {
                console.error(`Error deleting reconciliation expenditure adjustment ${entry.id}:`,
                  deleteError.message || JSON.stringify(deleteError));
              } else {
                console.log(`Successfully deleted expenditure adjustment ${entry.id}`);
              }
            } catch (entryError) {
              console.error(`Exception deleting expenditure adjustment ${entry.id}:`,
                entryError instanceof Error ? entryError.message : String(entryError));
            }
          }
        } else {
          console.log(`No expenditure adjustments found for reconciliation ${reconciliationToDelete.id}`);
        }
      } catch (adjustmentError) {
        console.error("Error handling expenditure adjustment deletion:",
          adjustmentError instanceof Error ? adjustmentError.message : String(adjustmentError));
        // Continue with deletion even if this fails
      }

      // Finally delete the reconciliation
      try {
        console.log(`Deleting reconciliation ${reconciliationToDelete.id}`);

        const { error } = await supabase
          .from("bank_reconciliations")
          .delete()
          .eq("id", reconciliationToDelete.id);

        if (error) {
          console.error("Error deleting reconciliation:",
            error.message || JSON.stringify(error));
          throw error;
        }

        console.log(`Successfully deleted reconciliation ${reconciliationToDelete.id}`);
        toast.success("Reconciliation deleted successfully");
        setShowDeleteDialog(false);

        // Call the onRefresh callback to refresh the list
        if (onRefresh) {
          console.log("Refreshing reconciliation list");
          onRefresh();
        }
      } catch (reconciliationDeleteError) {
        console.error("Exception deleting reconciliation:",
          reconciliationDeleteError instanceof Error ? reconciliationDeleteError.message : String(reconciliationDeleteError));
        throw reconciliationDeleteError; // Re-throw to be caught by the outer try-catch
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error deleting reconciliation:", errorMessage);
      toast.error(`Failed to delete reconciliation: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Bank Reconciliations</CardTitle>
              <CardDescription>
                Manage your bank account reconciliations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search reconciliations..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh reconciliations"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="sr-only">Refresh</span>
              </Button>
              <Button onClick={onCreateReconciliation}>
                <Plus className="h-4 w-4 mr-2" />
                New Reconciliation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FinanceDataTable
            data={filteredAndSortedReconciliations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
            keyField="id"
            emptyMessage="No reconciliations found."
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onRowClick={onSelectReconciliation}
            columns={[
              {
                key: "account",
                label: "ACCOUNT",
                primary: true,
                sortable: true,
                width: 180,
                render: (_, row) => (
                  <div>
                    <div className="font-medium truncate" title={row.accounts?.name || "Unknown Account"}>
                      {row.accounts?.name || "Unknown Account"}
                    </div>
                    {row.accounts?.account_number && (
                      <div className="text-xs text-muted-foreground truncate">
                        {row.accounts.account_number}
                      </div>
                    )}
                  </div>
                )
              },
              {
                key: "start_date",
                label: "START DATE",
                sortable: true,
                width: 120,
                render: (_, row) => formatDate(row.start_date)
              },
              {
                key: "end_date",
                label: "END DATE",
                sortable: true,
                width: 120,
                render: (_, row) => formatDate(row.end_date)
              },
              {
                key: "notes",
                label: "NOTES",
                truncate: true,
                render: (_, row) => row.notes || "-"
              },
              {
                key: "bank_balance",
                label: "BANK BALANCE",
                sortable: true,
                width: 140,
                className: "text-right",
                render: (_, row) => formatCurrency(row.bank_balance)
              },
              {
                key: "book_balance",
                label: "BOOK BALANCE",
                sortable: true,
                width: 140,
                className: "text-right",
                render: (_, row) => formatCurrency(row.book_balance)
              },
              {
                key: "status",
                label: "STATUS",
                sortable: true,
                width: 120,
                render: (_, row) => (
                  row.status === 'completed' ? (
                    <Badge variant="success" className="flex items-center gap-1 w-fit text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      Reconciled
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit text-xs">
                      <XCircle className="h-3 w-3" />
                      Pending
                    </Badge>
                  )
                )
              }
            ]}
            actions={(reconciliation) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectReconciliation(reconciliation);
                  }}
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  <span className="sr-only">View</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(reconciliation);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            )}
          />

          {/* Pagination Controls */}
          {filteredAndSortedReconciliations.length > 0 && (
            <div className="mt-4">
              <FinancePagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredAndSortedReconciliations.length / itemsPerPage)}
                totalItems={filteredAndSortedReconciliations.length}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reconciliation? This action cannot be undone and will also delete all reconciliation items and any reconciliation adjustments (income and expenditure entries) associated with it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
