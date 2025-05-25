"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Asset, ExtendedAsset } from "@/types/assets";
import { formatDatabaseDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format-currency";
import { Pencil, Trash2, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssetTypes } from "@/hooks/use-assets";
import { DeleteConfirmationDialog } from "@/components/finance/common/delete-confirmation-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetListProps {
  assets: ExtendedAsset[];
  onEdit: (asset: ExtendedAsset) => void;
  onDelete: (asset: ExtendedAsset) => void;
  onView?: (asset: ExtendedAsset) => void;
  onDispose?: (asset: ExtendedAsset) => void;
  count: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onTypeFilter: (typeId: string) => void;
  onStatusFilter: (status: string) => void;
}

export function AssetList({
  assets,
  onEdit,
  onDelete,
  onView,
  onDispose,
  count,
  page,
  pageSize,
  onPageChange,
  onSearch,
  onTypeFilter,
  onStatusFilter,
}: AssetListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [assetToDelete, setAssetToDelete] = useState<ExtendedAsset | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const { data: assetTypes } = useAssetTypes();

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Apply debounced search
  React.useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  // Get status badge color
  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "in_repair":
        return <Badge variant="secondary">In Repair</Badge>;
      case "disposed":
        return <Badge variant="destructive">Disposed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(count / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(startItem + pageSize - 1, count);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Asset List</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full sm:max-w-xs"
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select onValueChange={onTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {assetTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={onStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in_repair">In Repair</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            data={assets}
            keyField="id"
            onRowClick={onView ? (row) => onView(row) : undefined}
            emptyMessage="No assets found"
            columns={[
              {
                key: "name",
                label: "Asset Name",
                render: (value) => <span className="font-medium">{value}</span>
              },
              {
                key: "asset_types",
                label: "Type",
                render: (value) => value?.name || "Unknown"
              },
              {
                key: "acquisition_date",
                label: "Acquisition Date",
                render: (value) => formatDatabaseDate(value)
              },
              {
                key: "acquisition_value",
                label: "Value",
                render: (value) => formatCurrency(value)
              },
              {
                key: "status",
                label: "Status",
                render: (value) => getStatusBadge(value)
              }
            ]}
            actions={(asset) => (
              <div className="flex justify-end gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView && onView(asset)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Details</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(asset)}
                        disabled={asset.status === "disposed"}
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
                        onClick={() => setAssetToDelete(asset)}
                        disabled={asset.status === "disposed"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {onDispose && asset.status !== "disposed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDispose(asset)}
                  >
                    Dispose
                  </Button>
                )}
              </div>
            )}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {startItem} to {endItem} of {count} assets
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
        isOpen={!!assetToDelete}
        onCancel={() => setAssetToDelete(null)}
        onConfirm={() => {
          if (assetToDelete) {
            onDelete(assetToDelete);
            setAssetToDelete(null);
          }
        }}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This action cannot be undone."
      />
    </>
  );
}
