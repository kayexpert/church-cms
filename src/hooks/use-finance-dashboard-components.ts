"use client";

import { useQuery } from "@tanstack/react-query";
import { financeKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  name: string;
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

        // Execute queries in parallel for better performance
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
            .select("amount_remaining")
            .neq("status", "paid"),
        ]);

        // Check for errors
        if (incomeResult.error) throw incomeResult.error;
        if (expenditureResult.error) throw expenditureResult.error;
        if (liabilitiesResult.error) throw liabilitiesResult.error;

        // Calculate totals
        const totalIncome = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
        const totalExpenditure = expenditureResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
        const totalLiabilities = liabilitiesResult.data?.reduce((sum, item) => sum + Number(item.amount_remaining || 0), 0) || 0;
        const netCash = totalIncome - totalExpenditure;

        return {
          totalIncome,
          totalExpenditure,
          netCash,
          totalLiabilities
        };
      } catch (error) {
        console.error("Error fetching finance stats:", error);
        toast.error("Failed to load financial stats");
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

        // Execute queries in parallel for better performance
        const [
          incomeCategoriesResult,
          expenditureCategoriesResult
        ] = await Promise.all([
          // Income by category
          supabase.rpc('exec_sql', {
            query: `
              SELECT
                ic.id as category_id,
                ic.name as category_name,
                SUM(ie.amount) as amount
              FROM
                income_entries ie
                JOIN income_categories ic ON ie.category_id = ic.id
              WHERE
                ie.date >= '${formattedStartDate}' AND ie.date <= '${formattedEndDate}'
              GROUP BY
                ic.id, ic.name
              ORDER BY
                amount DESC
            `
          }),

          // Expenditure by category
          supabase.rpc('exec_sql', {
            query: `
              SELECT
                ec.id as category_id,
                ec.name as category_name,
                SUM(ee.amount) as amount
              FROM
                expenditure_entries ee
                JOIN expenditure_categories ec ON ee.category_id = ec.id
              WHERE
                ee.date >= '${formattedStartDate}' AND ee.date <= '${formattedEndDate}'
              GROUP BY
                ec.id, ec.name
              ORDER BY
                amount DESC
            `
          })
        ]);

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

// Helper functions

/**
 * Get date range based on time frame
 */
function getDateRangeForTimeFrame(timeFrame: string): { startDate: Date; endDate: Date } {
  let startDate = new Date();
  let endDate = new Date();

  switch (timeFrame) {
    case 'month':
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      break;
    case 'quarter':
      const currentQuarter = Math.floor(startDate.getMonth() / 3);
      startDate = new Date(startDate.getFullYear(), currentQuarter * 3, 1);
      break;
    case 'year':
      startDate = new Date(startDate.getFullYear(), 0, 1);
      break;
    case 'all':
      startDate = new Date(2000, 0, 1); // Far in the past
      break;
  }

  return { startDate, endDate };
}

/**
 * Process category data
 */
function processCategories(data: any[], isIncome: boolean): CategoryData[] {
  const categoryMap = new Map<string, { amount: number; color: string }>();

  // Define default colors
  const colors = isIncome ? [
    '#4CAF50', '#8BC34A', '#CDDC39', '#009688', '#00BCD4', '#03A9F4', '#2196F3', '#3F51B5'
  ] : [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#FF5722', '#FF9800', '#FFC107', '#795548'
  ];

  data.forEach(item => {
    const category = item.category_name || 'Uncategorized';
    const amount = Number(item.amount || 0);

    if (categoryMap.has(category)) {
      const existing = categoryMap.get(category)!;
      categoryMap.set(category, {
        amount: existing.amount + amount,
        color: existing.color
      });
    } else {
      const colorIndex = categoryMap.size % colors.length;
      categoryMap.set(category, {
        amount,
        color: colors[colorIndex]
      });
    }
  });

  const categories = Array.from(categoryMap.entries()).map(([category, { amount, color }]) => ({
    category,
    amount,
    color
  }));

  // Calculate percentages
  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  return categories.map(item => ({
    ...item,
    percentage: total > 0 ? (item.amount / total) * 100 : 0
  }));
}

/**
 * Generate monthly data
 */
async function generateMonthlyData(startDate: string, endDate: string): Promise<MonthlyData[]> {
  // Generate months between start and end date
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months: { month: Date; label: string; monthNum: string }[] = [];

  // Include 5 months before start date for trend visualization
  const trendStart = new Date(start);
  trendStart.setMonth(trendStart.getMonth() - 5);

  let current = new Date(trendStart);
  while (current <= end) {
    months.push({
      month: new Date(current),
      label: current.toLocaleString('default', { month: 'short' }),
      monthNum: String(current.getMonth() + 1).padStart(2, '0')
    });
    current.setMonth(current.getMonth() + 1);
  }

  // Fetch income and expenditure data for each month
  const monthlyData: MonthlyData[] = [];

  for (const { month, label, monthNum } of months) {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const formattedMonthStart = monthStart.toISOString().split('T')[0];
    const formattedMonthEnd = monthEnd.toISOString().split('T')[0];

    const [incomeResult, expenditureResult] = await Promise.all([
      supabase
        .from("income_entries")
        .select("amount")
        .gte("date", formattedMonthStart)
        .lte("date", formattedMonthEnd),

      supabase
        .from("expenditure_entries")
        .select("amount")
        .gte("date", formattedMonthStart)
        .lte("date", formattedMonthEnd)
    ]);

    const income = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
    const expenditure = expenditureResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
    const net = income - expenditure;

    monthlyData.push({
      month: label,
      month_num: monthNum,
      year: month.getFullYear(),
      income,
      expenditure,
      net
    });
  }

  return monthlyData;
}
