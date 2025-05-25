"use client";

import { useState, useEffect, ReactNode } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown } from "lucide-react";

export interface FinanceTableColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  primary?: boolean; // Mark as primary column for mobile view
  sortable?: boolean;
  width?: number | string;
  truncate?: boolean; // Whether to truncate text with ellipsis
}

export interface FinanceDataTableProps {
  data: any[];
  columns: FinanceTableColumn[];
  keyField: string;
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  mobileBreakpoint?: number;
  isLoading?: boolean;
  loadingRows?: number;
}

export function FinanceDataTable({
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
  isLoading = false,
  loadingRows = 3,
}: FinanceDataTableProps) {
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

  // Calculate column widths
  const getColumnWidth = (column: FinanceTableColumn, index: number) => {
    if (column.width) {
      return typeof column.width === "number" ? `${column.width}px` : column.width;
    }
    return "auto";
  };

  // Prepare columns for mobile view
  const mobileColumns = columns.map(col => ({
    ...col,
    // If primary is not explicitly set, use !hideOnMobile as default
    primary: col.primary !== undefined ? col.primary : !col.hideOnMobile
  }));

  // Render loading state
  if (isLoading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-b hover:bg-transparent">
                {columns.map((column, index) => (
                  <TableHead
                    key={column.key}
                    className="py-2 px-4 text-xs font-medium text-muted-foreground"
                    style={{ width: getColumnWidth(column, index) }}
                  >
                    {column.label}
                  </TableHead>
                ))}
                {actions && <TableHead className="py-2 px-4 text-xs font-medium text-muted-foreground text-right">ACTIONS</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRows }).map((_, index) => (
                <TableRow key={index} className="animate-pulse">
                  {columns.map((column, colIndex) => (
                    <TableCell key={`${index}-${column.key}`} className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="py-3 px-4 text-right">
                      <div className="h-4 bg-muted rounded w-16 ml-auto"></div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // If we're on mobile, use the mobile table view
  if (isMobile) {
    return (
      <MobileTableView
        data={data}
        columns={mobileColumns}
        keyField={keyField}
        onRowClick={onRowClick}
        actions={actions}
        emptyMessage={emptyMessage}
        className={className}
      />
    );
  }

  // Render cell content with truncation if needed
  const renderCellContent = (column: FinanceTableColumn, value: any, row: any) => {
    const content = column.render ? column.render(value, row) : row[column.key];

    // If content is a string and truncation is enabled, add tooltip
    if (column.truncate && typeof content === 'string' && content.length > 30) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate max-w-[400px]">{content}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-md">{content}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  // Otherwise, use the regular table
  return (
    <div className={cn("rounded-md border", className)}>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50">
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
                  <div className="flex items-center gap-1">
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
                <TableHead className="py-2 px-4 text-xs font-medium text-muted-foreground text-right w-[100px]">
                  ACTIONS
                </TableHead>
              )}
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
                  className={cn(
                    "border-b hover:bg-muted/30",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "py-3 px-4 text-[13px]",
                        column.className
                      )}
                    >
                      {renderCellContent(column, row[column.key], row)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="py-3 px-4 text-[13px] text-right">
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
