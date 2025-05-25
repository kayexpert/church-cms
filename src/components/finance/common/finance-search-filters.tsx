"use client";

import React, { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  onRefresh?: () => void;
  isFetching?: boolean;
  className?: string;
}

/**
 * Basic search filter component
 */
export function SearchFilter({
  searchQuery,
  setSearchQuery,
  placeholder = "Search...",
  onRefresh,
  isFetching = false,
  className = "",
}: SearchFilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="h-9 px-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      )}
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  className?: string;
}

/**
 * Select filter component
 */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
  className = "",
}: FilterSelectProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface FinanceSearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  isFetching?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Combined search and filter component for finance lists
 */
export function FinanceSearchFilters({
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  onRefresh,
  isFetching = false,
  children,
  className = "",
}: FinanceSearchFiltersProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      <SearchFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder={searchPlaceholder}
        onRefresh={onRefresh}
        isFetching={isFetching}
        className="flex-1"
      />
      {children}
    </div>
  );
}
