"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileTableView } from "@/components/ui/mobile-table-view";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
}

interface ResponsiveTableProps {
  data: any[];
  columns: Column[];
  keyField: string;
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  mobileBreakpoint?: number;
}

export function ResponsiveTable({
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
  mobileBreakpoint = 768, // Default to md breakpoint
}: ResponsiveTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on the client side before accessing window
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, [mobileBreakpoint]);

  // If we're on mobile, use the mobile table view
  if (isMobile) {
    return (
      <MobileTableView
        data={data}
        columns={columns}
        keyField={keyField}
        onRowClick={onRowClick}
        actions={actions}
        emptyMessage={emptyMessage}
        className={className}
      />
    );
  }

  // Otherwise, use the regular table
  return (
    <div className={cn("rounded-md border", className)}>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.className,
                    column.sortable && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={
                    column.sortable && onSort
                      ? () => onSort(column.key)
                      : undefined
                  }
                >
                  <div className="flex items-center">
                    {column.label}
                    {sortColumn === column.key && (
                      <span className="ml-1">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row[keyField]}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right">
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
