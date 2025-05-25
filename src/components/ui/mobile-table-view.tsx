"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  primary?: boolean; // Mark as primary column for mobile view
}

interface MobileTableViewProps {
  data: any[];
  columns: Column[];
  keyField: string;
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function MobileTableView({
  data,
  columns,
  keyField,
  onRowClick,
  actions,
  emptyMessage = "No data available",
  className,
}: MobileTableViewProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Filter columns to show on mobile (primary columns)
  const primaryColumns = columns.filter((col) => col.primary === true || (!col.hideOnMobile && col.primary !== false));
  const secondaryColumns = columns.filter((col) => !primaryColumns.includes(col));

  return (
    <div className={cn("space-y-3 w-full", className)}>
      {data.map((row) => {
        const rowId = row[keyField];
        const isExpanded = expandedRows[rowId];

        return (
          <div
            key={rowId}
            className="border rounded-lg overflow-hidden bg-card w-full"
          >
            {/* Main row content - always visible */}
            <div
              className={cn(
                "p-3 flex items-center justify-between",
                onRowClick && "cursor-pointer"
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              <div className="flex-1 space-y-1">
                {/* Primary columns (always visible) */}
                {primaryColumns.map((column) => (
                  <div key={column.key} className="flex items-start justify-between mb-1.5">
                    <div className="text-xs font-medium text-muted-foreground min-w-[80px]">
                      {column.label}:
                    </div>
                    <div className={cn(
                      "text-sm font-medium ml-2 text-right max-w-[70%] break-words",
                      column.className,
                      column.key === "description" && "max-w-full text-left"
                    )}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] || "-"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-2">
                {/* Actions if provided */}
                {actions && actions(row)}

                {/* Expand/collapse button if there are secondary columns */}
                {secondaryColumns.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(rowId);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {isExpanded ? "Collapse" : "Expand"}
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Expandable section with secondary columns */}
            {isExpanded && secondaryColumns.length > 0 && (
              <div className="px-3 pb-3 pt-0 border-t bg-muted/10">
                <div className="space-y-3 mt-2">
                  {secondaryColumns.map((column) => (
                    <div key={column.key} className="flex flex-col">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {column.label}
                      </div>
                      <div className={cn("text-sm break-words max-w-full", column.className)}>
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
