"use client";

import React, { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface TransactionItem {
  id: string;
  date: string;
  amount: number;
  description: string;
  category?: {
    id: string;
    name: string;
  };
  [key: string]: any; // Allow for additional properties
}

interface VirtualizedTransactionListProps {
  title: string;
  transactions: TransactionItem[];
  emptyMessage?: string;
  onView?: (transaction: TransactionItem) => void;
  onEdit?: (transaction: TransactionItem) => void;
  onDelete?: (transaction: TransactionItem) => void;
  isIncome?: boolean;
  isLoading?: boolean;
  className?: string;
  maxHeight?: number;
}

export function VirtualizedTransactionList({
  title,
  transactions,
  emptyMessage = "No transactions found",
  onView,
  onEdit,
  onDelete,
  isIncome = false,
  isLoading = false,
  className,
  maxHeight = 500,
}: VirtualizedTransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentHeight, setParentHeight] = useState(maxHeight);

  // Update parent height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (parentRef.current) {
        const availableHeight = window.innerHeight * 0.7; // 70% of viewport height
        setParentHeight(Math.min(maxHeight, availableHeight));
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [maxHeight]);

  // Set up virtualizer
  const rowVirtualizer = useVirtualizer({
    count: isLoading ? 5 : transactions.length || 1, // Show at least one row for empty state
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5, // Number of items to render outside of the visible area
  });

  // Calculate total height
  const totalHeight = rowVirtualizer.getTotalSize();

  // Render loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={parentRef}
          className="overflow-auto border rounded-md"
          style={{ height: `${parentHeight}px` }}
        >
          <div
            className="relative w-full"
            style={{ height: `${totalHeight}px` }}
          >
            {transactions.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const transaction = transactions[virtualRow.index];

                // Handle case where we might have fewer transactions than virtual rows
                if (!transaction) return null;

                return (
                  <div
                    key={transaction.id}
                    className="absolute top-0 left-0 w-full border-b last:border-b-0"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="flex items-center justify-between p-4 h-full">
                      <div className="space-y-1">
                        <div className="font-medium">{formatDate(transaction.date)}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                          {transaction.description}
                        </div>
                        {transaction.category && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.category.name}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "font-medium",
                          isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {isIncome ? "+" : "-"}{formatCurrency(transaction.amount)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onView && (
                              <DropdownMenuItem onClick={() => onView(transaction)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(transaction)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => onDelete(transaction)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
