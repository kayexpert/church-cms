"use client";

import React from "react";
import { SearchFilter } from "@/components/finance/common/finance-search-filters";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface LiabilitySearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;  // Keeping this in the props to maintain compatibility
  setStatusFilter: (filter: string) => void;  // Keeping this in the props to maintain compatibility
  onRefresh?: () => void;
  isFetching?: boolean;
}

export function LiabilitySearchFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,  // Unused but kept for compatibility
  setStatusFilter,  // Unused but kept for compatibility
  onRefresh,
  isFetching = false
}: LiabilitySearchFiltersProps) {
  // We're removing the Status filter dropdown completely as requested

  return (
    <div className="flex items-center gap-2">
      {/* Search bar (first) */}
      <div className="flex-1">
        <SearchFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="Search liabilities..."
          className="w-full"
        />
      </div>

      {/* Refresh button (last/rightmost position) */}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="h-9 px-2 ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      )}
    </div>
  );
}
