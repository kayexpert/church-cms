/**
 * Finance Data Utilities
 *
 * This file provides utility functions for processing financial data.
 * It consolidates financial data processing logic from multiple files
 * to reduce code duplication and improve maintainability.
 */

import { format, subMonths, subQuarters, subYears, eachMonthOfInterval } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { isDateInInterval, formatDateForDisplay } from './date-utils-optimized';

// Color palette for charts
const INCOME_COLORS = [
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
  '#a7f3d0', // emerald-200
  '#d1fae5', // emerald-100
  '#ecfdf5', // emerald-50
  '#047857', // emerald-700
  '#065f46', // emerald-800
  '#064e3b', // emerald-900
  '#022c22', // emerald-950
];

const EXPENDITURE_COLORS = [
  '#ef4444', // red-500
  '#f87171', // red-400
  '#fca5a5', // red-300
  '#fecaca', // red-200
  '#fee2e2', // red-100
  '#fef2f2', // red-50
  '#dc2626', // red-600
  '#b91c1c', // red-700
  '#991b1b', // red-800
  '#7f1d1d', // red-900
];

// Types
export interface CategoryData {
  id?: string;
  name?: string;
  category?: string;
  amount: number;
  percentage: number;
  color?: string;
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

export interface TrendData {
  name: string;
  income: number;
  expenditure: number;
  net: number;
  date: string;
}

/**
 * Process income and expenditure data by category
 * @param incomeData Array of income entries
 * @param expenditureData Array of expenditure entries
 * @param totalIncome Total income amount
 * @param totalExpenditure Total expenditure amount
 * @returns Object containing income and expenditure by category
 */
export function processFinancialDataByCategory(
  incomeData: any[],
  expenditureData: any[],
  totalIncome: number,
  totalExpenditure: number
): {
  incomeByCategory: CategoryData[];
  expenditureByCategory: CategoryData[];
} {
  // Process income by category
  const incomeByCategoryMap = new Map<string, { name: string, amount: number }>();

  for (const entry of incomeData) {
    const categoryName = entry.income_categories?.name || 'Uncategorized';
    const amount = Number(entry.amount);

    if (incomeByCategoryMap.has(categoryName)) {
      incomeByCategoryMap.get(categoryName)!.amount += amount;
    } else {
      incomeByCategoryMap.set(categoryName, { name: categoryName, amount });
    }
  }

  const incomeByCategory = Array.from(incomeByCategoryMap.entries()).map(([name, data]) => {
    const percentage = totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0;
    return {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      amount: data.amount,
      percentage
    };
  });

  // Process expenditure by category
  const expenditureByCategoryMap = new Map<string, { name: string, amount: number }>();

  for (const entry of expenditureData) {
    const categoryName = entry.expenditure_categories?.name || 'Uncategorized';
    const amount = Number(entry.amount);

    if (expenditureByCategoryMap.has(categoryName)) {
      expenditureByCategoryMap.get(categoryName)!.amount += amount;
    } else {
      expenditureByCategoryMap.set(categoryName, { name: categoryName, amount });
    }
  }

  const expenditureByCategory = Array.from(expenditureByCategoryMap.entries()).map(([name, data]) => {
    const percentage = totalExpenditure > 0 ? (data.amount / totalExpenditure) * 100 : 0;
    return {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      amount: data.amount,
      percentage
    };
  });

  return { incomeByCategory, expenditureByCategory };
}

/**
 * Generate time series data (monthly/daily data)
 * @param timeFrame The timeframe context (month, quarter, year, all)
 * @param intervals Array of dates representing the intervals
 * @param incomeData Array of income entries
 * @param expenditureData Array of expenditure entries
 * @returns Array of monthly/daily data
 */
export function generateTimeSeriesData(
  timeFrame: string,
  intervals: Date[],
  incomeData: any[],
  expenditureData: any[]
): MonthlyData[] {
  return intervals.map(interval => {
    const displayName = formatDateForDisplay(interval, timeFrame);

    // Filter data for this interval
    const intervalIncome = incomeData
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return isDateInInterval(entryDate, interval, timeFrame);
      })
      .reduce((sum, entry) => sum + Number(entry.amount), 0);

    const intervalExpenditure = expenditureData
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return isDateInInterval(entryDate, interval, timeFrame);
      })
      .reduce((sum, entry) => sum + Number(entry.amount), 0);

    return {
      name: displayName,
      income: intervalIncome,
      expenditure: intervalExpenditure
    };
  });
}

