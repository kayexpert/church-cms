"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Account } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpDown, RefreshCw } from "lucide-react";
import { AccountDetailsDialog } from "./account-details-dialog";
import { toast } from "sonner";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/format-currency";
import { BalanceCard } from "@/components/finance/common/finance-card";
import { AccountBalancesSkeleton } from "@/components/finance";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface AccountBalancesProps {
  refreshTrigger?: number;
}

export function AccountBalances({ refreshTrigger }: AccountBalancesProps) {
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<"name" | "balance">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use our custom hook to fetch accounts
  const { data: accounts, isLoading, error } = useAccounts({
    sortField,
    sortDirection,
    refreshInterval: 30000
  });

  // Force refresh when component mounts, when tab becomes visible, or when refreshTrigger changes
  useEffect(() => {
    // Invalidate and refetch account queries
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.refetchQueries({ queryKey: ["accounts"] });

    // Set up visibility change listener to refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.refetchQueries({ queryKey: ["accounts"] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, refreshTrigger]);

  // Function to handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.refetchQueries({ queryKey: ["accounts"] })
      .then(() => {
        setIsRefreshing(false);
        toast.success("Account balances refreshed");
      })
      .catch(() => {
        setIsRefreshing(false);
        toast.error("Failed to refresh account balances");
      });
  };

  // Handle sort toggle
  const toggleSort = (field: "name" | "balance") => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // No need for formatCurrency function as we're importing it

  // Handle view account details
  const handleViewAccount = (account: Account) => {
    // Invalidate queries to ensure fresh data when opening the dialog
    queryClient.invalidateQueries({ queryKey: ["accountTransactions", account.id] });

    // Set the selected account and show the dialog
    setSelectedAccount(account);
    setShowDetailsDialog(true);
  };

  // Loading state
  if (isLoading) {
    return <AccountBalancesSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-800">
        <h3 className="font-semibold">Error loading accounts</h3>
        <p>{error instanceof Error ? error.message : "Unknown error occurred"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Account Balances</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort("name")}
            className="flex items-center gap-1"
          >
            Name
            {sortField === "name" && (
              <ArrowUpDown className={`h-4 w-4 ${sortDirection === "asc" ? "rotate-0" : "rotate-180"}`} />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort("balance")}
            className="flex items-center gap-1"
          >
            Balance
            {sortField === "balance" && (
              <ArrowUpDown className={`h-4 w-4 ${sortDirection === "asc" ? "rotate-0" : "rotate-180"}`} />
            )}
          </Button>
        </div>
      </div>

      {accounts && accounts.length === 0 ? (
        <div className="text-center p-8 border rounded-md">
          <p className="text-muted-foreground">No accounts found. Add accounts in the Finance Settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts?.map((account) => (
            <BalanceCard
              key={account.id}
              title={account.name}
              description={`${account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}${account.is_default ? " (Default)" : ""}`}
              balance={account.calculatedBalance !== undefined ? account.calculatedBalance : (account.balance || 0)}
              onViewDetails={() => handleViewAccount(account)}
              viewDetailsLabel="View Details"
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}

      {/* Account Details Dialog */}
      {selectedAccount && (
        <AccountDetailsDialog
          account={selectedAccount}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}
    </div>
  );
}
