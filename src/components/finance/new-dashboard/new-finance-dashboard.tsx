"use client";

import { useState } from "react";
import { useFinanceDashboard } from "@/hooks/use-finance-hooks";
import { DashboardStatsCards } from "./dashboard-stats-cards";
import { MonthlyFinanceChart } from "./monthly-finance-chart";
import { CategoryDistributionCharts } from "./category-distribution-charts";
import { FinanceTrendChart } from "./finance-trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowDownUp, BarChart3, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FinanceDashboardSkeleton } from "../consolidated-skeletons";
import { toast } from "sonner";

export function NewFinanceDashboard() {
  const [timeFrame, setTimeFrame] = useState<string>("month");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the consolidated dashboard hook
  const {
    data,
    isLoading,
    error,
    refetch
  } = useFinanceDashboard(timeFrame);

  // Handle manual refresh with debounce to prevent multiple rapid refreshes
  const handleManualRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    toast.info("Refreshing financial data...");

    try {
      await refetch();
      toast.success("Financial data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh data. Please try again.");
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTimeFrameChange = (value: string) => {
    setTimeFrame(value);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading financial data</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{error instanceof Error ? error.message : "An unexpected error occurred"}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="mt-2"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No data available</AlertTitle>
        <AlertDescription>
          <p>Could not retrieve financial data. Please try again later.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="mt-2"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Frame Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Financial Overview</CardTitle>
              <CardDescription>Summary of your financial data</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={isRefreshing || isLoading}
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh data</span>
              </Button>
              <Tabs defaultValue={timeFrame} onValueChange={handleTimeFrameChange}>
                <TabsList>
                  <TabsTrigger value="month">
                    <Calendar className="h-4 w-4 mr-2" />
                    Month
                  </TabsTrigger>
                  <TabsTrigger value="quarter">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Quarter
                  </TabsTrigger>
                  <TabsTrigger value="year">
                    <ArrowDownUp className="h-4 w-4 mr-2" />
                    Year
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <DashboardStatsCards
        totalIncome={data.totalIncome}
        totalExpenditure={data.totalExpenditure}
        netCash={data.netCash}
        totalLiabilities={data.totalLiabilities}
        timeFrame={timeFrame}
      />

      {/* Monthly Finance Chart */}
      <MonthlyFinanceChart
        data={data.monthlyData}
        timeFrame={timeFrame}
      />

      {/* Category Distribution Charts */}
      <CategoryDistributionCharts
        incomeByCategory={data.incomeByCategory}
        expenditureByCategory={data.expenditureByCategory}
      />

      {/* Finance Trend Chart */}
      <FinanceTrendChart
        data={data.monthlyData}
        timeFrame={timeFrame}
      />
    </div>
  );
}

// Use the imported skeleton component
function DashboardSkeleton() {
  return <FinanceDashboardSkeleton />;
}
