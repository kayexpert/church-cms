/**
 * Global React Query configuration
 */

// Default stale time for queries (5 minutes)
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

// Default garbage collection time for queries (30 minutes) - renamed from cacheTime in v5
export const DEFAULT_GC_TIME = 30 * 60 * 1000;

// Dashboard stale time (1 minute)
export const DASHBOARD_STALE_TIME = 1 * 60 * 1000;

// Real-time data stale time (30 seconds)
export const REALTIME_STALE_TIME = 30 * 1000;

// Default configuration for React Query v5
export const defaultQueryConfig = {
  queries: {
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME, // Updated from cacheTime to gcTime in v5
    refetchOnWindowFocus: false, // Disable for better performance, enable selectively
    refetchOnMount: true, // Refetch on component mount
    retry: 1,
    // Improved error handling
    throwOnError: false,
  },
};

// Define base keys first to avoid circular references
const MEMBERS_BASE = ['members'] as const;

// Member-specific query keys
export const memberKeys = {
  all: MEMBERS_BASE,
  lists: () => [...MEMBERS_BASE, 'list'] as const,
  list: (filters: Record<string, any>) => [...MEMBERS_BASE, 'list', filters] as const,
  details: () => [...MEMBERS_BASE, 'detail'] as const,
  detail: (id: string) => [...MEMBERS_BASE, 'detail', id] as const,

  // Dashboard components
  dashboard: {
    all: [...MEMBERS_BASE, 'dashboard'] as const,
    stats: [...MEMBERS_BASE, 'dashboard', 'stats'] as const,
    growth: [...MEMBERS_BASE, 'dashboard', 'growth'] as const,
    attendance: [...MEMBERS_BASE, 'dashboard', 'attendance'] as const,
    birthdays: {
      upcoming: (days: number) => [...MEMBERS_BASE, 'dashboard', 'birthdays', 'upcoming', days] as const,
      thisMonth: [...MEMBERS_BASE, 'dashboard', 'birthdays', 'thisMonth'] as const,
    },
    distribution: {
      gender: [...MEMBERS_BASE, 'dashboard', 'distribution', 'gender'] as const,
      status: [...MEMBERS_BASE, 'dashboard', 'distribution', 'status'] as const,
      department: [...MEMBERS_BASE, 'dashboard', 'distribution', 'department'] as const,
    },
  },

  // Legacy keys for backward compatibility
  stats: ['memberStats'] as const,
  growth: ['memberGrowth'] as const,
  distribution: {
    gender: ['genderDistribution'] as const,
    status: ['statusDistribution'] as const,
    department: ['departmentDistribution'] as const,
  },
  birthdays: {
    upcoming: (days: number) => ['upcomingBirthdays', days] as const,
    thisMonth: ['birthdaysThisMonth'] as const,
  },
  attendance: {
    trend: ['attendanceTrend'] as const,
    records: (filters?: Record<string, any>) => ['attendanceRecords', filters] as const,
  },
};
