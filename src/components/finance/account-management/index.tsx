"use client";

import { useState, useEffect, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountBalances } from "./account-balances";
import { AccountTransfers } from "./account-transfers";
import { AccountManagementSkeleton, AccountBalancesSkeleton, AccountTransfersSkeleton } from "@/components/finance";
import { useAccounts } from "@/hooks/use-accounts";
import { useQueryClient } from "@tanstack/react-query";

export function AccountManagement() {
  const [activeTab, setActiveTab] = useState("balances");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const queryClient = useQueryClient();
  const { isLoading } = useAccounts();

  // Effect to refresh data when tab changes
  useEffect(() => {
    // Invalidate and refetch accounts data when tab changes
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.refetchQueries({ queryKey: ["accounts"] });
  }, [activeTab, queryClient]);

  // Handle tab change with refresh
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setRefreshTrigger(prev => prev + 1);
  };

  // Show skeleton while initial data is loading
  if (isLoading) {
    return <AccountManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="balances"
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="balances">Account Balances</TabsTrigger>
          <TabsTrigger value="transfers">Inter-Account Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-6">
          <Suspense key={`balances-${refreshTrigger}`} fallback={<AccountBalancesSkeleton />}>
            <AccountBalances refreshTrigger={refreshTrigger} />
          </Suspense>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <Suspense key={`transfers-${refreshTrigger}`} fallback={<AccountTransfersSkeleton />}>
            <AccountTransfers refreshTrigger={refreshTrigger} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
