"use client";

import { useFinancialData } from "@/hooks/use-financial-data";

/**
 * A hook that provides financial data for the main dashboard
 * This is a simplified version that uses the new financial data hook
 */
export function useConsolidatedFinanceDashboard(timeFrame: string = "month") {
  const { data, isLoading, error } = useFinancialData(timeFrame);

  // Generate previous year data for comparison
  const generatePreviousYearData = () => {
    if (!data?.monthlyData) return [];
    
    // Get the current year's data
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    // Filter data for the previous year
    return data.monthlyData.filter(item => item.year === previousYear);
  };

  // Generate trend data
  const generateTrendData = () => {
    if (!data?.monthlyData) return [];
    
    // Sort by year and month
    const sortedData = [...(data.monthlyData || [])].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return parseInt(a.month_num) - parseInt(b.month_num);
    });
    
    // Take the last 12 months or all if less
    return sortedData.slice(-12);
  };

  // If data is available, enhance it with additional derived data
  const enhancedData = data ? {
    ...data,
    previousYearData: generatePreviousYearData(),
    trendData: generateTrendData(),
    timeFrame
  } : null;

  return {
    data: enhancedData,
    isLoading,
    error
  };
}
