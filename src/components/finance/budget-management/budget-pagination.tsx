"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BudgetPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  setCurrentPage: (page: number) => void;
}

export function BudgetPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  setCurrentPage
}: BudgetPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 py-3 border-t">
      <div className="text-[13px] text-muted-foreground">
        Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
        <span className="font-medium">{endIndex}</span> of{" "}
        <span className="font-medium">{totalItems}</span> entries
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-7 w-7 p-0"
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center justify-center text-[13px] font-medium">
          Page {currentPage} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="h-7 w-7 p-0"
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
