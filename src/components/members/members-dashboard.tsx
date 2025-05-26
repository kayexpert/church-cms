"use client";

import { useMemo } from "react";
import {
  Users,
  Cake,
  TrendingUp,
  BarChart2,
  Activity,
  CalendarCheck,
  User,
  UserCircle,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientCard } from "@/components/ui/gradient-card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from "recharts";
import { useQueryClient } from "@tanstack/react-query";
// Import new component-specific hooks
import {
  useMemberDashboardStats,
  useMemberGenderDistribution,
  useMemberGrowthData,
  useMemberAttendanceTrend,
  useMemberUpcomingBirthdays,
  useMemberBirthdaysThisMonth
} from "@/hooks/use-member-dashboard-components";
import { useMemberRealTimeSubscriptions } from "@/hooks/use-member-real-time";
import { memberKeys } from "@/providers/query-config";

// Import dashboard components
import { StatCards } from "./dashboard/stat-cards";
import { MembershipGrowthChart } from "./dashboard/membership-growth-chart";
import { AttendanceTrendChart } from "./dashboard/attendance-trend-chart";
import { UpcomingBirthdaysCard } from "./dashboard/upcoming-birthdays-card";

// Import component-specific skeletons
import {
  StatsCardsSkeleton,
  MembershipGrowthChartSkeleton,
  AttendanceTrendChartSkeleton,
  UpcomingBirthdaysCardSkeleton
} from "./dashboard/component-skeletons";

// Default colors for charts
const COLORS = ["#10B981", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#14B8A6"];

/**
 * Calculate growth rate based on member growth data
 * Compares the sum of the last 3 months with the sum of the previous 3 months
 */
function calculateGrowthRate(data: { month: string; members: number }[]): string {
  if (!data || data.length < 6) return "0.0";

  // Get the last 6 months of data
  const lastSixMonths = [...data].slice(-6);

  // Calculate sum of the last 3 months
  const lastThreeMonths = lastSixMonths.slice(-3);
  const lastThreeMonthsSum = lastThreeMonths.reduce((sum, item) => sum + item.members, 0);

  // Calculate sum of the previous 3 months
  const previousThreeMonths = lastSixMonths.slice(0, 3);
  const previousThreeMonthsSum = previousThreeMonths.reduce((sum, item) => sum + item.members, 0);

  // Calculate growth rate
  if (previousThreeMonthsSum === 0) {
    return lastThreeMonthsSum > 0 ? "100.0" : "0.0";
  }

  const growthRate = ((lastThreeMonthsSum - previousThreeMonthsSum) / previousThreeMonthsSum) * 100;
  return growthRate.toFixed(1);
}

interface MembersDashboardProps {
  initialStats?: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    newMembersThisMonth: number;
  } | null;
}

