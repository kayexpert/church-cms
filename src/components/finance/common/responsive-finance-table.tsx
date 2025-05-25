"use client";

import { useState, useEffect, ReactNode } from "react";
import { MobileTableView } from "@/components/ui/mobile-table-view";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  primary?: boolean; // Mark as primary column for mobile view
}

interface ResponsiveFinanceTableProps {
  data: any[];
  columns: Column[];
  keyField: string;
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  mobileBreakpoint?: number;
  desktopHeader?: ReactNode;
  desktopRow?: (row: any) => ReactNode;
}

export function ResponsiveFinanceTable({
  data,
  columns,
  keyField,
  onRowClick,
  actions,
  emptyMessage = "No data available",
  className,
  mobileBreakpoint = 768, // Default to md breakpoint
  desktopHeader,
  desktopRow,
}: ResponsiveFinanceTableProps) {
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

  // Otherwise, use the desktop view with custom header and rows
  return (
    <div className={cn("w-full", className)}>
      {desktopHeader}
      <div className="w-full">
        {data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          data.map((row) => desktopRow ? desktopRow(row) : null)
        )}
      </div>
    </div>
  );
}
