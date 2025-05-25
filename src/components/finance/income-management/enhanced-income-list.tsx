"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { IncomeEntry, IncomeCategory } from "@/types/finance";
import { useWindowSize } from "@/hooks/use-window-size";
import { useQueryClient } from "@tanstack/react-query";
import { formatDatabaseDate } from "@/lib/date-utils";
import { Pencil, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IncomeSearchFilters } from "./income-search-filters";
import { FinanceListContainer } from "@/components/finance/common/finance-list-container";
import { FinanceTableContainer } from "@/components/finance/common/finance-list-container";
import { FinanceDataTable } from "@/components/finance/common/finance-data-table";
import { FinancePagination } from "@/components/finance/common/finance-pagination";
import { isOpeningBalanceEntry, isLoanIncomeEntry } from "@/lib/identify-special-income-entries";
import { isBudgetIncomeEntry, getBudgetEntryMessage } from "@/lib/identify-budget-entries";
import { isReconciliationIncomeEntry, getReconciliationEntryMessage } from "@/lib/identify-reconciliation-entries";
import { isAssetDisposalEntry, getAssetDisposalEntryMessage } from "@/lib/identify-asset-disposal-entries";

// Extended IncomeEntry type with joined tables
interface ExtendedIncomeEntry extends IncomeEntry {
  income_categories?: IncomeCategory | null;
}

interface IncomeListProps {
  incomeEntries: ExtendedIncomeEntry[];
  onEdit: (entry: ExtendedIncomeEntry) => void;
  onDelete: (entry: ExtendedIncomeEntry) => void;
  onViewDetails?: (entry: ExtendedIncomeEntry) => void;
  onRefresh?: () => void;
  isFetching?: boolean;
}

