import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMembers,
  getMemberById,
  addMember,
  updateMember,
  deleteMember,
  Member
} from '@/services/member-service';
import { memberKeys } from '@/providers/query-config';
import { useMemo, useEffect, useCallback } from 'react';
import { useMemberSync } from './use-member-sync';

/**
 * Hook for fetching members with optional filtering and pagination
 * Optimized for performance with proper memoization and prefetching
 */
export function useMembers(options: {
  status?: 'active' | 'inactive';
  search?: string;
  page?: number;
  pageSize?: number;
  refreshTrigger?: number;
  initialData?: any;
} = {}) {
  const { refreshTrigger, initialData, ...queryOptions } = options;
  const queryClient = useQueryClient();

  // Memoize the query options to prevent unnecessary re-renders
  // Extract individual properties to avoid object reference changes
  const { status, search, page, pageSize } = queryOptions;

  const memoizedOptions = useMemo(() => ({
    status,
    search,
    page,
    pageSize
  }), [status, search, page, pageSize]);

  // Memoize the query key to prevent unnecessary re-renders
  const queryKey = useMemo(
    () => memberKeys.list({ ...memoizedOptions, refreshTrigger }),
    [memoizedOptions, refreshTrigger]
  );

  // Prefetch next page when current page is loaded
  useEffect(() => {
    if (page && pageSize) {
      const nextPage = page + 1;

      // Use a small delay to prioritize current page loading
      const prefetchTimer = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: memberKeys.list({
            ...memoizedOptions,
            page: nextPage,
            refreshTrigger
          }),
          queryFn: () => getMembers({
            ...memoizedOptions,
            page: nextPage
          }),
        });
      }, 300);

      return () => clearTimeout(prefetchTimer);
    }
  }, [queryClient, memoizedOptions, page, pageSize, refreshTrigger]);

  // Use stale time to reduce unnecessary refetches
  return useQuery({
    queryKey,
    queryFn: () => getMembers(memoizedOptions),
    select: (response) => {
      // Handle the new data structure with pagination
      if (response && response.data) {
        return response.data;
      }
      return { data: [], count: 0 };
    },
    initialData,
    keepPreviousData: true, // Keep previous data while fetching new data
    staleTime: 60000, // 60 seconds - reduce refetches for better performance
    // Add retry configuration to handle transient errors
    retry: (failureCount, error) => {
      // Only retry a few times to avoid overwhelming the server
      if (failureCount > 2) return false;

      // Only retry for network errors or 5xx errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        return errorMessage.includes('network') ||
               errorMessage.includes('timeout') ||
               errorMessage.includes('500') ||
               errorMessage.includes('502') ||
               errorMessage.includes('503') ||
               errorMessage.includes('504');
      }

      return false;
    },
    // Add refetch configuration to reduce unnecessary refetches
    refetchOnWindowFocus: false, // Disable refetch on window focus for better performance
    refetchOnMount: true, // Enable refetch on mount to ensure data is fresh
    refetchOnReconnect: true, // Enable refetch on reconnect to ensure data is fresh after network issues
  });
}

/**
 * Hook for fetching a single member by ID
 * Optimized with proper caching and prefetching
 */
export function useMember(id: string | undefined) {
  const queryClient = useQueryClient();

  // Memoize the query key to prevent unnecessary re-renders
  const queryKey = useMemo(
    () => id ? memberKeys.detail(id) : null,
    [id]
  );

  // Prefetch related data when member is loaded
  useEffect(() => {
    if (id) {
      // Use a small delay to prioritize member data loading first
      const prefetchTimer = setTimeout(() => {
        // Prefetch member attendance data
        queryClient.prefetchQuery({
          queryKey: ['memberAttendance', id],
          queryFn: () => import('@/services/attendance-service')
            .then(module => module.getAttendanceByMember(id))
        });

        // Prefetch departments and certificates for better UX
        queryClient.prefetchQuery({
          queryKey: ['departments'],
          queryFn: () => import('@/services/member-service')
            .then(module => module.getDepartments())
        });

        queryClient.prefetchQuery({
          queryKey: ['certificates'],
          queryFn: () => import('@/services/member-service')
            .then(module => module.getCertificates())
        });
      }, 200);

      return () => clearTimeout(prefetchTimer);
    }
  }, [id, queryClient]);

  return useQuery({
    queryKey: queryKey || ['member', 'empty'],
    queryFn: () => (id ? getMemberById(id) : Promise.resolve({ data: null, error: null })),
    select: (response) => response.data,
    enabled: !!id, // Only run the query if id is provided
    staleTime: 60000, // 1 minute - reduce refetches for better performance
    cacheTime: 300000, // 5 minutes - keep in cache longer
  });
}

/**
 * Hook for member mutations (add, update, delete)
 * Optimized with selective query invalidation for better performance
 */
