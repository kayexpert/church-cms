"use client";

import React from "react";
import { formatDatabaseDate } from "@/lib/date-utils";
import { AlertCircle, Pencil, Trash2 } from "lucide-react";
import { ExpenditureEntry } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExpenditureTableRowProps {
  entry: ExpenditureEntry;
  onEdit: (entry: ExpenditureEntry) => void;
  onDelete: (entry: ExpenditureEntry) => void;
}

export function ExpenditureTableRow({
  entry,
  onEdit,
  onDelete
}: ExpenditureTableRowProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵'); // Replace the default "GH₵" with just "₵"
  };

  // Use our centralized date formatting utility

  return (
    <div
      className="flex items-center h-12 px-4 border-b hover:bg-muted/30 text-[13px]"
    >
      <div className="w-[110px] truncate whitespace-nowrap">
        {formatDatabaseDate(entry.date)}
      </div>
      <div className="w-[140px] truncate ml-2">
        {entry.liability_payment ? (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit text-xs">
            <AlertCircle className="h-3 w-3" />
            Liability
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-background hover:bg-muted text-xs">
            {entry.category?.name || "Uncategorized"}
          </Badge>
        )}
      </div>
      <div className="flex-1 min-w-[200px] truncate" title={entry.description || "-"}>
        {entry.description || "-"}
      </div>
      <div className="w-[120px] truncate" title={entry.recipient || "-"}>
        {entry.recipient || "-"}
      </div>
      <div className="w-[100px] text-right font-medium truncate">
        {formatCurrency(entry.amount)}
      </div>
      <div className="w-[100px] text-right">
        <div className="flex justify-end gap-1">
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
