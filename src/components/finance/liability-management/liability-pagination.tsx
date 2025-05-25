"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiabilityPaginationProps {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function LiabilityPagination({
  page,
  setPage,
  totalPages,
  totalCount,
  pageSize
}: LiabilityPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 py-3 border-t">
      <div className="text-[13px] text-muted-foreground">
        Showing <span className="font-medium">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
        <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> of{" "}
        <span className="font-medium">{totalCount}</span> entries
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-7 w-7 p-0"
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center justify-center text-[13px] font-medium">
          Page {page} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || totalPages === 0}
          className="h-7 w-7 p-0"
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