export function useMemberMutations() {
  const queryClient = useQueryClient();
  const { syncMemberUpdate, syncMemberDeletion, syncMemberAddition } = useMemberSync();

  // Helper function to selectively invalidate queries based on mutation type
  const invalidateQueries = useCallback((type: 'add' | 'update' | 'delete', id?: string) => {
    // Common invalidations for all mutation types
    queryClient.invalidateQueries({ queryKey: memberKeys.stats });

    // Selective invalidation based on mutation type
    if (type === 'add') {
      // For add, we need to invalidate all member list queries
      // Use predicate to match all member list queries regardless of filters
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) &&
                 queryKey.length >= 2 &&
                 queryKey[0] === 'members' &&
                 queryKey[1] === 'list';
        }
      });

      // Invalidate active members query used in finance forms
      queryClient.invalidateQueries({ queryKey: ["activeMembers"] });

      // Invalidate stats and distributions
      queryClient.invalidateQueries({ queryKey: memberKeys.stats });
      queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.stats });

      // Only invalidate these if they're already in the cache to avoid unnecessary fetches
      if (queryClient.getQueryData(memberKeys.distribution.gender)) {
        queryClient.invalidateQueries({ queryKey: memberKeys.distribution.gender });
      }

      if (queryClient.getQueryData(memberKeys.distribution.status)) {
        queryClient.invalidateQueries({ queryKey: memberKeys.distribution.status });
      }

      if (queryClient.getQueryData(memberKeys.growth)) {
        queryClient.invalidateQueries({ queryKey: memberKeys.growth });
      }

      if (queryClient.getQueryData(memberKeys.dashboard.distribution.gender)) {
        queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.distribution.gender });
      }

      if (queryClient.getQueryData(memberKeys.dashboard.distribution.status)) {
        queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.distribution.status });
      }
    }
    else if (type === 'update' && id) {
      // For update, we need to invalidate all member list queries to ensure consistency
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) &&
                 queryKey.length >= 2 &&
                 queryKey[0] === 'members' &&
                 queryKey[1] === 'list';
        }
      });

      // Invalidate active members query used in finance forms (in case name or status changed)
      queryClient.invalidateQueries({ queryKey: ["activeMembers"] });

      // Invalidate the specific member detail
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });

      // Always invalidate distributions and stats as member updates can affect these
      queryClient.invalidateQueries({ queryKey: memberKeys.distribution.status });
      queryClient.invalidateQueries({ queryKey: memberKeys.distribution.gender });
      queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.distribution.status });
      queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.distribution.gender });
      queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.stats });
    }
    else if (type === 'delete' && id) {
      // For delete, we need to be thorough and invalidate all member list queries
      // Use predicate to match all member list queries regardless of filters
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) &&
                 queryKey.length >= 2 &&
                 queryKey[0] === 'members' &&
                 queryKey[1] === 'list';
        }
      });

      // Invalidate active members query used in finance forms
      queryClient.invalidateQueries({ queryKey: ["activeMembers"] });

      // Invalidate the specific member detail
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });

      // These are important to refresh after a delete
      queryClient.invalidateQueries({ queryKey: memberKeys.distribution.status });
      queryClient.invalidateQueries({ queryKey: memberKeys.distribution.gender });
      queryClient.invalidateQueries({ queryKey: memberKeys.stats });

      // Invalidate dashboard-related queries
      queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.stats });
      queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.distribution.status });
      queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.distribution.gender });

      // Only invalidate if they're in the cache
      if (queryClient.getQueryData(memberKeys.growth)) {
        queryClient.invalidateQueries({ queryKey: memberKeys.growth });
      }

      if (queryClient.getQueryData(memberKeys.dashboard.growth)) {
        queryClient.invalidateQueries({ queryKey: memberKeys.dashboard.growth });
      }
    }

    // Selectively invalidate birthday-related queries only if they're in the cache
    if (queryClient.getQueryData(memberKeys.birthdays.thisMonth)) {
      queryClient.invalidateQueries({ queryKey: memberKeys.birthdays.thisMonth });
    }

    if (queryClient.getQueryData(['upcomingBirthdays'])) {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'upcomingBirthdays'
      });
    }
  }, [queryClient]);

  const addMemberMutation = useMutation({
    mutationFn: (newMember: Omit<Member, 'id' | 'created_at' | 'updated_at'>) =>
      addMember(newMember),
    onSuccess: async () => {
      // Use the sync hook for consistent updates
      await syncMemberAddition();
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, member }: { id: string; member: Partial<Member> }) =>
      updateMember(id, member),
    onSuccess: async (result, variables) => {
      // Use the sync hook for consistent updates
      await syncMemberUpdate(variables.id);
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: async (_, id) => {
      // Use the sync hook for consistent updates
      await syncMemberDeletion(id);
    },
  });

  return {
    addMember: addMemberMutation,
    updateMember: updateMemberMutation,
    deleteMember: deleteMemberMutation,
  };
}