/**
 * Generate trend data from monthly/daily data
 * @param monthlyData Array of monthly/daily data
 * @param intervals Array of dates representing the intervals
 * @returns Array of trend data
 */
export function generateTrendData(
  monthlyData: MonthlyData[],
  intervals: Date[]
): TrendData[] {
  return monthlyData.map((month, index) => ({
    name: month.name,
    income: month.income,
    expenditure: month.expenditure,
    net: month.income - month.expenditure,
    date: format(intervals[index], 'yyyy-MM-dd')
  }));
}

/**
 * Calculate total liabilities from liability data
 * @param liabilityData Array of liability entries
 * @returns Total liabilities amount
 */
export function calculateTotalLiabilities(liabilityData: any[]): number {
  return liabilityData.reduce((sum, entry) => {
    // Handle both amount_remaining and calculated remaining amount
    const remaining = entry.amount_remaining !== undefined
      ? Number(entry.amount_remaining)
      : (Number(entry.total_amount) - Number(entry.amount_paid));
    return sum + remaining;
  }, 0);
}

/**
 * Format financial entries for display
 * @param entries Array of financial entries
 * @param categoryKey Key to access the category name
 * @param limit Maximum number of entries to return
 * @returns Array of formatted entries
 */
export function formatRecentEntries(
  entries: any[],
  categoryKey: string,
  limit: number = 5
): any[] {
  return entries
    .slice(0, limit)
    .map(entry => ({
      id: entry.id,
      amount: Number(entry.amount),
      date: entry.date,
      description: entry.description || '',
      category: entry[categoryKey]?.name || 'Uncategorized'
    }));
}

/**
 * Process category data into a format suitable for charts
 * @param categoryData Array of category data from the database
 * @param isIncome Whether this is income or expenditure data
 * @returns Array of processed category data
 */
export function processCategories(
  categoryData: any[],
  isIncome: boolean
): CategoryData[] {
  // Skip processing if no data
  if (!categoryData || categoryData.length === 0) {
    return [];
  }

  // Calculate total amount
  const totalAmount = categoryData.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // If total is zero, return empty array to avoid division by zero
  if (totalAmount === 0) {
    return [];
  }

  // Get color palette based on type
  const colorPalette = isIncome ? INCOME_COLORS : EXPENDITURE_COLORS;

  // Process each category
  return categoryData.map((item, index) => {
    const amount = Number(item.amount || 0);
    const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

    // Extract category name, checking all possible property names
    // This handles different data structures that might come from various API endpoints
    const categoryName = item.category_name || item.name || item.category || 'Uncategorized';

    return {
      id: item.category_id || item.id || categoryName.toLowerCase().replace(/\s+/g, '_'),
      name: categoryName,
      category: categoryName,
      amount,
      percentage,
      color: colorPalette[index % colorPalette.length]
    };
  });
}

/**
 * Generate monthly data for charts
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @returns Array of monthly data
 */
export async function generateMonthlyData(
  startDate: string,
  endDate: string
): Promise<MonthlyData[]> {
  // Convert string dates to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Generate array of months in the interval
  const months = eachMonthOfInterval({ start, end }).map(month => {
    const monthNum = month.getMonth() + 1;
    return {
      month,
      label: format(month, 'MMM yyyy'),
      monthName: format(month, 'MMM'),
      year: month.getFullYear(),
      monthNum: monthNum < 10 ? `0${monthNum}` : `${monthNum}`
    };
  });

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

    // Calculate totals
    const income = incomeResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
    const expenditure = expenditureResult.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;

    monthlyData.push({
      month: format(month, 'MMM'),
      month_num: monthNum,
      year: month.getFullYear(),
      name: label,
      income,
      expenditure,
      net: income - expenditure
    });
  }

  return monthlyData;
}
