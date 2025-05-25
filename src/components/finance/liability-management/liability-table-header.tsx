"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";

interface LiabilityTableHeaderProps {
  sortColumn: string;
  handleSort: (column: string) => void;
}

export function LiabilityTableHeader({
  sortColumn,
  handleSort
}: LiabilityTableHeaderProps) {
  return (
    <div className="sticky top-0 bg-muted z-10 border-b">
      <div className="flex items-center h-10 px-4 text-[11px] font-medium text-muted-foreground">
        <div
          className="w-[120px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          onClick={() => handleSort("date")}
        >
          DATE
          {sortColumn === "date" && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </div>
        <div className="w-[130px] flex items-center gap-1 cursor-pointer whitespace-nowrap">
          CREDITOR
        </div>

        <div className="flex-1 min-w-[220px]">
          DETAILS
        </div>

        <div
          className="w-[120px] gap-1 cursor-pointer whitespace-nowrap"
          onClick={() => handleSort("total_amount")}
        >
          TOTAL
          {sortColumn === "total_amount" && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </div>
        <div
          className="w-[120px] gap-1 cursor-pointer whitespace-nowrap"
          onClick={() => handleSort("amount_remaining")}
        >
          REMAINING
          {sortColumn === "amount_remaining" && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </div>
        <div
          className="w-[90px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          onClick={() => handleSort("status")}
        >
          STATUS
          {sortColumn === "status" && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </div>
        <div className="w-[100px] text-center">
          ACTIONS
        </div>
      </div>
    </div>
  );
}
