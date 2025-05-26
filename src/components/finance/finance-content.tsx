"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import {
  FinanceSkeleton,
  FinanceDashboardSkeleton,
  IncomeManagementSkeleton,
  ExpenditureManagementSkeleton,
  LiabilityManagementSkeleton,
  AccountManagementSkeleton,
  BudgetManagementSkeleton,
  BankReconciliationSkeleton
} from "@/components/finance";
import { MobileFinanceTabs } from "@/components/finance/mobile-finance-tabs";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchFinanceData } from "@/lib/prefetch-finance-data";

// Optimized dynamic imports with better chunking and preloading
const FinanceDashboard = dynamic(
  () => import("@/components/finance/new-dashboard/new-finance-dashboard").then(mod => ({ default: mod.NewFinanceDashboard })),
  {
    ssr: false,
    loading: () => <FinanceDashboardSkeleton />
  }
);

const IncomeManagement = dynamic(
  () => import("@/components/finance/income-management/income-management"),
  {
    ssr: false,
    loading: () => <IncomeManagementSkeleton />
  }
);

const ExpenditureManagement = dynamic(
  () => import("@/components/finance/expenditure-management/enhanced-expenditure-management"),
  {
    ssr: false,
    loading: () => <ExpenditureManagementSkeleton />
  }
);

const LiabilityManagement = dynamic(
  () => import("@/components/finance/liability-management/enhanced-liability-management"),
  {
    ssr: false,
    loading: () => <LiabilityManagementSkeleton />
  }
);

const BudgetManagement = dynamic(
  () => import("@/components/finance/budget-management/enhanced-budget-management"),
  {
    ssr: false,
    loading: () => <BudgetManagementSkeleton />
  }
);

const BankReconciliation = dynamic(
  () => import("@/components/finance/bank-reconciliation/enhanced-bank-reconciliation"),
  {
    ssr: false,
    loading: () => <BankReconciliationSkeleton />
  }
);

const AccountManagement = dynamic(
  () => import("@/components/finance/account-management").then(mod => ({ default: mod.AccountManagement })),
  {
    ssr: false,
    loading: () => <AccountManagementSkeleton />
  }
);

import {
  BarChart3,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  PiggyBank,
  Receipt,
  Wallet
} from "lucide-react";

// Use React.memo to prevent unnecessary re-renders of the entire component
export const FinanceContent = React.memo(function FinanceContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  // Define tab order once outside of effects for reuse
  const tabOrder = ["dashboard", "income", "expenditure", "liabilities", "accounts", "budgeting", "reconciliation"];

  // Prefetch common finance data on component mount
  useEffect(() => {
    // Prefetch finance data
    prefetchFinanceData(queryClient).catch(error => {
      console.error("Error prefetching finance data:", error);
    });
  }, [queryClient]);

  // Import useRouter
  const router = useRouter();

  // Tab change handler with preloading
  const handleTabChange = useCallback((tab: string) => {
    // Don't do anything if we're already on this tab
    if (tab === activeTab) return;

    // Preload the component for the new tab before switching
    const preloadTabComponent = async () => {
      try {
        switch (tab) {
          case "dashboard":
            await import("@/components/finance/new-dashboard/new-finance-dashboard");
            break;
          case "income":
            await import("@/components/finance/income-management/income-management");
            break;
          case "expenditure":
            await import("@/components/finance/expenditure-management/enhanced-expenditure-management");
            break;
          case "liabilities":
            await import("@/components/finance/liability-management/enhanced-liability-management");
            break;
          case "accounts":
            await import("@/components/finance/account-management");
            break;
          case "budgeting":
            await import("@/components/finance/budget-management/enhanced-budget-management");
            break;
          case "reconciliation":
            await import("@/components/finance/bank-reconciliation/enhanced-bank-reconciliation");
            break;
        }
      } catch (error) {
        console.error(`Error preloading component for tab ${tab}:`, error);
      }
    };

    // Start preloading the component
    preloadTabComponent();

    // Update the active tab state immediately
    setActiveTab(tab);

    // Update the URL without full page reload
    router.push(`/finance?tab=${tab}`, { scroll: false });
  }, [activeTab, router]);

  // Effect for handling URL params and tab switching
  useEffect(() => {
    // Handle URL params for tab switching
    const tab = searchParams.get("tab");

    if (tab && tabOrder.includes(tab) && tab !== activeTab) {
      // Update the active tab
      setActiveTab(tab);
    }

    // Check for liability param, which would switch to expenditure and prep for payment
    const liability = searchParams.get("liability");
    if (liability && activeTab !== "expenditure") {
      setActiveTab("expenditure");
    }
  }, [searchParams, activeTab, tabOrder]);

  // Effect for initial loading - immediately set loading to false
  // We'll rely on individual tab skeletons instead of a global loading state
  useEffect(() => {
    // Set loading to false immediately to avoid showing the main skeleton
    setIsLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {/* Mobile Tabs */}
        <MobileFinanceTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <div className="flex justify-between items-center">
        {/* Desktop Tabs */}
        <Tabs
          defaultValue="dashboard"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="hidden md:block">
            <TabsList>
              <TabsTrigger value="dashboard">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="income">
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                <span>Income</span>
              </TabsTrigger>
              <TabsTrigger value="expenditure">
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
                <span>Expenditure</span>
              </TabsTrigger>
              <TabsTrigger value="liabilities">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>Liabilities</span>
              </TabsTrigger>
              <TabsTrigger value="accounts">
                <Wallet className="h-4 w-4 mr-2" />
                <span>Account Management</span>
              </TabsTrigger>
              <TabsTrigger value="budgeting">
                <PiggyBank className="h-4 w-4 mr-2" />
                <span>Budgeting</span>
              </TabsTrigger>
              <TabsTrigger value="reconciliation">
                <Receipt className="h-4 w-4 mr-2" />
                <span>Reconciliation</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Optimized TabsContent - only render active tab to improve performance */}
          <TabsContent value="dashboard" className="space-y-6">
            {activeTab === "dashboard" && <FinanceDashboard />}
          </TabsContent>

          <TabsContent value="income" className="space-y-6">
            {activeTab === "income" && <IncomeManagement />}
          </TabsContent>

          <TabsContent value="expenditure" className="space-y-6">
            {activeTab === "expenditure" && <ExpenditureManagement />}
          </TabsContent>

          <TabsContent value="liabilities" className="space-y-6">
            {activeTab === "liabilities" && <LiabilityManagement />}
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            {activeTab === "accounts" && <AccountManagement />}
          </TabsContent>

          <TabsContent value="budgeting" className="space-y-6">
            {activeTab === "budgeting" && <BudgetManagement />}
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-6">
            {activeTab === "reconciliation" && <BankReconciliation />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});
