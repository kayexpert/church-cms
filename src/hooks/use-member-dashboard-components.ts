"use client";

import { useQuery } from '@tanstack/react-query';
import {
  getMemberStats,
  getGenderDistribution,
  getUpcomingBirthdays,
  getMemberGrowth,
  getAttendanceTrend,
  getBirthdaysThisMonth
} from '@/services/member-service';
import { memberKeys } from '@/providers/query-config';

// Types
export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  newMembersThisMonth: number;
}

export interface DistributionData {
  name: string;
  value: number;
}

export interface GrowthData {
  month: string;
  members: number;
}

export interface AttendanceData {
  month: string;
  rate: number;
}

export interface MemberBirthday {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  profile_image?: string;
  days_until: number;
}

/**
 * Hook to fetch stats data for the members dashboard
 * @param initialStats Optional initial stats data from server
 * @returns Stats data and loading state
 */
export function useMemberDashboardStats(initialStats: MemberStats | null = null) {
  const defaultStats = {
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    newMembersThisMonth: 0
  };

  return useQuery({
    queryKey: memberKeys.dashboard.stats,
    queryFn: () => getMemberStats(),
    select: (response) => {
      // Ensure we always return a valid stats object
      if (!response || !response.data) {
        return defaultStats;
      }
      return response.data;
    },
    // Use initial data if provided
    initialData: initialStats ? { data: initialStats, error: null } : undefined,
    // Use a shorter stale time for dashboard stats to ensure more frequent updates
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Return default stats on error
    onError: () => {
      console.error('Error fetching member stats');
      return defaultStats;
    }
  });
}

/**
 * Hook to fetch gender distribution data for the members dashboard
 * @returns Gender distribution data and loading state
 */
export function useMemberGenderDistribution() {
  return useQuery({
    queryKey: memberKeys.dashboard.distribution.gender,
    queryFn: () => getGenderDistribution(),
    select: (response) => response.data || [],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => {
      console.error('Error fetching gender distribution');
      return [];
    }
  });
}

/**
 * Hook to fetch member growth data for the members dashboard
 * @returns Member growth data and loading state
 */
export function useMemberGrowthData() {
  return useQuery({
    queryKey: memberKeys.dashboard.growth,
    queryFn: () => getMemberGrowth(),
    select: (response) => response.data || [],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => {
      console.error('Error fetching member growth data');
      return [];
    }
  });
}

/**
 * Hook to fetch attendance trend data for the members dashboard
 * @returns Attendance trend data and loading state
 */
export function useMemberAttendanceTrend() {
  return useQuery({
    queryKey: memberKeys.dashboard.attendance,
    queryFn: () => getAttendanceTrend(),
    select: (response) => response.data || [],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => {
      console.error('Error fetching attendance trend data');
      return [];
    }
  });
}

/**
 * Hook to fetch upcoming birthdays for the members dashboard
 * @param days Number of days to look ahead for birthdays
 * @returns Upcoming birthdays data and loading state
 */
export function useMemberUpcomingBirthdays(days: number = 30) {
  return useQuery({
    queryKey: memberKeys.dashboard.birthdays.upcoming(days),
    queryFn: () => getUpcomingBirthdays(days),
    select: (response) => response.data || [],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => {
      console.error('Error fetching upcoming birthdays');
      return [];
    }
  });
}

/**
 * Hook to fetch birthdays this month for the members dashboard
 * @returns Number of birthdays this month and loading state
 */
export function useMemberBirthdaysThisMonth() {
  return useQuery({
    queryKey: memberKeys.dashboard.birthdays.thisMonth,
    queryFn: () => getBirthdaysThisMonth(),
    select: (response) => response.data || 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => {
      console.error('Error fetching birthdays this month');
      return 0;
    }
  });
}
