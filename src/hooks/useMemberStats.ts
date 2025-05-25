import { useQuery } from '@tanstack/react-query';
import {
  getMemberStats,
  getGenderDistribution,
  getDepartmentDistribution,
  getUpcomingBirthdays,
  getStatusDistribution,
  getMemberGrowth,
  getAttendanceTrend,
  getBirthdaysThisMonth
} from '@/services/member-service';
import { memberKeys } from '@/providers/query-config';

/**
 * Hook for fetching member statistics
 * @param initialStats Optional initial stats data from server
 */
export function useMemberStats(initialStats: {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  newMembersThisMonth: number;
} | null = null) {
  const defaultStats = {
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    newMembersThisMonth: 0
  };

  return useQuery({
    queryKey: memberKeys.stats,
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
    staleTime: 0, // Always refetch on mount
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
 * Hook for fetching gender distribution
 */
export function useGenderDistribution() {
  // First check if there are any members before fetching gender data
  const { data: stats } = useMemberStats();

  return useQuery({
    queryKey: memberKeys.distribution.gender,
    queryFn: () => getGenderDistribution(),
    select: (response) => {
      // If there are no members, return empty array regardless of what the API returns
      if (!stats || stats.totalMembers === 0) {
        return [];
      }
      return response.data || []; // Otherwise return the actual data
    },
    // Use a shorter stale time for dashboard stats to ensure more frequent updates
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => []
  });
}

/**
 * Hook for fetching member status distribution
 */
export function useStatusDistribution() {
  // First check if there are any members before fetching status data
  const { data: stats } = useMemberStats();

  return useQuery({
    queryKey: memberKeys.distribution.status,
    queryFn: () => getStatusDistribution(),
    select: (response) => {
      // If there are no members, return empty array regardless of what the API returns
      if (!stats || stats.totalMembers === 0) {
        return [];
      }
      return response.data || []; // Otherwise return the actual data
    },
    // Use a shorter stale time for dashboard stats to ensure more frequent updates
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => []
  });
}

/**
 * Hook for fetching department distribution
 */
export function useDepartmentDistribution() {
  // First check if there are any members before fetching department data
  const { data: stats } = useMemberStats();

  return useQuery({
    queryKey: memberKeys.distribution.department,
    queryFn: () => getDepartmentDistribution(),
    select: (response) => {
      // If there are no members, return empty array regardless of what the API returns
      if (!stats || stats.totalMembers === 0) {
        return [];
      }
      return response.data || []; // Otherwise return the actual data
    },
    // Use a shorter stale time for dashboard stats to ensure more frequent updates
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => []
  });
}

/**
 * Hook for fetching member growth data
 */
export function useMemberGrowth() {
  // First check if there are any members before fetching growth data
  const { data: stats } = useMemberStats();

  return useQuery({
    queryKey: memberKeys.growth,
    queryFn: () => getMemberGrowth(),
    select: (response) => {
      // If there are no members, return empty array regardless of what the API returns
      if (!stats || stats.totalMembers === 0) {
        return [];
      }
      return response.data || []; // Otherwise return the actual data
    },
    // Use a shorter stale time for dashboard stats to ensure more frequent updates
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => {
      console.error('Error fetching member growth data');
      return [];
    }
  });
}

/**
 * Hook for fetching attendance trend data
 */
export function useAttendanceTrend() {
  // First check if there are any members before fetching attendance data
  const { data: stats } = useMemberStats();

  return useQuery({
    queryKey: memberKeys.attendance.trend,
    queryFn: () => getAttendanceTrend(),
    select: (response) => {
      // If there are no members, return empty array regardless of what the API returns
      if (!stats || stats.totalMembers === 0) {
        return [];
      }
      return response.data || []; // Otherwise return the actual data
    },
    // Use a shorter stale time for dashboard stats to ensure more frequent updates
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: () => {
      console.error('Error fetching attendance trend data');
      return [];
    }
  });
}

/**
 * Hook for fetching birthdays in the current month
 */
export function useBirthdaysThisMonth() {
  // First check if there are any members before fetching birthday data
  const { data: stats } = useMemberStats();

  return useQuery({
    queryKey: memberKeys.birthdays.thisMonth,
    queryFn: () => getBirthdaysThisMonth(),
    select: (response) => {
      // If there are no members, return 0 regardless of what the API returns
      if (!stats || stats.totalMembers === 0) {
        return 0;
      }
      return response.data || 0; // Ensure we always return a number
    },
    onError: () => {
      console.error('Error fetching birthdays this month');
      return 0;
    }
  });
}

/**
 * Hook for fetching upcoming birthdays
 */
export function useUpcomingBirthdays(days: number = 30) {
  // First check if there are any members before fetching birthday data
  const { data: stats } = useMemberStats();

  return useQuery({
    queryKey: memberKeys.birthdays.upcoming(days),
    queryFn: () => getUpcomingBirthdays(days),
    select: (response) => {
      // If there are no members, return empty array regardless of what the API returns
      if (!stats || stats.totalMembers === 0) {
        return [];
      }
      return response.data || []; // Ensure we always return an array
    },
    // Return empty array on error
    onError: (error) => {
      console.error('Error fetching upcoming birthdays:', error);
      return [];
    }
  });
}
