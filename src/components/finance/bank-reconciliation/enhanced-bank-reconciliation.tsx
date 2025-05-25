"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ReconciliationList } from "./reconciliation-list";
import { ReconciliationForm } from "./reconciliation-form";
import { EnhancedReconciliationDetailView } from "./enhanced-reconciliation-detail-view";
import { BankReconciliationSkeleton } from "@/components/finance";
import { BankReconciliation, Account } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financeKeys } from "@/lib/query-keys";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-utils";

export default function EnhancedBankReconciliation() {
  return <BankReconciliationContent />;
}

function BankReconciliationContent() {
  const queryClient = useQueryClient();
  const [selectedReconciliation, setSelectedReconciliation] = useState<BankReconciliation | null>(null);
  const [view, setView] = useState<"list" | "detail" | "form">("list");

  // Fetch accounts with React Query
  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    error: accountsError
  } = useQuery({
    queryKey: financeKeys.accounts.lists(),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("accounts")
          .select("*")
          .order("name");

        if (error) {
          // Check if the error is because the table doesn't exist
          if (error.code === "PGRST204" || error.message.includes("not found")) {
            console.warn("Accounts table not found. This feature requires database setup.");
            return [];
          }
          console.error("Error fetching accounts:", error);
          // Return empty array instead of throwing to prevent UI from breaking
          return [];
        }

        return data || [];
      } catch (error) {
        console.error("Error fetching accounts:", error);
        // Return empty array instead of throwing to prevent UI from breaking
        return [];
      }
    },
    staleTime: STALE_TIMES.STANDARD, // 5 minutes
    gcTime: GC_TIMES.STANDARD, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  // Fetch reconciliations with React Query
  const {
    data: reconciliations = [],
    isLoading: isLoadingReconciliations,
    error: reconciliationsError,
    refetch: refetchReconciliations
  } = useQuery({
    queryKey: financeKeys.reconciliation.lists(),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("bank_reconciliations")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          // Check if the error is because the table doesn't exist
          if (error.code === "PGRST204" || error.message.includes("not found")) {
            console.warn("Bank reconciliations table not found. This feature requires database setup.");
            return [];
          }
          console.error("Error fetching bank reconciliations:", error);
          // Return empty array instead of throwing to prevent UI from breaking
          return [];
        }

        // If we have accounts data, enhance the reconciliations with account details
        if (accounts && accounts.length > 0) {
          return (data || []).map(reconciliation => {
            const account = accounts.find(acc => acc.id === reconciliation.account_id);
            return {
              ...reconciliation,
              accounts: account || { name: "Unknown Account" }
            };
          });
        }

        // No accounts data, just return the basic data
        return data || [];
      } catch (error) {
        console.error("Error fetching reconciliations:", error);
        // Return empty array instead of throwing to prevent UI from breaking
        return [];
      }
    },
    enabled: !isLoadingAccounts, // Only run this query when accounts are loaded
    staleTime: STALE_TIMES.FREQUENT, // 1 minute - reconciliations change more frequently
    gcTime: GC_TIMES.STANDARD, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  // Check if data is still loading
  const isLoading = isLoadingAccounts || isLoadingReconciliations;

  // Handle reconciliation selection with useCallback
  const handleSelectReconciliation = useCallback((reconciliation: BankReconciliation) => {
    setSelectedReconciliation(reconciliation);
    setView("detail");
  }, []);

  // Handle creating new reconciliation with useCallback
  const handleCreateReconciliation = useCallback(() => {
    setSelectedReconciliation(null);
    setView("form");
  }, []);

  // Handle back to list with useCallback
  const handleBackToList = useCallback(() => {
    // Invalidate reconciliation queries to ensure fresh data when returning to list
    queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation.all });
    refetchReconciliations();

    // Update view state
    setView("list");
    setSelectedReconciliation(null);
  }, [queryClient, refetchReconciliations]);

  // Handle reconciliation creation success with useCallback
  const handleReconciliationCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation.all });
    setView("list");
  }, [queryClient]);

  // Show loading state
  if (isLoading && reconciliations.length === 0) {
    return <BankReconciliationSkeleton />;
  }

  // Show error state
  if (reconciliationsError || accountsError) {
    const error = reconciliationsError || accountsError;
    return (
      <div className="p-8 text-center border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
        <p className="text-red-600 mt-2">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again later."}
        </p>
        <div className="mt-6">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: financeKeys.accounts.all });
              queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation.all });
            }}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === "list" && (
        <ReconciliationList
          reconciliations={reconciliations}
          onSelectReconciliation={handleSelectReconciliation}
          onCreateReconciliation={handleCreateReconciliation}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation.all });
            refetchReconciliations();
          }}
        />
      )}

      {view === "detail" && selectedReconciliation && (
        <EnhancedReconciliationDetailView
          reconciliation={selectedReconciliation}
          onBack={handleBackToList}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation.all })}
        />
      )}

      {view === "form" && (
        <ReconciliationForm
          accounts={accounts}
          reconciliation={selectedReconciliation}
          onSuccess={handleReconciliationCreated}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
}
