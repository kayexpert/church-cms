"use client";

/**
 * Consolidated Finance Hooks
 *
 * This file provides a centralized location for all finance-related hooks.
 * It consolidates hooks from multiple files to reduce code duplication and
 * improve maintainability.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { financeKeys } from "@/lib/query-keys";
import { useFinanceRealTimeSubscriptions } from "./use-finance-real-time";
import { getDateRangeForTimeFrame } from "@/lib/date-utils-optimized";
import {
  processCategories,
  generateMonthlyData,
  calculateTotalLiabilities
} from "@/lib/finance-data-utils";

// Types
export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyData {
  month: string;
  month_num: string;
  year: number;
  income: number;
  expenditure: number;
  net: number;
}

/**
 * Hook to fetch stats data for the finance dashboard
 * @param timeFrame The time frame to fetch data for (month, quarter, year, all)
 * @returns Stats data and loading state
 */
export function useFinanceStats(timeFrame: string = 'month') {
  return useQuery({
    queryKey: financeKeys.dashboard.stats(timeFrame),
    queryFn: async () => {
      try {
        // Determine date range based on time frame
        const { startDate, endDate } = getDateRangeForTimeFrame(timeFrame);

        // Format dates for Supabase queries
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];

        // Execute all queries in parallel for better performance
        const [
          incomeResult,
          expenditureResult,
          liabilitiesResult
        ] = await Promise.all([
          // Total income
          supabase
            .from("income_entries")
            .select("amount")
            .gte("date", formattedStartDate)
            .lte("date", formattedEndDate),

          // Total expenditure
          supabase
            .from("expenditure_entries")
            .select("amount")
            .gte("date", formattedStartDate)
            .lte("date", formattedEndDate),

          // Total liabilities
          supabase
            .from("liability_entries")
            .select("amount_remaining, total_amount, amount_paid")
            .neq("status", "paid")
        ]);

        // Check for errors
        if (incomeResult.error) throw incomeResult.error;
        if (expenditureResult.error) throw expenditureResult.error;
        if (liabilitiesResult.error) throw liabilitiesResult.error;

        // Calculate totals
        const totalIncome = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
        const totalExpenditure = expenditureResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
        const totalLiabilities = calculateTotalLiabilities(liabilitiesResult.data || []);
        const netCash = totalIncome - totalExpenditure;

        return {
          totalIncome,
          totalExpenditure,
          netCash,
          totalLiabilities
        };
      } catch (error) {
        console.error("Error fetching finance stats:", error);
        toast.error("Failed to load finance statistics");
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });
}

/**
 * Hook to fetch monthly chart data for the finance dashboard
 * @param timeFrame The time frame to fetch data for (month, quarter, year, all)
 * @returns Monthly chart data and loading state
 */
export function useMonthlyFinanceChart(timeFrame: string = 'month') {
  return useQuery({
    queryKey: financeKeys.dashboard.monthlyChart(timeFrame),
    queryFn: async () => {
      try {
        // Determine date range based on time frame
        const { startDate, endDate } = getDateRangeForTimeFrame(timeFrame);

        // Format dates for Supabase queries
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];

        // Generate monthly data
        return await generateMonthlyData(formattedStartDate, formattedEndDate);
      } catch (error) {
        console.error("Error fetching monthly finance data:", error);
        toast.error("Failed to load monthly finance data");
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });
}

/**
 * Hook to fetch category distribution data for the finance dashboard
 * @param timeFrame The time frame to fetch data for (month, quarter, year, all)
 * @returns Category distribution data and loading state
 */
export function useCategoryDistribution(timeFrame: string = 'month') {
  return useQuery({
    queryKey: financeKeys.dashboard.categoryDistribution(timeFrame),
    queryFn: async () => {
      try {
        // Determine date range based on time frame
        const { startDate, endDate } = getDateRangeForTimeFrame(timeFrame);

        // Format dates for Supabase queries
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];

        // Try to use the database functions first, but fall back to direct SQL queries if they don't exist
        let incomeCategoriesResult;
        let expenditureCategoriesResult;

        try {
          // Try to use the database functions
          [incomeCategoriesResult, expenditureCategoriesResult] = await Promise.all([
            // Income by category
            supabase.rpc('get_income_by_category', {
              start_date: formattedStartDate,
              end_date: formattedEndDate
            }),

            // Expenditure by category
            supabase.rpc('get_expenditure_by_category', {
              start_date: formattedStartDate,
              end_date: formattedEndDate
            })
          ]);

          // If either query failed, throw an error to trigger the fallback
          if (incomeCategoriesResult.error || expenditureCategoriesResult.error) {
            throw new Error("Database functions not available");
          }
        } catch (error) {
          // Falling back to direct SQL queries for category data

          // Determine which parameter name to use for exec_sql
          let paramName = 'query'; // Default

          // Try to find a working parameter name
          try {
            const { error: sqlQueryError } = await supabase.rpc('exec_sql', {
              sql_query: 'SELECT 1 as test'
            });

            if (!sqlQueryError) {
              paramName = 'sql_query';
            } else {
              const { error: sqlError } = await supabase.rpc('exec_sql', {
                sql: 'SELECT 1 as test'
              });

              if (!sqlError) {
                paramName = 'sql';
              }
            }
          } catch (e) {
            // Continue with default parameter name if testing fails
          }

          // Prepare SQL queries with LEFT JOIN
          const incomeSql = `
            SELECT
              COALESCE(ic.id, '00000000-0000-0000-0000-000000000000') as category_id,
              COALESCE(ic.name, 'Uncategorized') as category_name,
              SUM(ie.amount) as amount
            FROM
              income_entries ie
              LEFT JOIN income_categories ic ON ie.category_id = ic.id
            WHERE
              ie.date >= '${formattedStartDate}' AND ie.date <= '${formattedEndDate}'
            GROUP BY
              COALESCE(ic.id, '00000000-0000-0000-0000-000000000000'),
              COALESCE(ic.name, 'Uncategorized')
            ORDER BY
              amount DESC
          `;

          const expenditureSql = `
            SELECT
              COALESCE(ec.id, '00000000-0000-0000-0000-000000000000') as category_id,
              COALESCE(ec.name, 'Uncategorized') as category_name,
              SUM(ee.amount) as amount
            FROM
              expenditure_entries ee
              LEFT JOIN expenditure_categories ec ON ee.category_id = ec.id
            WHERE
              ee.date >= '${formattedStartDate}' AND ee.date <= '${formattedEndDate}'
            GROUP BY
              COALESCE(ec.id, '00000000-0000-0000-0000-000000000000'),
              COALESCE(ec.name, 'Uncategorized')
            ORDER BY
              amount DESC
          `;

          // Execute SQL queries
          const params = {};
          params[paramName] = incomeSql;

          const params2 = {};
          params2[paramName] = expenditureSql;

          [incomeCategoriesResult, expenditureCategoriesResult] = await Promise.all([
            supabase.rpc('exec_sql', params),
            supabase.rpc('exec_sql', params2)
          ]);
        }

        // Check for errors
        if (incomeCategoriesResult.error) throw incomeCategoriesResult.error;
        if (expenditureCategoriesResult.error) throw expenditureCategoriesResult.error;

        // Process category data
        const incomeByCategory = processCategories(incomeCategoriesResult.data || [], true);
        const expenditureByCategory = processCategories(expenditureCategoriesResult.data || [], false);

        return {
          incomeByCategory,
          expenditureByCategory
        };
      } catch (error) {
        console.error("Error fetching category distribution data:", error);
        toast.error("Failed to load category distribution data");
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });
}

/**
 * Hook to fetch all dashboard data for the finance dashboard
 * This is a convenience hook that combines all the other hooks
 * @param timeFrame The time frame to fetch data for (month, quarter, year, all)
 * @returns All dashboard data and loading state
 */
export function useFinanceDashboard(timeFrame: string = 'month') {
  // Set up real-time subscriptions
  useFinanceRealTimeSubscriptions(timeFrame);

  // Use granular hooks for each component
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useFinanceStats(timeFrame);

  const {
    data: monthlyData,
    isLoading: monthlyLoading,
    error: monthlyError,
    refetch: refetchMonthly
  } = useMonthlyFinanceChart(timeFrame);

  const {
    data: categoryData,
    isLoading: categoryLoading,
    error: categoryError,
    refetch: refetchCategory
  } = useCategoryDistribution(timeFrame);

  // Combine all data
  const data = {
    ...statsData,
    monthlyData,
    ...categoryData
  };

  // Determine overall loading state
  const isLoading = statsLoading || monthlyLoading || categoryLoading;

  // Determine overall error state
  const error = statsError || monthlyError || categoryError;

  // Combine all refetch functions
  const refetch = async () => {
    await Promise.all([
      refetchStats(),
      refetchMonthly(),
      refetchCategory()
    ]);
  };

  return {
    data,
    isLoading,
    error,
    refetch
  };
}

// Re-export the real-time subscriptions hook for convenience
export { useFinanceRealTimeSubscriptions } from "./use-finance-real-time";
