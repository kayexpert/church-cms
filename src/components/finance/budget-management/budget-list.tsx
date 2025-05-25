"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Plus, Pencil, Trash2, Eye, RefreshCw } from "lucide-react";
import { Budget } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format-currency";
import { FinanceListContainer } from "@/components/finance/common/finance-list-container";
import { FinanceDataTable } from "@/components/finance/common/finance-data-table";
import { FinancePagination } from "@/components/finance/common/finance-pagination";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BudgetListProps {
  budgets: Budget[];
  onSelectBudget: (budget: Budget) => void;
  onCreateBudget: () => void;
  onRefresh?: () => void;
}

export function BudgetList({ budgets, onSelectBudget, onCreateBudget, onRefresh }: BudgetListProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
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

  // Filter and sort budgets
  const filteredAndSortedBudgets = budgets
    .filter((budget) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        budget.title.toLowerCase().includes(query) ||
        budget.description?.toLowerCase().includes(query) ||
        budget.status.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortColumn === "title") {
        return sortDirection === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else if (sortColumn === "start_date") {
        return sortDirection === "asc"
          ? new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          : new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      } else if (sortColumn === "end_date") {
        return sortDirection === "asc"
          ? new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          : new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
      } else if (sortColumn === "total_amount") {
        return sortDirection === "asc"
          ? a.total_amount - b.total_amount
          : b.total_amount - a.total_amount;
      } else if (sortColumn === "status") {
        return sortDirection === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      } else if (sortColumn === "created_at") {
        return sortDirection === "asc"
          ? new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
          : new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
      return 0;
    });

  // Use the formatCurrency utility imported at the top

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd-MMM-yy");
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "draft":
        return "secondary";
      case "active":
        return "default"; // Changed from "success" to "default" as "success" is not in the Badge variant type
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Handle delete button click
  const handleDeleteClick = (budget: Budget) => {
    setBudgetToDelete(budget);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!budgetToDelete) return;

    try {
      setIsDeleting(true);

      // Use the dedicated API endpoint for budget deletion
      const response = await fetch('/api/finance/delete-budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ budget_id: budgetToDelete.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete budget');
      }

      const result = await response.json();

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });

      toast.success("Budget and all related items deleted successfully");
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error(`Failed to delete budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      setIsRefreshing(true);

      // Invalidate and refetch budget queries
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      // Call the parent's onRefresh function
      onRefresh();

      // Refetch queries to ensure data is updated
      queryClient.refetchQueries({ queryKey: ["budgets"] })
        .then(() => {
          setIsRefreshing(false);
          toast.success("Refreshed budgets");
        })
        .catch(() => {
          setIsRefreshing(false);
          toast.error("Failed to refresh budgets");
        });
    }
  };

  // Budget icon for the list header
  const budgetIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-purple-500"
    >
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-7h-2c0-1-1.5-1-1.5-1H19Z" />
      <path d="M2 9v1c0 1.1.9 2 2 2h1" />
      <path d="M16 11h0" />
    </svg>
  );

  return (
    <>
      <FinanceListContainer
        title="Budgets"
        description="Manage your organization's budgets"
        icon={budgetIcon}
        headerContent={
          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search budgets..."
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
              title="Refresh budgets"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button onClick={onCreateBudget}>
              <Plus className="h-4 w-4 mr-2" />
              New Budget
            </Button>
          </div>
        }
      >
          <FinanceDataTable
            data={filteredAndSortedBudgets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
            keyField="id"
            emptyMessage="No budgets found."
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onRowClick={onSelectBudget}
            columns={[
              {
                key: "title",
                label: "TITLE",
                primary: true,
                sortable: true,
                truncate: true,
                width: 200,
                render: (_, row) => row.title
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
                key: "description",
                label: "DESCRIPTION",
                truncate: true,
                render: (_, row) => row.description || "-"
              },
              {
                key: "total_amount",
                label: "TOTAL AMOUNT",
                sortable: true,
                width: 150,
                className: "text-right",
                render: (_, row) => formatCurrency(row.total_amount)
              },
              {
                key: "status",
                label: "STATUS",
                sortable: true,
                width: 120,
                render: (_, row) => (
                  <Badge
                    variant={getStatusBadgeVariant(row.status)}
                    className="text-xs"
                  >
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </Badge>
                )
              }
            ]}
            actions={(budget) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBudget(budget);
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
                    handleDeleteClick(budget);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            )}
          />

          {/* Pagination Controls */}
          {filteredAndSortedBudgets.length > 0 && (
            <div className="mt-4">
              <FinancePagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredAndSortedBudgets.length / itemsPerPage)}
                totalItems={filteredAndSortedBudgets.length}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
      </FinanceListContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone and will:
            </DialogDescription>
            <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground">
              <li>Delete all budget items associated with this budget</li>
              <li>Delete all expenditure entries created from this budget</li>
              <li>Update account balances to reflect these changes</li>
            </ul>
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
