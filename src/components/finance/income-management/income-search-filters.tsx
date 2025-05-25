"use client";

import React from "react";
import { SearchFilter } from "@/components/finance/common/finance-search-filters";

interface IncomeSearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh?: () => void;
  isFetching?: boolean;
}

export function IncomeSearchFilters({
  searchQuery,
  setSearchQuery,
  onRefresh,
  isFetching = false
}: IncomeSearchFiltersProps) {
  return (
    <SearchFilter
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      placeholder="Search income entries..."
      onRefresh={onRefresh}
      isFetching={isFetching}
      className="w-full md:w-64"
    />
  );
}