export function MembersDashboard({ initialStats = null }: MembersDashboardProps = {}) {
  const queryClient = useQueryClient();

  // Set up real-time subscriptions
  useMemberRealTimeSubscriptions();

  // Use component-specific hooks for data fetching
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useMemberDashboardStats(initialStats);

  const {
    data: memberGrowthData,
    isLoading: growthLoading,
    error: growthError,
    refetch: refetchGrowth
  } = useMemberGrowthData();

  const {
    data: attendanceTrendData,
    isLoading: attendanceLoading,
    refetch: refetchAttendance
  } = useMemberAttendanceTrend();

  const {
    data: upcomingBirthdays,
    isLoading: birthdaysLoading,
    refetch: refetchBirthdays
  } = useMemberUpcomingBirthdays(30);

  const {
    data: genderData,
    isLoading: genderLoading,
    refetch: refetchGender
  } = useMemberGenderDistribution();

  const {
    data: birthdaysThisMonth,
    isLoading: birthdaysThisMonthLoading,
    refetch: refetchBirthdaysThisMonth
  } = useMemberBirthdaysThisMonth();

  // Determine overall loading state - memoized to prevent unnecessary re-renders
  const isLoading = useMemo(() =>
    statsLoading || growthLoading || attendanceLoading ||
    birthdaysLoading || genderLoading || birthdaysThisMonthLoading,
    [statsLoading, growthLoading, attendanceLoading, birthdaysLoading, genderLoading, birthdaysThisMonthLoading]
  );

  // Determine if there's an error
  const error = statsError ? (statsError instanceof Error ? statsError.message : "Failed to fetch member statistics") : null;

  // Ensure stats object is defined with default values
  const safeStats = stats || {
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    newMembersThisMonth: 0
  };

  // Calculate percentages
  const activePercentage = safeStats.totalMembers > 0
    ? ((safeStats.activeMembers / safeStats.totalMembers) * 100).toFixed(1)
    : "0";

  const inactivePercentage = safeStats.totalMembers > 0
    ? ((safeStats.inactiveMembers / safeStats.totalMembers) * 100).toFixed(1)
    : "0";

  // Memoize the data for the components - IMPORTANT: Must be before any conditional returns
  const statsData = useMemo(() => {
    return {
      stats: safeStats,
      activePercentage,
      inactivePercentage,
      genderData: {
        maleCount: genderData?.find(item => item.name === 'Male')?.value || 0,
        femaleCount: genderData?.find(item => item.name === 'Female')?.value || 0
      },
      attendanceRate: attendanceTrendData && attendanceTrendData.length > 0
        ? (attendanceTrendData.reduce((sum, item) => sum + item.rate, 0) / attendanceTrendData.length).toFixed(1)
        : "0.0",
      birthdaysThisMonth: birthdaysThisMonth || 0
    };
  }, [safeStats, activePercentage, inactivePercentage, genderData, attendanceTrendData, birthdaysThisMonth]);

  // Calculate growth rate for the membership chart - IMPORTANT: Must be before any conditional returns
  const growthRate = useMemo(() => {
    return calculateGrowthRate(memberGrowthData || []);
  }, [memberGrowthData]);

  // We've removed the internal skeleton loader to prevent duplicate skeletons
  // The skeleton is now handled by the Suspense fallback in the parent component

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-destructive/10 rounded-full p-6 mb-4">
          <Users className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Error loading dashboard</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Check if there are no members
  if (safeStats.totalMembers === 0) {
    return (
      <div className="space-y-6">
        {/* Stat Cards - Always show these even with zero values */}
        <StatCards data={statsData} />

        {/* Empty state message */}
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg border shadow-sm">
          <div className="bg-muted rounded-full p-6 mb-4">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Members Found</h3>
          <p className="text-muted-foreground mb-6">Add members to see statistics and analytics</p>
          <button
            onClick={() => window.location.href = '/members/add'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Members
          </button>
        </div>
      </div>
    );
  }

  // Function to manually refresh all dashboard data
  // Defined before any conditional returns to maintain hook order
  const refreshDashboard = () => {
    // Selectively invalidate queries based on what's visible on the dashboard
    queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.stats });
    queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.growth });
    queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.attendance });
    queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.birthdays.upcoming(30) });
    queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.distribution.gender });
    queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.birthdays.thisMonth });

    // Also invalidate legacy query keys for backward compatibility
    queryClient.invalidateQueries({ queryKey: memberKeys.stats });

    // Directly refetch all data to update the UI immediately
    refetchStats();
    refetchGrowth();
    refetchAttendance();
    refetchBirthdays();
    refetchGender();
    refetchBirthdaysThisMonth();
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <button
          onClick={refreshDashboard}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 hover:bg-muted/80 border border-border/50 transition-all duration-200 hover:scale-105 active:scale-95"
          title="Refresh Dashboard"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stat Cards */}
      {statsLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <StatCards data={statsData} />
      )}

      {/* Membership Growth Chart */}
      {growthLoading ? (
        <MembershipGrowthChartSkeleton />
      ) : (
        <MembershipGrowthChart
          data={memberGrowthData || []}
          growthRate={growthRate}
        />
      )}

      <div className="grid gap-6 md:grid-cols-3 h-[450px]">
        {/* Attendance Trend Chart - Takes 2/3 of the space */}
        <div className="md:col-span-2 h-full">
          {attendanceLoading ? (
            <AttendanceTrendChartSkeleton />
          ) : (
            <AttendanceTrendChart data={attendanceTrendData || []} />
          )}
        </div>

        {/* Upcoming Birthdays Card - Takes 1/3 of the space */}
        <div className="md:col-span-1 h-[465px]">
          {birthdaysLoading ? (
            <UpcomingBirthdaysCardSkeleton />
          ) : (
            <UpcomingBirthdaysCard data={upcomingBirthdays || []} />
          )}
        </div>
      </div>
    </div>
  );
}
