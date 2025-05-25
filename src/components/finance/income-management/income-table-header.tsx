"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";

interface IncomeTableHeaderProps {
  sortColumn: string;
  handleSort: (column: string) => void;
}

export function IncomeTableHeader({ sortColumn, handleSort }: IncomeTableHeaderProps) {
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
        <div
          className="w-[150px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          onClick={() => handleSort("category")}
        >
          CATEGORY
          {sortColumn === "category" && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </div>
        <div className="flex-1 min-w-[200px] hidden md:block">DESCRIPTION</div>
        <div
          className="w-[120px] text-right flex items-center justify-end gap-1 cursor-pointer whitespace-nowrap"
          onClick={() => handleSort("amount")}
        >
          AMOUNT
          {sortColumn === "amount" && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </div>
        <div className="w-[100px] text-right">ACTIONS</div>
      </div>
    </div>
  );
}
