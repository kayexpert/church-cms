"use client";

import { useState } from "react";
import { Account } from "@/types/finance";
import { formatCurrency } from "@/lib/format-currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountsTableProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onView: (account: Account) => void;
}

export function AccountsTable({ accounts, onEdit, onDelete, onView }: AccountsTableProps) {
  const [sortField, setSortField] = useState<keyof Account>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Sort accounts based on sort field and direction
  const sortedAccounts = [...accounts].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle special case for calculatedBalance
    if (sortField === "calculatedBalance") {
      aValue = a.calculatedBalance !== undefined ? a.calculatedBalance : (a.balance || 0);
      bValue = b.calculatedBalance !== undefined ? b.calculatedBalance : (b.balance || 0);
    }

    // Handle string comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Handle number comparison
    if (sortDirection === "asc") {
      return (aValue || 0) - (bValue || 0);
    } else {
      return (bValue || 0) - (aValue || 0);
    }
  });

  // Handle sort change
  const handleSort = (field: keyof Account) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get account type display name
  const getAccountTypeName = (type: string) => {
    switch (type) {
      case "cash":
        return "Cash";
      case "bank":
        return "Bank Account";
      case "mobile_money":
        return "Mobile Money";
      case "other":
        return "Other";
      default:
        return type;
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field: keyof Account) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-[200px] cursor-pointer"
                onClick={() => handleSort("name")}
              >
                Account Name{renderSortIndicator("name")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("account_type")}
              >
                Type{renderSortIndicator("account_type")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("account_number")}
              >
                Account Number{renderSortIndicator("account_number")}
              </TableHead>
              <TableHead>Provider</TableHead>
              <TableHead
                className=" cursor-pointer"
                onClick={() => handleSort("calculatedBalance")}
              >
                Balance{renderSortIndicator("calculatedBalance")}
              </TableHead>
              <TableHead className="w-[120px] ">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No accounts found
                </TableCell>
              </TableRow>
            ) : (
              sortedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {account.name}
                      {account.is_default && (
                        <Badge variant="outline" className="ml-2">
                          <Check className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getAccountTypeName(account.account_type)}</TableCell>
                  <TableCell>
                    {account.account_number ? (
                      <span className="text-sm">{account.account_number}</span>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.account_type !== "cash" && (
                      <div className="text-sm ">
                        {account.bank_name && <div>{account.bank_name}</div>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="">
                    <span
                      className={cn(
                        "font-medium",
                        (account.calculatedBalance !== undefined
                          ? account.calculatedBalance
                          : account.balance || 0) < 0
                          ? "text-destructive"
                          : ""
                      )}
                    >
                      {formatCurrency(
                        account.calculatedBalance !== undefined
                          ? account.calculatedBalance
                          : account.balance || 0
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(account)}
                        className="h-8 w-8 p-0"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(account)}
                        className="h-8 w-8 p-0 text-primary hover:text-primary/90 hover:bg-primary/10"
                        title="Edit Account"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(account)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        title="Delete Account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
