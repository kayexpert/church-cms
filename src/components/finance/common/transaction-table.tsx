"use client";

import { memo, useMemo } from "react";
import { formatDatabaseDate } from "@/lib/date-utils";
import { AccountTransaction } from "@/types/finance";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from "lucide-react";
import { ResponsiveVirtualizedTable } from "@/components/finance/common/responsive-virtualized-table";

interface TransactionTableProps {
  transactions: AccountTransaction[];
  isLoading?: boolean;
  emptyMessage?: string;
  formatCurrency?: (amount: number) => string;
  className?: string;
}

/**
 * Reusable transaction table component
 */
export const TransactionTable = memo(function TransactionTable({
  transactions,
  isLoading = false,
  emptyMessage = "No transactions found",
  formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵');
  },
  className
}: TransactionTableProps) {
  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowDownToLine className="h-4 w-4 text-green-500" />;
      case "expenditure":
        return <ArrowUpFromLine className="h-4 w-4 text-red-500" />;
      case "transfer_in":
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      case "transfer_out":
        return <ArrowLeftRight className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  // Get transaction badge based on type
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "income":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Income</Badge>;
      case "expenditure":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Expenditure</Badge>;
      case "transfer_in":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Transfer In</Badge>;
      case "transfer_out":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Transfer Out</Badge>;
      default:
        return null;
    }
  };

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    {
      key: "date",
      label: "DATE",
      primary: true,
      width: 120,
      render: (_, row) => formatDatabaseDate(row.date)
    },
    {
      key: "type",
      label: "TYPE",
      primary: true,
      width: 150,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {getTransactionIcon(row.transaction_type)}
          {getTransactionBadge(row.transaction_type)}
        </div>
      )
    },
    {
      key: "description",
      label: "DESCRIPTION",
      truncate: true,
      width: "40%",
      primary: false, // Not primary on mobile to save space
      render: (_, row) => row.description || "No description"
    },
    {
      key: "amount",
      label: "AMOUNT",
      primary: true,
      width: 120,
      className: (row) => `text-right font-medium ${
        row.transaction_type === "expenditure" || row.transaction_type === "transfer_out"
          ? "text-red-600"
          : "text-green-600"
      }`,
      render: (_, row) => formatCurrency(Math.abs(row.amount))
    }
  ], [formatCurrency]);

  return (
    <ResponsiveVirtualizedTable
      data={transactions}
      keyField="id"
      isLoading={isLoading}
      loadingRows={4}
      emptyMessage={emptyMessage}
      className={className}
      mobileBreakpoint={768} // Ensure mobile view kicks in at appropriate size
      columns={columns}
      tableHeight={400} // Set a fixed height for the table
      rowHeight={56} // Set a fixed height for each row
      overscan={5} // Number of items to render before/after the visible area
    />
  );
});
