"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncAllTransactionsForAccount } from "@/lib/sync-account-transactions";
import { useQueryClient } from "@tanstack/react-query";

interface FixAccountTransactionsButtonProps {
  accountId: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * Button component to fix account transactions by syncing expenditure entries
 */
export function FixAccountTransactionsButton({
  accountId,
  variant = "outline",
  size = "sm",
  className
}: FixAccountTransactionsButtonProps) {
  const [isFixing, setIsFixing] = useState(false);
  const queryClient = useQueryClient();

  const handleFix = async () => {
    if (!accountId) {
      toast.error("No account ID provided");
      return;
    }

    setIsFixing(true);
    toast.info("Fixing account transactions...");

    try {
      toast.info("Syncing all transactions for this account...");

      // Use our comprehensive sync function to sync all transactions (income and expenditure)
      await syncAllTransactionsForAccount(accountId);

      console.log("Successfully synced all transactions for account", accountId);

      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["accountTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["accountTransactionSummary"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });

      toast.success("Account transactions fixed successfully");
    } catch (error) {
      console.error("Error fixing account transactions:", error);
      toast.error("Failed to fix account transactions");
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleFix}
      disabled={isFixing}
      className={className}
    >
      {isFixing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Fixing...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync All Transactions
        </>
      )}
    </Button>
  );
}
