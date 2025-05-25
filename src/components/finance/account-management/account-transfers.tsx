"use client";

import { useState } from "react";
import { AccountTransfersForm } from "./account-transfers-form";
import { RecentTransfers } from "./recent-transfers";
import { AccountTransfersSkeleton } from "@/components/finance";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountTransfers } from "@/hooks/use-account-transactions";

interface AccountTransfersProps {
  refreshTrigger?: number;
}

export function AccountTransfers({ refreshTrigger }: AccountTransfersProps) {
  // Use hooks to check loading state
  const { isLoading: isLoadingAccounts } = useAccounts();
  const { isLoading: isLoadingTransfers } = useAccountTransfers({
    limit: 10,
    refreshTrigger
  });

  // Show skeleton while loading
  if (isLoadingAccounts || isLoadingTransfers) {
    return <AccountTransfersSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Transfer Form */}
      <div className="md:col-span-1">
        <AccountTransfersForm />
      </div>

      {/* Recent Transfers */}
      <div className="md:col-span-2">
        <RecentTransfers limit={10} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
