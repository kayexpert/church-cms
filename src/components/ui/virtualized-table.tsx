"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  width?: number | string;
}

interface VirtualizedTableProps<T> {
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
  rowHeight?: number;
  tableHeight?: number | string;
  overscan?: number;
}

export function VirtualizedTable<T extends Record<string, any>>({
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
  rowHeight = 48, // Default row height
  tableHeight = 400, // Default table height
  overscan = 5, // Number of items to render before/after the visible area
}: VirtualizedTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);

  // Update table width on resize
  useEffect(() => {
    if (!tableContainerRef.current) return;

    const updateWidth = () => {
      if (tableContainerRef.current) {
        setTableWidth(tableContainerRef.current.offsetWidth);
      }
    };

    // Initial width
    updateWidth();

    // Add resize listener
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // No need for virtualizer setup with react-window

  // Calculate column widths
  const getColumnWidth = useCallback(
    (column: Column<T>, index: number) => {
      if (column.width) {
        return typeof column.width === "number"
          ? `${column.width}px`
          : column.width;
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
            <TableRow>
              {columns.map((column, index) => (
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
                  style={{ width: getColumnWidth(column, index) }}
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
            <TableRow>
              <TableCell
                colSpan={columns.length + (actions ? 1 : 0)}
                className="h-24 text-center"
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
    <div className={cn("rounded-md border", className)}>
      <div
        ref={tableContainerRef}
        className="relative w-full overflow-auto"
        style={{
          height: tableHeight,
          maxHeight: typeof tableHeight === "number" ? `${tableHeight}px` : tableHeight,
        }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {columns.map((column, index) => (
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
                  style={{ width: getColumnWidth(column, index) }}
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
            <List
              height={typeof tableHeight === 'number' ? tableHeight - 40 : 400} // Subtract header height
              itemCount={data.length}
              itemSize={rowHeight}
              width="100%"
              itemData={{
                data,
                columns,
                keyField,
                onRowClick,
                actions,
                getColumnWidth
              }}
            >
              {({ index, style, data: listData }) => {
                const row = listData.data[index];
                return (
                  <TableRow
                    key={row[listData.keyField]}
                    className={cn(listData.onRowClick && "cursor-pointer")}
                    onClick={listData.onRowClick ? () => listData.onRowClick(row) : undefined}
                    style={{
                      ...style,
                      width: '100%',
                      display: 'flex',
                    }}
                  >
                    {listData.columns.map((column: Column<T>, columnIndex: number) => (
                      <TableCell
                        key={column.key}
                        className={column.className}
                        style={{
                          width: listData.getColumnWidth(column, columnIndex),
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </TableCell>
                    ))}
                    {listData.actions && (
                      <TableCell className="text-right" style={{ marginLeft: 'auto' }}>
                        {listData.actions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              }}
            </List>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
