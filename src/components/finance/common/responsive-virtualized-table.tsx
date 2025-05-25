"use client";

import { useRef, useEffect, useState, useCallback, memo } from "react";
import { FixedSizeList as List } from "react-window";
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
import { ArrowUpDown } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  primary?: boolean;
  sortable?: boolean;
  width?: number | string;
  truncate?: boolean;
}

interface ResponsiveVirtualizedTableProps<T> {
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
  mobileBreakpoint?: number;
  isLoading?: boolean;
  loadingRows?: number;
}

// Custom row component to avoid HTML nesting issues
const VirtualRow = memo(function VirtualRow<T>({
  item,
  columns,
  keyField,
  onRowClick,
  actions,
  getColumnWidth,
  style,
}: {
  item: T;
  columns: Column<T>[];
  keyField: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  getColumnWidth: (column: Column<T>, index: number) => string | number;
  style: React.CSSProperties;
}) {
  return (
    <div
      className={cn("border-b hover:bg-muted/30 flex items-center", onRowClick && "cursor-pointer")}
      onClick={onRowClick ? () => onRowClick(item) : undefined}
      style={{
        ...style,
        width: "100%",
      }}
    >
      {columns.map((column, columnIndex) => (
        <div
          key={column.key}
          className={cn(
            "py-2 px-4 flex items-center",
            column.className,
            column.truncate && "truncate"
          )}
          style={{
            width: getColumnWidth(column, columnIndex),
            maxWidth: getColumnWidth(column, columnIndex),
          }}
        >
          {column.render ? column.render(item[column.key], item) : item[column.key]}
        </div>
      ))}
      {actions && (
        <div className="py-2 px-4 text-right ml-auto">
          {actions(item)}
        </div>
      )}
    </div>
  );
});

// Row component for virtualized list
const VirtualizedRow = memo(function VirtualizedRow<T extends Record<string, any>>({
  data,
  index,
  style,
}: {
  data: {
    items: T[];
    columns: Column<T>[];
    keyField: string;
    onRowClick?: (row: T) => void;
    actions?: (row: T) => React.ReactNode;
    getColumnWidth: (column: Column<T>, index: number) => string | number;
  };
  index: number;
  style: React.CSSProperties;
}) {
  const { items, columns, keyField, onRowClick, actions, getColumnWidth } = data;
  const row = items[index];

  return (
    <VirtualRow
      item={row}
      columns={columns}
      keyField={keyField}
      onRowClick={onRowClick}
      actions={actions}
      getColumnWidth={getColumnWidth}
      style={style}
    />
  );
});

export function ResponsiveVirtualizedTable<T extends Record<string, any>>({
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
  rowHeight = 48,
  tableHeight = 400,
  overscan = 5,
  mobileBreakpoint = 768,
  isLoading = false,
  loadingRows = 3,
}: ResponsiveVirtualizedTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Update table width on resize and check mobile
  useEffect(() => {
    const updateWidthAndCheckMobile = () => {
      if (tableContainerRef.current) {
        setTableWidth(tableContainerRef.current.offsetWidth);
      }
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    // Initial check
    updateWidthAndCheckMobile();

    // Add resize listener
    window.addEventListener("resize", updateWidthAndCheckMobile);
    return () => window.removeEventListener("resize", updateWidthAndCheckMobile);
  }, [mobileBreakpoint]);

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

  // Prepare columns for mobile view
  const mobileColumns = columns.map(col => ({
    ...col,
    // If primary is not explicitly set, use !hideOnMobile as default
    primary: col.primary !== undefined ? col.primary : !col.hideOnMobile
  }));

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

  // If no data, show empty message
  if (data.length === 0 && !isLoading) {
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

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={column.key}
                  style={{ width: getColumnWidth(column, index) }}
                >
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-[100px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map((_, index) => (
              <TableRow key={`loading-${index}`}>
                {columns.map((column, colIndex) => (
                  <TableCell key={`loading-${index}-${colIndex}`}>
                    <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                  </TableCell>
                ))}
                {actions && (
                  <TableCell>
                    <div className="h-8 w-16 bg-muted rounded animate-pulse ml-auto"></div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <div
        ref={tableContainerRef}
        className="relative w-full overflow-hidden"
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
              {actions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
        </Table>

        <div className="overflow-y-auto" style={{ height: `calc(100% - 40px)` }}>
          <List
            height={typeof tableHeight === 'number' ? tableHeight - 40 : 400} // Subtract header height
            itemCount={data.length}
            itemSize={rowHeight}
            width="100%"
            overscanCount={overscan}
            itemData={{
              items: data,
              columns,
              keyField,
              onRowClick,
              actions,
              getColumnWidth
            }}
          >
            {VirtualizedRow}
          </List>
        </div>
      </div>
    </div>
  );
}
