"use client";

import { memo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useAccountTransfers } from "@/hooks/use-account-transactions";
import { formatCurrency } from "@/lib/format-currency";
import { EditTransferDialog } from "./edit-transfer-dialog";
import { DeleteTransferDialog } from "./delete-transfer-dialog";
import { FinanceDataTable } from "@/components/finance/common/finance-data-table";

interface RecentTransfersProps {
  limit?: number;
  refreshTrigger?: number;
}

export const RecentTransfers = memo(function RecentTransfers({
  limit = 10,
  refreshTrigger
}: RecentTransfersProps) {
  // Use our custom hook to fetch recent transfers
  const { data: recentTransfers, isLoading } = useAccountTransfers({
    limit,
    refreshTrigger
  });

  // State for edit and delete dialogs
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  // Handle edit button click
  const handleEdit = (transfer: any) => {
    setSelectedTransfer(transfer);
    setShowEditDialog(true);
  };

  // Handle delete button click
  const handleDelete = (transfer: any) => {
    setSelectedTransfer(transfer);
    setShowDeleteDialog(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transfers</CardTitle>
        <CardDescription>Last {limit} transfers between accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <FinanceDataTable
          data={recentTransfers || []}
          keyField="id"
          isLoading={isLoading}
          loadingRows={3}
          emptyMessage="No transfers found."
          columns={[
            {
              key: "date",
              label: "DATE",
              primary: true,
              render: (_, row) => format(new Date(row.date), "MMM d, yyyy")
            },
            {
              key: "source",
              label: "FROM",
              primary: true,
              render: (_, row) => row.source_account.name
            },
            {
              key: "destination",
              label: "TO",
              primary: true,
              render: (_, row) => row.destination_account.name
            },
            {
              key: "description",
              label: "DESCRIPTION",
              truncate: true,
              render: (_, row) => row.description || "No description"
            },
            {
              key: "amount",
              label: "AMOUNT",
              primary: true,
              className: "text-right",
              render: (_, row) => formatCurrency(row.amount)
            }
          ]}
          actions={(row) => (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
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
                  handleDelete(row);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        />
      </CardContent>

      {/* Edit Transfer Dialog */}
      {showEditDialog && selectedTransfer && (
        <EditTransferDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          transfer={selectedTransfer}
        />
      )}

      {/* Delete Transfer Dialog */}
      {showDeleteDialog && selectedTransfer && (
        <DeleteTransferDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          transfer={selectedTransfer}
        />
      )}
    </Card>
  );
});
