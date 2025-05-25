"use client";

import React, { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinanceListContainerProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  headerContent?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

/**
 * A reusable container for finance lists with consistent styling and behavior
 */
export function FinanceListContainer({
  title,
  description,
  icon,
  children,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
  headerContent,
  emptyState,
  className = "",
}: FinanceListContainerProps) {
  // Default empty state
  const defaultEmptyState = (
    <div className="text-center py-8 border rounded-md">
      <p className="text-muted-foreground">No items found</p>
    </div>
  );

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              {icon && <div className="p-2 rounded-lg">{icon}</div>}
              <span>{title}</span>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerContent}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          children || emptyState || defaultEmptyState
        )}
      </CardContent>
    </Card>
  );
}

/**
 * A reusable container for finance tables with consistent styling
 */
export function FinanceTableContainer({
  children,
  emptyState,
  isLoading = false,
  maxHeight,
}: {
  children: ReactNode;
  emptyState?: ReactNode;
  isLoading?: boolean;
  maxHeight?: number;
}) {
  // Default empty state
  const defaultEmptyState = (
    <div className="text-center py-8">
      <p className="text-muted-foreground">No items found</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <div
        className="overflow-x-auto"
        style={maxHeight ? { maxHeight: `${maxHeight}px`, overflowY: 'auto' } : undefined}
      >
        {children || emptyState || defaultEmptyState}
      </div>
    </div>
  );
}
