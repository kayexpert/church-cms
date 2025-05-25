"use client";

import React from "react";
import { formatDatabaseDate } from "@/lib/date-utils";
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { LiabilityEntry } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LiabilityTableRowProps {
  entry: LiabilityEntry;
  onEdit: (entry: LiabilityEntry) => void;
  onDelete: (entry: LiabilityEntry) => void;
  onMakePayment: (entry: LiabilityEntry) => void;
}

export function LiabilityTableRow({
  entry,
  onEdit,
  onDelete,
  onMakePayment
}: LiabilityTableRowProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵'); // Replace the default "GH₵" with just "₵"
  };

  // Use our centralized date formatting utility

  // Render status badge
  const renderStatus = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Partial</Badge>;
      case "unpaid":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Only show make payment button for unpaid or partial liabilities
  const canMakePayment = entry.status === "unpaid" || entry.status === "partial";

  return (
    <div
      className="flex items-center h-12 px-4 border-b hover:bg-muted/30 text-[13px]"
    >
      <div className="w-[120px] truncate whitespace-nowrap">
        {formatDatabaseDate(entry.date)}
      </div>
      <div className="w-[130px] truncate ml-2" title={entry.creditor_name}>
        {entry.creditor_name}
      </div>

      <div className="flex-1 min-w-[220px] truncate" title={entry.details || "-"}>
        {entry.details || "-"}
      </div>

      <div className="w-[120px] font-medium truncate">
        {formatCurrency(entry.total_amount)}
      </div>
      <div className="w-[120px]  font-medium truncate">
        {formatCurrency(entry.amount_remaining)}
      </div>
      <div className="w-[90px] truncate mx-1">
        {renderStatus(entry.status)}
      </div>
      <div className="w-[100px] ">
        <div className="flex justify-end gap-1">
          {canMakePayment && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onMakePayment(entry);
              }}
              title="Make Payment"
            >
              <CreditCard className="h-3.5 w-3.5 text-blue-600" />
              <span className="sr-only">Make Payment</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-green-600" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
