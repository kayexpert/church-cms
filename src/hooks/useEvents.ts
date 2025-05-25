import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEvents,
  getEventById,
  getUpcomingEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  getEventCategories,
  Event,
  EventWithCategory,
  EventCategory
} from '@/services/event-service';

// Query key factory for better cache management
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  categories: ['eventCategories'] as const,
  upcoming: (days: number = 7) => [...eventKeys.all, 'upcoming', days] as const,
};

/**
 * Hook for fetching events with optional filtering
 */
export function useEvents(options?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  categoryId?: string;
  departmentId?: string;
  refreshTrigger?: number;
}) {
  const { refreshTrigger, ...queryOptions } = options || {};

  // Create a stable filter object for query key
  const filters = {
    ...queryOptions,
    refreshKey: refreshTrigger,
  };

  return useQuery<any, Error, EventWithCategory[]>({
    queryKey: eventKeys.list(filters),
    queryFn: () => getEvents(queryOptions),
    select: (response) => {
      if (response && response.data) {
        return response.data;
      }
      return [];
    },
    // Add better error handling
    onError: (error) => {
      console.error('Error in useEvents hook:', error);
    },
    // Return empty array on error instead of throwing
    useErrorBoundary: false,
    // Retry failed requests a few times
    retry: 2,
    // Consistent caching strategy
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in React Query v5)
    // Add a refetch interval for real-time updates
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for fetching upcoming events
 */
export function useUpcomingEvents(days: number = 7, refreshTrigger: number = 0) {
  return useQuery({
    queryKey: eventKeys.upcoming(days),
    queryFn: () => getUpcomingEvents(days),
    select: (response) => {
      if (response && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for fetching a single event by ID
 */
export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEventById(id),
    select: (response) => response.data,
    enabled: !!id, // Only run the query if an ID is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for fetching event categories
 */
export function useEventCategories() {
  return useQuery<any, Error, EventCategory[]>({
    queryKey: eventKeys.categories,
    queryFn: () => getEventCategories(),
    select: (response) => {
      if (response && response.data) {
        return response.data;
      }
      return [];
    },
    // Add better error handling
    onError: (error) => {
      console.error('Error in useEventCategories hook:', error);
    },
    // Return empty array on error instead of throwing
    useErrorBoundary: false,
    // Retry failed requests a few times
    retry: 2,
    // Improved caching strategy
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change less frequently
    gcTime: 60 * 60 * 1000, // 60 minutes (renamed from cacheTime in React Query v5)
  });
}

/**
 * Hook for event mutations (add, update, delete)
 */
export function useEventMutations() {
  const queryClient = useQueryClient();

  const addEventMutation = useMutation({
    mutationFn: (newEvent: Omit<Event, 'id' | 'created_at' | 'updated_at'>) =>
      addEvent(newEvent),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming() });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, event }: { id: string; event: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>> }) => {
      return updateEvent(id, event);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming() });
    },
  });

  return {
    addEventMutation,
    updateEventMutation,
    deleteEventMutation,
  };
}

/**
 * Hook for event category mutations (add, update, delete)
 */
export function useEventCategoryMutations() {
  const queryClient = useQueryClient();

  const addEventCategoryMutation = useMutation({
    mutationFn: (newCategory: Omit<EventCategory, 'id'>) =>
      addEventCategory(newCategory),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: eventKeys.categories });
    },
  });

  const updateEventCategoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: Partial<Omit<EventCategory, 'id'>> }) =>
      updateEventCategory(id, category),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: eventKeys.categories });
    },
  });

  const deleteEventCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteEventCategory(id),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: eventKeys.categories });
    },
  });

  return {
    addEventCategoryMutation,
    updateEventCategoryMutation,
    deleteEventCategoryMutation,
  };
}
