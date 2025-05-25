import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * A simplified API route to fetch dashboard data
 * This uses direct queries without relying on database functions
 */
export async function GET(request: Request) {
  try {
    // Get the time frame from the query parameters
    const url = new URL(request.url);
    const timeFrame = url.searchParams.get("timeFrame") || "month";

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

      // Income by category - using LEFT JOIN for better handling of null categories
      supabase.rpc('exec_sql', {
        query: `
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
        `
      }).then(result => {
        console.log('Income categories result:', result);
        return result;
      }),

      // Expenditure by category - using LEFT JOIN for better handling of null categories
      supabase.rpc('exec_sql', {
        query: `
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
        `
      }).then(result => {
        console.log('Expenditure categories result:', result);
        return result;
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
      console.error("Errors fetching dashboard data:", errors);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch dashboard data",
        details: errors
      }, { status: 500 });
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

    // Return the dashboard data
    return NextResponse.json({
      success: true,
      data: {
        totalIncome,
        totalExpenditure,
        netCash,
        totalLiabilities,
        incomeByCategory,
        expenditureByCategory,
        monthlyData
      }
    });
  } catch (error) {
    console.error("Unexpected error in simple-dashboard-data:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

/**
 * Process income categories data
 */
function processIncomeCategories(data: any[]) {
  const categoryMap = new Map<string, { amount: number; color: string }>();

  // Define colors for income categories
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

  data.forEach(item => {
    // The data structure is { category_id, category_name, amount }
    // Ensure we're using the correct property name for consistent category display
    const category = item.category_name || item.name || 'Uncategorized';
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
function processExpenditureCategories(data: any[]) {
  const categoryMap = new Map<string, { amount: number; color: string }>();

  // Define colors for expenditure categories
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

  data.forEach(item => {
    // The data structure is { category_id, category_name, amount }
    // Ensure we're using the correct property name for consistent category display
    const category = item.category_name || item.name || 'Uncategorized';
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
async function generateMonthlyData(startDate: string, endDate: string) {
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
  const monthlyData = [];

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

    monthlyData.push({
      month: label,
      month_num: monthNum,
      year: month.getFullYear(),
      income,
      expenditure,
      net: income - expenditure
    });
  }

  return monthlyData;
}