export function EnhancedIncomeList({
  incomeEntries,
  onEdit,
  onDelete,
  onViewDetails,
  onRefresh,
  isFetching: parentIsFetching
}: IncomeListProps) {
  // State for filtering and sorting
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const windowSize = useWindowSize();
  const [localIsFetching, setLocalIsFetching] = useState(false);

  // Use parent's isFetching state if provided, otherwise use local state
  const isFetching = parentIsFetching !== undefined ? parentIsFetching : localIsFetching;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce search query to prevent excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Force refresh when component mounts or when tab becomes visible
  useEffect(() => {
    // Invalidate and refetch income queries
    queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
    queryClient.refetchQueries({ queryKey: ["incomeEntries"] });

    // Set up visibility change listener to refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
        queryClient.refetchQueries({ queryKey: ["incomeEntries"] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  // Function to handle manual refresh
  const handleRefresh = () => {
    // If parent provided a refresh function, use it
    if (onRefresh) {
      onRefresh();
    } else {
      // Otherwise, use local refresh logic
      setLocalIsFetching(true);
      queryClient.invalidateQueries({ queryKey: ["incomeEntries"] });
      queryClient.refetchQueries({ queryKey: ["incomeEntries"] })
        .then(() => {
          setLocalIsFetching(false);
        })
        .catch(() => {
          setLocalIsFetching(false);
        });
    }
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Filter and sort entries with memoization for performance
  const filteredAndSortedEntries = useMemo(() => {
    return incomeEntries
      .filter((entry) => {
        if (!debouncedSearchQuery) return true;
        const query = debouncedSearchQuery.toLowerCase();
        return (
          entry.description?.toLowerCase().includes(query) ||
          entry.income_categories?.name?.toLowerCase().includes(query) ||
          entry.amount.toString().includes(query) ||
          entry.date.includes(query)
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
        } else if (sortColumn === "category") {
          const categoryA = a.income_categories?.name || "";
          const categoryB = b.income_categories?.name || "";
          return sortDirection === "asc"
            ? categoryA.localeCompare(categoryB)
            : categoryB.localeCompare(categoryA);
        }
        return 0;
      });
  }, [incomeEntries, debouncedSearchQuery, sortColumn, sortDirection]);

  // Calculate pagination values
  const totalItems = filteredAndSortedEntries.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Get current page items
  const currentPageItems = useMemo(() => {
    return filteredAndSortedEntries.slice(startIndex, endIndex);
  }, [filteredAndSortedEntries, startIndex, endIndex]);

  // Calculate list height based on window size
  const listHeight = useMemo(() => {
    // Default height
    const defaultHeight = 400;

    // If window size is available, calculate based on viewport
    if (windowSize.height) {
      // Use 50% of viewport height, but not less than 300px or more than 600px
      return Math.min(Math.max(windowSize.height * 0.5, 300), 600);
    }

    return defaultHeight;
  }, [windowSize.height]);

  // Income icon for the list header
  const incomeIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-green-500"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );

  // Empty state message based on search query
  const emptyStateMessage = debouncedSearchQuery
    ? "No matching income entries found"
    : "No income entries yet";

  return (
    <FinanceListContainer
      title="Income Entries"
      description="Manage your income transactions"
      icon={incomeIcon}
      onRefresh={handleRefresh}
      isRefreshing={isFetching}
      headerContent={
        <IncomeSearchFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={handleRefresh}
          isFetching={isFetching}
        />
      }
    >
      <FinanceTableContainer
        maxHeight={listHeight}
        emptyState={
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
            {emptyStateMessage}
          </div>
        }
      >
        <FinanceDataTable
          data={currentPageItems}
          keyField="id"
          emptyMessage={emptyStateMessage}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          columns={[
            {
              key: "date",
              label: "DATE",
              primary: true,
              sortable: true,
              render: (_, row) => formatDatabaseDate(row.date)
            },
            {
              key: "category",
              label: "CATEGORY",
              primary: true,
              sortable: true,
              render: (_, row) => (
                <Badge variant="outline" className="bg-background hover:bg-muted text-xs">
                  {row.income_categories?.name || "Uncategorized"}
                </Badge>
              )
            },
            {
              key: "description",
              label: "DESCRIPTION",
              hideOnMobile: true,
              truncate: true,
              render: (_, row) => row.description || "-"
            },
            {
              key: "account",
              label: "ACCOUNT",
              hideOnMobile: true,
              truncate: true,
              render: (_, row) => row.account?.name || "-"
            },
            {
              key: "amount",
              label: "AMOUNT",
              primary: true,
              sortable: true,
              className: "text-right",
              render: (_, row) => {
                // Format currency
                return new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "GHS",
                  minimumFractionDigits: 2,
                }).format(row.amount).replace('GH₵', '₵');
              }
            }
          ]}
          onRowClick={onViewDetails ? (row) => onViewDetails(row) : undefined}
          actions={(row) => {
            // Check if this is a special entry (opening balance, loan, budget-related, asset disposal, or reconciliation)
            const isOpeningBalance = isOpeningBalanceEntry(row);
            const isLoanIncome = isLoanIncomeEntry(row);
            const isBudgetIncome = isBudgetIncomeEntry(row);
            const isAssetDisposal = isAssetDisposalEntry(row);
            const isReconciliation = isReconciliationIncomeEntry(row);
            // Special case: if it's both a reconciliation entry and an asset disposal entry,
            // prioritize the reconciliation status for deletion purposes
            const isAssetDisposalButNotReconciliation = isAssetDisposal && !isReconciliation;
            const isUndeletableEntry = isOpeningBalance || isLoanIncome || isBudgetIncome || isAssetDisposalButNotReconciliation;
            const isUneditableEntry = isOpeningBalance || isLoanIncome || isBudgetIncome || isAssetDisposal || isReconciliation;

            // For reconciliation entries, show only delete button
            if (isReconciliation && !isUndeletableEntry) {
              return (
                <div className="flex justify-end gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-not-allowed opacity-70"
                        >
                          <Lock className="h-3.5 w-3.5 text-gray-500" />
                          <span className="sr-only">Restricted</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {getReconciliationEntryMessage()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(row);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              );
            }

            // If it's a completely restricted entry, show only a lock icon with tooltip
            if (isUndeletableEntry) {
              return (
                <div className="flex justify-end gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-not-allowed opacity-70"
                        >
                          <Lock className="h-3.5 w-3.5 text-gray-500" />
                          <span className="sr-only">Restricted</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {isOpeningBalance
                          ? "Opening balance entries can only be modified in Account Settings"
                          : isLoanIncome
                          ? "Loan entries can only be modified in Liabilities"
                          : isAssetDisposal
                          ? getAssetDisposalEntryMessage()
                          : getBudgetEntryMessage()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            }

            // For regular entries, show the normal edit/delete buttons
            return (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(row);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 text-green-600" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(row);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            );
          }}
        />
      </FinanceTableContainer>

      {/* Pagination Controls */}
      {filteredAndSortedEntries.length > 0 && (
        <div className="mt-4">
          <FinancePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </FinanceListContainer>
  );
}
