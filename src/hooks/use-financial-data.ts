"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useFinanceRealTimeSubscriptions } from "./use-finance-real-time";
import { financeKeys } from "@/lib/query-keys";

// Types for financial data
export interface CategoryData {
  category: string;
  amount: number;
  color?: string;
  percentage?: number;
}

export interface MonthlyData {
  month: string;
  month_num: string;
  year: number;
  income: number;
  expenditure: number;
  net?: number;
}

export interface FinancialData {
  totalIncome: number;
  totalExpenditure: number;
  netCash: number;
  totalLiabilities: number;
  incomeByCategory: CategoryData[];
  expenditureByCategory: CategoryData[];
  monthlyData: MonthlyData[];
}

/**
 * Hook to fetch financial data for the dashboard with real-time updates
 * @param timeFrame The time frame to fetch data for (month, quarter, year, all)
 * @returns Financial data and loading state
 */
export function useFinancialData(timeFrame: string = 'month') {
  const queryClient = useQueryClient();

  // Set up real-time subscriptions
  const { isSubscribed } = useFinanceRealTimeSubscriptions(timeFrame);

  return useQuery<FinancialData, Error>({
    queryKey: financeKeys.dashboard.all(timeFrame),
    queryFn: async () => {
      try {
        // First try the simplified API endpoint
        console.log(`Fetching financial data for ${timeFrame} from simplified API`);
        const response = await fetch(`/api/finance/simple-dashboard-data?timeFrame=${timeFrame}`);

        if (!response.ok) {
          console.warn(`Simple dashboard API returned ${response.status}: ${await response.text()}`);
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.warn("Simple dashboard API returned error:", result.error);
          throw new Error(result.error || "Failed to fetch dashboard data");
        }

        return result.data;
      } catch (apiError) {
        // Fall back to fetching data directly in the client
        try {
          const directData = await fetchDataDirectly(timeFrame);
          return directData;
        } catch (directError) {
          console.error("Error fetching data directly:", directError);
          toast.error("Failed to load financial data. Please try again.");
          throw directError;
        }
      }
    },
    // Reduce stale time for more frequent updates
    staleTime: 30 * 1000, // 30 seconds
    // Enable refetch on window focus for better real-time experience
    refetchOnWindowFocus: true,
    // Add a refetch interval as a fallback for real-time updates
    refetchInterval: isSubscribed ? false : 30 * 1000, // Only use interval if subscriptions fail
    retry: 2,
    retryDelay: 1000, // 1 second delay between retries
    onError: (error) => {
      console.error("Error in useFinancialData:", error);
      toast.error("Failed to load financial data. Please try again.");
    }
  });
}

/**
 * Fallback function to fetch data directly in the client
 */
async function fetchDataDirectly(timeFrame: string): Promise<FinancialData> {
  // Determine date range based on time frame
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

  // Format dates for Supabase queries
  const formattedStartDate = startDate.toISOString().split('T')[0];
  const formattedEndDate = endDate.toISOString().split('T')[0];

  // Execute all queries in parallel for better performance
  const [
    incomeResult,
    expenditureResult,
    liabilitiesResult,
    incomeCategoriesResult,
    expenditureCategoriesResult
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

    // Income by category - using a direct SQL query for more reliable results
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

    // Expenditure by category - using a direct SQL query for more reliable results
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

  // Check for errors in any of the queries
  const errors = [];
  if (incomeResult.error) errors.push({ query: "income", error: incomeResult.error });
  if (expenditureResult.error) errors.push({ query: "expenditure", error: expenditureResult.error });
  if (liabilitiesResult.error) errors.push({ query: "liabilities", error: liabilitiesResult.error });
  if (incomeCategoriesResult.error) errors.push({ query: "incomeCategories", error: incomeCategoriesResult.error });
  if (expenditureCategoriesResult.error) errors.push({ query: "expenditureCategories", error: expenditureCategoriesResult.error });

  if (errors.length > 0) {
    console.error("Errors fetching financial data:", errors);
    throw new Error("Failed to fetch financial data");
  }

  // Calculate totals
  const totalIncome = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
  const totalExpenditure = expenditureResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
  const totalLiabilities = liabilitiesResult.data?.reduce((sum, item) => sum + Number(item.amount_remaining || 0), 0) || 0;
  const netCash = totalIncome - totalExpenditure;

  // Process category data
  const incomeByCategory = processIncomeCategories(incomeCategoriesResult.data || []);
  const expenditureByCategory = processExpenditureCategories(expenditureCategoriesResult.data || []);

  // Generate monthly data
  const monthlyData = await generateMonthlyData(formattedStartDate, formattedEndDate);

  return {
    totalIncome,
    totalExpenditure,
    netCash,
    totalLiabilities,
    incomeByCategory,
    expenditureByCategory,
    monthlyData
  };
}

/**
 * Process income categories data
 */
function processIncomeCategories(data: any[]): CategoryData[] {
  const categoryMap = new Map<string, { amount: number; color: string }>();

  // Define default colors for income categories
  const incomeColors = [
    '#4CAF50', // Green
    '#8BC34A', // Light Green
    '#CDDC39', // Lime
    '#009688', // Teal
    '#00BCD4', // Cyan
    '#03A9F4', // Light Blue
    '#2196F3', // Blue
    '#3F51B5', // Indigo
  ];

  // Log the data structure for debugging
  console.log('Client-side income categories data structure:',
    data.length > 0 ? JSON.stringify(data[0]) : 'No data');

  data.forEach(item => {
    // The data structure is now { category_id, category_name, amount }
    const category = item.category_name || 'Uncategorized';
    const amount = Number(item.amount || 0);

    if (categoryMap.has(category)) {
      const existing = categoryMap.get(category)!;
      categoryMap.set(category, {
        amount: existing.amount + amount,
        color: existing.color
      });
    } else {
      // Assign a color based on the category index
      const colorIndex = categoryMap.size % incomeColors.length;
      categoryMap.set(category, {
        amount,
        color: incomeColors[colorIndex]
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
 * Process expenditure categories data
 */
function processExpenditureCategories(data: any[]): CategoryData[] {
  const categoryMap = new Map<string, { amount: number; color: string }>();

  // Define default colors for expenditure categories
  const expenditureColors = [
    '#F44336', // Red
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#673AB7', // Deep Purple
    '#FF5722', // Deep Orange
    '#FF9800', // Orange
    '#FFC107', // Amber
    '#795548', // Brown
  ];

  // Log the data structure for debugging
  console.log('Client-side expenditure categories data structure:',
    data.length > 0 ? JSON.stringify(data[0]) : 'No data');

  data.forEach(item => {
    // The data structure is now { category_id, category_name, amount }
    const category = item.category_name || 'Uncategorized';
    const amount = Number(item.amount || 0);

    if (categoryMap.has(category)) {
      const existing = categoryMap.get(category)!;
      categoryMap.set(category, {
        amount: existing.amount + amount,
        color: existing.color
      });
    } else {
      // Assign a color based on the category index
      const colorIndex = categoryMap.size % expenditureColors.length;
      categoryMap.set(category, {
        amount,
        color: expenditureColors[colorIndex]
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