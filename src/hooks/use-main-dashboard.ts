"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemberStats, useUpcomingBirthdays, useMemberGrowth } from "@/hooks/useMemberStats";
import { useUpcomingEvents } from "@/hooks/useEvents";
import { useConsolidatedFinanceDashboard } from "@/hooks/use-consolidated-finance-dashboard";

/**
 * Custom hook for fetching all data needed for the main dashboard
 * Consolidates multiple data sources into a single hook
 */
export function useMainDashboard(timeFrame: string = "year") {
  // Fetch member statistics
  const {
    data: memberStats,
    isLoading: memberStatsLoading,
    error: memberStatsError
  } = useMemberStats();

  // Fetch upcoming birthdays
  const {
    data: upcomingBirthdays,
    isLoading: birthdaysLoading,
    error: birthdaysError
  } = useUpcomingBirthdays(30); // Next 30 days

  // Fetch membership growth data
  const {
    data: membershipGrowthData,
    isLoading: growthLoading,
    error: growthError
  } = useMemberGrowth();

  // Fetch upcoming events
  const {
    data: upcomingEvents,
    isLoading: eventsLoading,
    error: eventsError
  } = useUpcomingEvents(7); // Next 7 days

  // Fetch financial data
  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError
  } = useConsolidatedFinanceDashboard(timeFrame);

  // Calculate growth rate from membership growth data
  const calculateGrowthRate = () => {
    if (!membershipGrowthData || membershipGrowthData.length < 3) return "0.0";
    
    const lastThreeMonths = membershipGrowthData.slice(-3);
    const firstMonth = lastThreeMonths[0]?.members || 0;
    const lastMonth = lastThreeMonths[2]?.members || 0;
    
    if (firstMonth === 0) return "0.0";
    
    const growthRate = ((lastMonth - firstMonth) / firstMonth) * 100;
    return growthRate.toFixed(1);
  };

  const growthRate = calculateGrowthRate();

  // Combine all data into a single object
  const dashboardData = {
    memberStats: memberStats || {
      totalMembers: 0,
      activeMembers: 0,
      inactiveMembers: 0,
      newMembersThisMonth: 0
    },
    upcomingBirthdays: upcomingBirthdays || [],
    membershipGrowthData: membershipGrowthData || [],
    upcomingEvents: upcomingEvents || [],
    financialData: financialData || {
      totalIncome: 0,
      totalExpenditure: 0,
      netCash: 0,
      totalLiabilities: 0,
      incomeByCategory: [],
      expenditureByCategory: [],
      monthlyData: [],
      recentIncomeEntries: [],
      recentExpenditureEntries: [],
      previousYearData: [],
      trendData: [],
      timeFrame
    },
    growthRate,
    activePercentage: memberStats?.totalMembers > 0 
      ? ((memberStats.activeMembers / memberStats.totalMembers) * 100).toFixed(1) 
      : "0.0"
  };

  // Calculate loading and error states
  const isLoading = 
    memberStatsLoading || 
    birthdaysLoading || 
    growthLoading || 
    eventsLoading || 
    financialLoading;

  const error = 
    memberStatsError || 
    birthdaysError || 
    growthError || 
    eventsError || 
    financialError;

  return {
    data: dashboardData,
    isLoading,
    error
  };
}
