"use client";

import React, { useState, useCallback } from "react";
import { BudgetList } from "./budget-list";
import { BudgetForm } from "./budget-form";
import { BudgetDetailView } from "./budget-detail-view";
import { BudgetManagementSkeleton } from "@/components/finance";
import { Budget } from "@/types/finance";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useBudgets } from "@/hooks/use-budgets";
import { financeKeys } from "@/lib/query-keys";

export default function EnhancedBudgetManagement() {
  return <BudgetManagementContent />;
}

function BudgetManagementContent() {
  const queryClient = useQueryClient();
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [view, setView] = useState<"list" | "detail" | "form">("list");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Use our optimized hook to fetch budgets with refresh trigger
  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useBudgets({ refreshTrigger });

  // Handle budget selection (memoized to prevent unnecessary re-renders)
  const handleSelectBudget = useCallback((budget: Budget) => {
    setSelectedBudget(budget);
    setView("detail");
  }, []);

  // Handle creating new budget
  const handleCreateBudget = useCallback(() => {
    setSelectedBudget(null);
    setView("form");
  }, []);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setView("list");
    setSelectedBudget(null);
  }, []);

  // Handle budget creation success
  const handleBudgetCreated = useCallback(() => {
    // Increment refresh trigger to force a refresh
    setRefreshTrigger(prev => prev + 1);

    // Also invalidate and refetch budgets
    queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });
    setView("list");
  }, [queryClient]);

  // Show loading state
  if (isLoading && budgets.length === 0) {
    return <BudgetManagementSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8 text-center border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-lg font-medium text-red-800">Error Loading Budgets</h3>
        <p className="text-red-600 mt-2">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again later."}
        </p>
        <div className="mt-6">
          <button
            onClick={() => refetch()}
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
        <BudgetList
          budgets={budgets}
          onSelectBudget={handleSelectBudget}
          onCreateBudget={handleCreateBudget}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {view === "detail" && selectedBudget && (
        <BudgetDetailView
          budget={selectedBudget}
          onBack={handleBackToList}
          onRefresh={() => {
            setRefreshTrigger(prev => prev + 1);
            queryClient.invalidateQueries({ queryKey: financeKeys.budgets.lists() });
          }}
        />
      )}

      {view === "form" && (
        <BudgetForm
          budget={selectedBudget}
          onSuccess={handleBudgetCreated}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
}
