"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { memberKeys } from "@/providers/query-config";

/**
 * Hook to set up real-time subscriptions for member data
 * This hook subscribes to changes in members table
 * and invalidates the appropriate queries when changes are detected
 *
 * @returns An object with the subscription status
 */
export function useMemberRealTimeSubscriptions() {
  const queryClient = useQueryClient();
  const subscriptionsRef = useRef<{ unsubscribe: () => void }[]>([]);

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to member changes
    const memberSubscription = supabase
      .channel('member-changes')
      .on('postgres_changes', {
        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'members'
      }, (payload) => {

        // Selectively invalidate only the affected components
        // For member changes, we need to update:
        // 1. Stats cards (totalMembers, activeMembers, etc.)
        // 2. Growth chart (if a new member is added)
        // 3. Gender distribution (if gender is changed)

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: memberKeys.dashboard.stats
        });

        // Invalidate growth data
        queryClient.invalidateQueries({
          queryKey: memberKeys.dashboard.growth
        });

        // Invalidate gender distribution
        queryClient.invalidateQueries({
          queryKey: memberKeys.dashboard.distribution.gender
        });

        // Also invalidate the legacy query keys for backward compatibility
        queryClient.invalidateQueries({
          queryKey: memberKeys.stats
        });
        queryClient.invalidateQueries({
          queryKey: memberKeys.growth
        });
        queryClient.invalidateQueries({
          queryKey: memberKeys.distribution.gender
        });

        // Show a toast notification for new entries
        if (payload.eventType === 'INSERT') {
          toast.success('New member added', {
            description: 'The dashboard has been updated with the latest data.'
          });
        }
      })
      .subscribe();

    // Subscribe to attendance changes
    const attendanceSubscription = supabase
      .channel('attendance-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance'
      }, (payload) => {
        console.log('Attendance changed:', payload);

        // Selectively invalidate only the affected components
        // For attendance changes, we only need to update:
        // 1. Attendance trend chart

        // Invalidate attendance trend
        queryClient.invalidateQueries({
          queryKey: memberKeys.dashboard.attendance
        });

        // Also invalidate the legacy query key for backward compatibility
        queryClient.invalidateQueries({
          queryKey: memberKeys.attendance.trend
        });
      })
      .subscribe();

    // Subscribe to attendance records changes
    const attendanceRecordsSubscription = supabase
      .channel('attendance-records-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records'
      }, (payload) => {
        // Selectively invalidate only the affected components
        // For attendance record changes, we only need to update:
        // 1. Attendance trend chart

        // Invalidate attendance trend
        queryClient.invalidateQueries({
          queryKey: memberKeys.dashboard.attendance
        });

        // Also invalidate the legacy query key for backward compatibility
        queryClient.invalidateQueries({
          queryKey: memberKeys.attendance.trend
        });
      })
      .subscribe();

    // Store subscriptions for cleanup
    subscriptionsRef.current = [
      memberSubscription,
      attendanceSubscription,
      attendanceRecordsSubscription
    ];

    // Clean up subscriptions on unmount
    return () => {
      console.log("Cleaning up member real-time subscriptions");
      subscriptionsRef.current.forEach(subscription => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });

      // Clear the subscriptions array
      subscriptionsRef.current = [];
    };
  }, [queryClient]);

  return {
    isSubscribed: subscriptionsRef.current.length > 0
  };
}
