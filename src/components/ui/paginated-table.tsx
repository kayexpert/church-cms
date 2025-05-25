"use client";

import { useCallback, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  width?: number | string;
}

interface PaginatedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  // Pagination props
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Memoized table row component to prevent unnecessary re-renders
const TableRowMemo = memo(function TableRowMemo<T extends Record<string, any>>({
  row,
  columns,
  keyField,
  onRowClick,
  actions,
  getColumnWidth,
}: {
  row: T;
  columns: Column<T>[];
  keyField: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  getColumnWidth: (column: Column<T>, index: number) => string | number;
}) {
  return (
    <TableRow
      key={row[keyField]}
      className={cn("border-b hover:bg-muted/30 h-12", onRowClick && "cursor-pointer")}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
    >
      {columns.map((column, columnIndex) => (
        <TableCell
          key={column.key}
          className={cn("py-2 px-4", column.className)}
          style={{ width: getColumnWidth(column, columnIndex) }}
        >
          <div className="truncate max-w-full" title={typeof row[column.key] === 'string' ? row[column.key] : undefined}>
            {column.render ? column.render(row[column.key], row) : row[column.key]}
          </div>
        </TableCell>
      ))}
      {actions && (
        <TableCell className="py-2 px-4 text-right">
          {actions(row)}
        </TableCell>
      )}
    </TableRow>
  );
});

// Memoized table component to prevent unnecessary re-renders
const PaginatedTableComponent = function PaginatedTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onRowClick,
  actions,
  emptyMessage = "No data available",
  className,
  sortColumn,
  sortDirection = "asc",
  onSort,
  // Pagination props
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: PaginatedTableProps<T>) {
  // Calculate column widths
  const getColumnWidth = useCallback(
    (column: Column<T>, index: number) => {
      if (column.width) {
        return typeof column.width === "number" ? `${column.width}px` : column.width;
      }

      // Default widths
      const totalColumns = columns.length + (actions ? 1 : 0);
      const defaultWidth = `${100 / totalColumns}%`;

      // Special case for action column
      if (actions && index === columns.length) {
        return "100px";
      }

      return defaultWidth;
    },
    [columns, actions]
  );

  // If no data, show empty message
  if (data.length === 0) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column, index) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "py-2 px-4 text-xs font-medium text-muted-foreground",
                    column.className,
                    column.sortable && "cursor-pointer hover:bg-muted/70"
                  )}
                  onClick={
                    column.sortable && onSort
                      ? () => onSort(column.key)
                      : undefined
                  }
                  style={{ width: getColumnWidth(column, index) }}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    {column.label}
                    {column.sortable && (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/70" />
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && (
                <TableHead className="py-2 px-4 text-[11px] font-medium text-muted-foreground text-right w-[100px]">
                  ACTIONS
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={columns.length + (actions ? 1 : 0)}
                className="h-24 text-center text-xs text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn("rounded-md border", className)}>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50">
              <TableRow className="border-b hover:bg-transparent">
                {columns.map((column, index) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "py-2 px-4 text-xs font-medium text-muted-foreground",
                      column.className,
                      column.sortable && "cursor-pointer hover:bg-muted/70"
                    )}
                    onClick={
                      column.sortable && onSort
                        ? () => onSort(column.key)
                        : undefined
                    }
                    style={{ width: getColumnWidth(column, index) }}
                  >
                    <div className="flex items-center gap-1 text-[11px]">
                      {column.label}
                      {column.sortable && (
                        <ArrowUpDown className={cn(
                          "h-3 w-3 text-muted-foreground/70",
                          sortColumn === column.key && "text-foreground"
                        )} />
                      )}
                    </div>
                  </TableHead>
                ))}
                {actions && (
                  <TableHead className="py-2 px-4 text-[11px] font-medium text-muted-foreground text-right w-[100px]">
                    ACTIONS
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRowMemo
                  key={row[keyField]}
                  row={row}
                  columns={columns}
                  keyField={keyField}
                  onRowClick={onRowClick}
                  actions={actions}
                  getColumnWidth={getColumnWidth}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
        <div className="text-[11px] text-muted-foreground">
          Showing <span className="font-medium">{data.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-medium">{Math.min(page * pageSize, totalItems)}</span> of{" "}
          <span className="font-medium">{totalItems}</span> entries
        </div>

        {totalItems > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(page - 1, 1))}
              disabled={page === 1}
              className="h-7 w-7 p-0"
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center justify-center text-[11px] font-medium">
              Page {page} of {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(page + 1, totalPages))}
              disabled={page === totalPages || totalPages === 0}
              className="h-7 w-7 p-0"
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Export memoized version
export const PaginatedTable = memo(PaginatedTableComponent) as typeof PaginatedTableComponent;