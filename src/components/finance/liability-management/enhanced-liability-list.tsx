"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { LiabilityEntry } from "@/types/finance";
import { useLiabilityData, LiabilityFilter } from "@/hooks/use-liability-data";
import { useWindowSize } from "@/hooks/use-window-size";
import { formatDatabaseDate } from "@/lib/date-utils";
import { LiabilitySearchFilters } from "./liability-search-filters";
import { FinanceListContainer } from "@/components/finance/common/finance-list-container";
import { FinanceTableContainer } from "@/components/finance/common/finance-list-container";
import { FinanceDataTable } from "@/components/finance/common/finance-data-table";
import { FinancePagination } from "@/components/finance/common/finance-pagination";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedLiabilityListProps {
  onEdit: (entry: LiabilityEntry) => void;
  onDelete: (entry: LiabilityEntry) => void;
  onMakePayment: (entry: LiabilityEntry) => void;
  onViewDetails?: (entry: LiabilityEntry) => void;
}

export function EnhancedLiabilityList({ onEdit, onDelete, onMakePayment, onViewDetails }: EnhancedLiabilityListProps) {
  // Get query client for manual invalidation
  const queryClient = useQueryClient();

  // State for filtering and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20; // Increased page size for better UX

  // Force refresh when component mounts or when tab becomes visible
  useEffect(() => {
    // Invalidate and refetch liability queries
    queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
    queryClient.refetchQueries({ queryKey: ["liabilityEntries"] });

    // Set up visibility change listener to refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
        queryClient.refetchQueries({ queryKey: ["liabilityEntries"] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  // Get window size for container height
  const { height: windowHeight } = useWindowSize();
  const tableHeight = Math.max(400, windowHeight ? windowHeight * 0.5 : 400);

  // Debounce search query to prevent excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Create filter object for the query
  // Since we've removed the Status filter from the UI, we'll just use the search filter
  const filters: LiabilityFilter = useMemo(() => ({
    search: debouncedSearchQuery,
    // We're keeping the statusFilter state for compatibility, but not using it in the UI
    // However, we'll still use it in the filter to maintain the existing functionality
    status: statusFilter !== "all" ? statusFilter : undefined,
  }), [debouncedSearchQuery, statusFilter]);

  // Fetch liability data with React Query
  const {
    data: liabilityData,
    isLoading,
    isFetching,
  } = useLiabilityData(page, pageSize, filters);

  // Handle sort - we're only using this to set the sort column
  const handleSort = useCallback((column: string) => {
    setSortColumn(column);
  }, []);

  // Get data from the query result with proper type handling
  const entries: LiabilityEntry[] = (liabilityData as any)?.data || [];
  const totalCount: number = (liabilityData as any)?.totalCount || 0;
  const totalPages: number = (liabilityData as any)?.totalPages || 0;

  // Reference for the table container
  const parentRef = useRef<HTMLDivElement>(null);

  // We'll use the refresh functionality directly in the search filters component

  // Liability icon for the list header
  const liabilityIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-blue-500"
    >
      <path d="M9 5H2v7" />
      <path d="M2 12c0 6 8 10 10 0" />
      <path d="M12 7h7v7" />
      <path d="M22 12c0 6-8 10-10 0" />
    </svg>
  );

  // Empty state message based on search query and filter
  const emptyStateMessage = debouncedSearchQuery || statusFilter !== "all"
    ? "No matching liability entries found"
    : "No liability entries yet";

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["liabilityEntries"] });
    queryClient.refetchQueries({ queryKey: ["liabilityEntries"] });
  };

  return (
    <FinanceListContainer
      title="Liability Entries"
      description="Manage your liability transactions"
      icon={liabilityIcon}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      isRefreshing={isFetching}
      headerContent={
        <LiabilitySearchFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
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
            <p className="text-muted-foreground">{emptyStateMessage}</p>
          </div>
        }
      >
        <FinanceDataTable
          data={entries}
          keyField="id"
          emptyMessage={emptyStateMessage}
          isLoading={isLoading}
          sortColumn={sortColumn}
          sortDirection="asc"
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
              key: "creditor",
              label: "CREDITOR",
              primary: true,
              sortable: true,
              truncate: true,
              render: (_, row) => row.creditor_name
            },
            {
              key: "total",
              label: "TOTAL",
              hideOnMobile: true,
              sortable: true,
              className: "text-right",
              render: (_, row) => {
                // Format currency
                return new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "GHS",
                  minimumFractionDigits: 2,
                }).format(parseFloat(row.total_amount)).replace('GH₵', '₵');
              }
            },
            {
              key: "remaining",
              label: "REMAINING",
              primary: true,
              sortable: true,
              className: "text-right",
              render: (_, row) => {
                // Format currency
                return new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "GHS",
                  minimumFractionDigits: 2,
                }).format(parseFloat(row.amount_remaining)).replace('GH₵', '₵');
              }
            },
            {
              key: "status",
              label: "STATUS",
              hideOnMobile: true,
              sortable: true,
              render: (_, row) => {
                const statusClasses = {
                  unpaid: "bg-red-100 text-red-800 border-red-200",
                  partial: "bg-amber-100 text-amber-800 border-amber-200",
                  paid: "bg-green-100 text-green-800 border-green-200"
                };

                return (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[row.status]}`}>
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </span>
                );
              }
            }
          ]}
          onRowClick={onViewDetails ? (row) => onViewDetails(row) : undefined}
          actions={(row) => (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onMakePayment(row);
                }}
                disabled={row.status === 'paid'}
              >
                <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                <span className="sr-only">Make Payment</span>
              </Button>
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
          )}
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
