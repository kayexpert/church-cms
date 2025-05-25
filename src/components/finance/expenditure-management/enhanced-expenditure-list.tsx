"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { ExpenditureEntry } from "@/types/finance";
import { useExpenditureData, ExpenditureFilter } from "@/hooks/use-expenditure-data";
import { useWindowSize } from "@/hooks/use-window-size";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isBudgetExpenditureEntry, getBudgetEntryMessage } from "@/lib/identify-budget-entries";
import { isReconciliationExpenditureEntry, getReconciliationEntryMessage } from "@/lib/identify-reconciliation-entries";
import { ExpenditureSearchFilters } from "./expenditure-search-filters";
import { FinanceListContainer } from "@/components/finance/common/finance-list-container";
import { FinanceTableContainer } from "@/components/finance/common/finance-list-container";
import { FinanceDataTable } from "@/components/finance/common/finance-data-table";
import { FinancePagination } from "@/components/finance/common/finance-pagination";

interface EnhancedExpenditureListProps {
  onEdit: (entry: ExpenditureEntry) => void;
  onDelete: (entry: ExpenditureEntry) => void;
  onViewDetails?: (entry: ExpenditureEntry) => void;
}

export function EnhancedExpenditureList({ onEdit, onDelete, onViewDetails }: EnhancedExpenditureListProps) {
  // State for filtering and sorting
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20; // Increased page size for better UX

  // Get window size for container height
  const { height: windowHeight } = useWindowSize();
  const tableHeight = Math.max(400, windowHeight ? windowHeight * 0.5 : 400);

  // Debounce search query to prevent excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Force refresh when component mounts or when tab becomes visible
  useEffect(() => {
    // Invalidate and refetch expenditure queries
    queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
    queryClient.refetchQueries({ queryKey: ["expenditureEntries"] });

    // Set up visibility change listener to refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
        queryClient.refetchQueries({ queryKey: ["expenditureEntries"] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  // Create filter object for the query
  // Since we've removed the Type filter from the UI, we'll just use the search filter
  const filters: ExpenditureFilter = useMemo(() => ({
    search: debouncedSearchQuery,
    // We're keeping the typeFilter state for compatibility, but not using it in the UI
    // However, we'll still use it in the filter to maintain the existing functionality
    categoryId: typeFilter !== "all" && typeFilter !== "liability" ? typeFilter : undefined,
    liabilityPayment: typeFilter === "liability" ? true : undefined,
  }), [debouncedSearchQuery, typeFilter]);

  // Fetch expenditure data with React Query
  const {
    data: expenditureData,
    isLoading,
    isFetching,
  } = useExpenditureData(page, pageSize, filters);

  // Define the expected type for expenditureData
  type ExpenditureDataType = {
    data: ExpenditureEntry[];
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };

  // Handle sort
  const handleSort = useCallback((column: string) => {
    setSortDirection(prev => {
      if (sortColumn === column) {
        return prev === "asc" ? "desc" : "asc";
      }
      return "asc";
    });
    setSortColumn(column);
  }, [sortColumn]);

  // Get data from the query result with proper type handling
  // Use type assertion to help TypeScript understand the structure
  const typedData = expenditureData as ExpenditureDataType | undefined;
  const entries = typedData?.data || [];
  const totalCount = typedData?.totalCount || 0;
  const totalPages = typedData?.totalPages || 0;

  // We'll use the refresh functionality directly in the search filters component

  // Expenditure icon for the list header
  const expenditureIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-red-500"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );

  // Empty state message based on search query and filter
  const emptyStateMessage = debouncedSearchQuery || typeFilter !== "all"
    ? "No matching expenditure entries found"
    : "No expenditure entries yet";

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["expenditureEntries"] });
    queryClient.refetchQueries({ queryKey: ["expenditureEntries"] });
  };

  return (
    <FinanceListContainer
      title="Expenditure Entries"
      description="Manage your expenditure transactions"
      icon={expenditureIcon}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      isRefreshing={isFetching}
      headerContent={
        <ExpenditureSearchFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          onRefresh={handleRefresh}
          isFetching={isFetching}
        />
      }
    >
      <FinanceTableContainer
        maxHeight={tableHeight}
        isLoading={isLoading}
        emptyState={
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">{emptyStateMessage}</p>
          </div>
        }
      >
        <FinanceDataTable
          data={entries}
          keyField="id"
          emptyMessage={emptyStateMessage}
          isLoading={isLoading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          columns={[
            {
              key: "date",
              label: "DATE",
              primary: true,
              sortable: true,
              render: (_, row) => {
                const date = new Date(`${row.date}T12:00:00`);
                return format(date, "dd-MMM-yy");
              }
            },
            {
              key: "category",
              label: "CATEGORY",
              primary: true,
              sortable: true,
              render: (_, row) => (
                <Badge variant="outline" className="bg-background hover:bg-muted text-xs">
                  {row.expenditure_categories?.name || "Uncategorized"}
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
              key: "recipient",
              label: "RECIPIENT",
              hideOnMobile: true,
              truncate: true,
              render: (_, row) => row.recipient || "-"
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
            // Check if this is a budget-related entry
            const isBudgetEntry = isBudgetExpenditureEntry(row);
            // Check if this is a reconciliation entry
            const isReconciliationEntry = isReconciliationExpenditureEntry(row);

            // For reconciliation entries, show only delete button
            if (isReconciliationEntry && !isBudgetEntry) {
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

            // If it's a budget-related entry, show only a lock icon with tooltip
            if (isBudgetEntry) {
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
                        {getBudgetEntryMessage()}
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
      {entries.length > 0 && (
        <div className="mt-4">
          <FinancePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </FinanceListContainer>
  );
}
