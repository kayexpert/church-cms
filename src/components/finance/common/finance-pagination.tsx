"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FinancePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageNumbers?: boolean;
  maxPageButtons?: number;
}

export function FinancePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
  showPageNumbers = true,
  maxPageButtons = 5,
}: FinancePaginationProps) {
  // Calculate start and end indices for the current page
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    if (!showPageNumbers || totalPages <= 1) return [];
    
    // If total pages is less than or equal to max buttons, show all pages
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Otherwise, show a window of pages around the current page
    const halfWindow = Math.floor(maxPageButtons / 2);
    let startPage = Math.max(1, currentPage - halfWindow);
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn(
      "flex flex-col sm:flex-row justify-between items-center gap-4 px-2 py-3 border-t",
      className
    )}>
      <div className="text-[13px] text-muted-foreground">
        Showing <span className="font-medium">{totalItems > 0 ? startIndex + 1 : 0}</span> to{" "}
        <span className="font-medium">{endIndex}</span> of{" "}
        <span className="font-medium">{totalItems}</span> entries
      </div>
      
      <div className="flex items-center space-x-2">
        {/* First page button */}
        {showPageNumbers && totalPages > maxPageButtons && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="h-7 w-7 p-0"
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        
        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-7 w-7 p-0"
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Page number buttons */}
        {showPageNumbers && pageNumbers.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNumber)}
            className={cn(
              "h-7 w-7 p-0",
              pageNumber === currentPage && "pointer-events-none"
            )}
          >
            <span className="sr-only">Go to page {pageNumber}</span>
            {pageNumber}
          </Button>
        ))}
        
        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="h-7 w-7 p-0"
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Last page button */}
        {showPageNumbers && totalPages > maxPageButtons && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-7 w-7 p-0"
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
