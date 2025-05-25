"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { ExtendedAssetDisposal } from "@/types/assets";
import { formatDatabaseDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format-currency";
import { Eye, Trash2, AlertCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { DeleteConfirmationDialog } from "@/components/finance/common/delete-confirmation-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetDisposalListProps {
  disposals: ExtendedAssetDisposal[];
  onDelete: (disposal: ExtendedAssetDisposal) => void;
  onEdit: (disposal: ExtendedAssetDisposal) => void;
  onViewEntry?: (disposal: ExtendedAssetDisposal) => void;
  count: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
}

export function AssetDisposalList({
  disposals,
  onDelete,
  onEdit,
  onViewEntry,
  count,
  page,
  pageSize,
  onPageChange,
  onSearch,
}: AssetDisposalListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [disposalToDelete, setDisposalToDelete] = useState<ExtendedAssetDisposal | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Apply debounced search
  React.useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  // Calculate pagination
  const totalPages = Math.ceil(count / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(startItem + pageSize - 1, count);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Disposed Assets</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Input
              placeholder="Search disposals..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full sm:max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            data={disposals}
            keyField="id"
            emptyMessage={
              <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No disposed assets found</p>
              </div>
            }
            columns={[
              {
                key: "assets",
                label: "Asset Name",
                primary: true,
                render: (value) => <span className="font-medium">{value?.name || "Unknown Asset"}</span>
              },
              {
                key: "disposal_date",
                label: "Disposal Date",
                primary: true,
                render: (value) => formatDatabaseDate(value)
              },
              {
                key: "disposal_amount",
                label: "Amount",
                render: (value) => formatCurrency(value)
              },
              {
                key: "accounts",
                label: "Account",
                render: (value) => value?.name || "Unknown Account"
              }
            ]}
            actions={(disposal) => (
              <div className="flex justify-end gap-2">
                {onViewEntry && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewEntry(disposal)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Income Entry</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(disposal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDisposalToDelete(disposal)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {startItem} to {endItem} of {count} disposals
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span className="sr-only sm:not-sr-only">Previous</span>
                  <span className="sm:hidden">←</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <span className="sr-only sm:not-sr-only">Next</span>
                  <span className="sm:hidden">→</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!disposalToDelete}
        onClose={() => setDisposalToDelete(null)}
        onConfirm={() => {
          if (disposalToDelete) {
            onDelete(disposalToDelete);
            setDisposalToDelete(null);
          }
        }}
        title="Delete Asset Disposal"
        description={
          disposalToDelete
            ? `Are you sure you want to delete the disposal of "${disposalToDelete.assets?.name || 'Unknown Asset'}"?
               This will also delete the associated income entry and revert the asset status to active.

               Disposal Date: ${formatDatabaseDate(disposalToDelete.disposal_date)}
               Disposal Amount: ${formatCurrency(disposalToDelete.disposal_amount)}
               Account: ${disposalToDelete.accounts?.name || 'Unknown Account'}`
            : "Are you sure you want to delete this asset disposal? This will also delete the associated income entry and revert the asset status to active."
        }
      />
    </>
  );
}
