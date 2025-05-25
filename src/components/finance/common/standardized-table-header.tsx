"use client";

import { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StandardizedTableHeaderProps {
  columns: {
    key: string;
    label: string;
    width?: string | number;
    className?: string;
    sortable?: boolean;
    align?: "left" | "center" | "right";
  }[];
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  showActions?: boolean;
}

export function StandardizedTableHeader({
  columns,
  sortColumn,
  sortDirection = "asc",
  onSort,
  showActions = true,
}: StandardizedTableHeaderProps) {
  return (
    <div className="sticky top-0 bg-muted/50 z-10 border-b">
      <div className="flex items-center h-10 px-4 text-xs font-medium text-muted-foreground">
        {columns.map((column) => {
          // Calculate width style
          const widthStyle: { width?: string } = {};
          if (column.width) {
            widthStyle.width = typeof column.width === "number" 
              ? `${column.width}px` 
              : column.width;
          }

          return (
            <div
              key={column.key}
              className={cn(
                "flex items-center gap-1",
                column.sortable && "cursor-pointer hover:bg-muted/70",
                column.align === "right" && "justify-end",
                column.align === "center" && "justify-center",
                column.className
              )}
              style={widthStyle}
              onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
            >
              {column.label}
              {column.sortable && (
                <ArrowUpDown 
                  className={cn(
                    "h-3 w-3 text-muted-foreground/70",
                    sortColumn === column.key && "text-foreground"
                  )} 
                />
              )}
            </div>
          );
        })}
        
        {showActions && (
          <div className="w-[120px] text-right">ACTIONS</div>
        )}
      </div>
    </div>
  );
}

interface StandardizedTableRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function StandardizedTableRow({
  children,
  onClick,
  className,
}: StandardizedTableRowProps) {
  return (
    <div
      className={cn(
        "flex items-center h-12 px-4 border-b hover:bg-muted/30",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StandardizedTableCellProps {
  children: ReactNode;
  width?: string | number;
  className?: string;
  align?: "left" | "center" | "right";
}

export function StandardizedTableCell({
  children,
  width,
  className,
  align = "left",
}: StandardizedTableCellProps) {
  // Calculate width style
  const widthStyle: { width?: string } = {};
  if (width) {
    widthStyle.width = typeof width === "number" ? `${width}px` : width;
  }

  return (
    <div
      className={cn(
        "truncate",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      style={widthStyle}
    >
      {children}
    </div>
  );
}

export function StandardizedTableEmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
