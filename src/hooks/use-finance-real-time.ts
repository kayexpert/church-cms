"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { financeKeys } from "@/lib/query-keys";
import { AccountBalanceService } from "@/services/account-balance-service";

/**
 * Hook to set up real-time subscriptions for finance data
 * This hook subscribes to changes in income_entries, expenditure_entries, and liability_entries
 * and invalidates the appropriate queries when changes are detected
 *
 * @param timeFrame The current time frame being viewed (month, quarter, year)
 * @returns An object with the subscription status
 */
export function useFinanceRealTimeSubscriptions(timeFrame: string = 'month') {
  const queryClient = useQueryClient();
  const subscriptionsRef = useRef<{ unsubscribe: () => void }[]>([]);

  // Set up real-time subscriptions
  useEffect(() => {
    console.log("Setting up finance real-time subscriptions");

    // Subscribe to income entries changes
    const incomeSubscription = supabase
      .channel('finance-income-changes')
      .on('postgres_changes', {
        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'income_entries'
      }, (payload) => {
        console.log('Income entry changed:', payload);

        // Selectively invalidate only the affected components
        // For income entries, we need to update:
        // 1. Stats cards (totalIncome, netCash)
        // 2. Monthly chart (income data points)
        // 3. Category distribution (income categories)
        // 4. Trend chart (uses the same monthly data)

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.stats(timeFrame)
        });

        // Invalidate monthly chart and trend chart (they share the same data)
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.monthlyChart(timeFrame)
        });
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.trendChart(timeFrame)
        });

        // Invalidate category distribution
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.categoryDistribution(timeFrame)
        });

        // Also invalidate the legacy query key for backward compatibility
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.all(timeFrame)
        });

        // Show a toast notification for new entries
        if (payload.eventType === 'INSERT') {
          toast.success('New income entry added', {
            description: 'The dashboard has been updated with the latest data.'
          });
        }
      })
      .subscribe();

    // Subscribe to expenditure entries changes
    const expenditureSubscription = supabase
      .channel('finance-expenditure-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenditure_entries'
      }, (payload) => {
        // Selectively invalidate only the affected components
        // For expenditure entries, we need to update:
        // 1. Stats cards (totalExpenditure, netCash)
        // 2. Monthly chart (expenditure data points)
        // 3. Category distribution (expenditure categories)
        // 4. Trend chart (uses the same monthly data)

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.stats(timeFrame)
        });

        // Invalidate monthly chart and trend chart (they share the same data)
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.monthlyChart(timeFrame)
        });
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.trendChart(timeFrame)
        });

        // Invalidate category distribution
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.categoryDistribution(timeFrame)
        });

        // Also invalidate the legacy query key for backward compatibility
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.all(timeFrame)
        });

        // Show a toast notification for new entries
        if (payload.eventType === 'INSERT') {
          toast.success('New expenditure entry added', {
            description: 'The dashboard has been updated with the latest data.'
          });
        }
      })
      .subscribe();

    // Subscribe to liability entries changes
    const liabilitySubscription = supabase
      .channel('finance-liability-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'liability_entries'
      }, (payload) => {
        console.log('Liability entry changed:', payload);

        // Selectively invalidate only the affected components
        // For liability entries, we only need to update:
        // 1. Stats cards (totalLiabilities)

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.stats(timeFrame)
        });

        // Also invalidate the legacy query key for backward compatibility
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.all(timeFrame)
        });

        // Show a toast notification for new entries
        if (payload.eventType === 'INSERT') {
          toast.success('New liability entry added', {
            description: 'The dashboard has been updated with the latest data.'
          });
        }
      })
      .subscribe();

    // Subscribe to account changes
    const accountSubscription = supabase
      .channel('finance-account-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'accounts'
      }, (payload) => {
        // For account changes, we don't need to update any dashboard components
        // as accounts themselves don't directly affect the dashboard data
        // However, we'll invalidate the legacy query key for backward compatibility
        queryClient.invalidateQueries({
          queryKey: financeKeys.dashboard.all(timeFrame)
        });
      })
      .subscribe();

    // Store subscriptions for cleanup
    subscriptionsRef.current = [
      incomeSubscription,
      expenditureSubscription,
      liabilitySubscription,
      accountSubscription
    ];

    // Clean up subscriptions on unmount
    return () => {
      console.log("Cleaning up finance real-time subscriptions");
      subscriptionsRef.current.forEach(subscription => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });

      // Clear the subscriptions array
      subscriptionsRef.current = [];
    };
  }, [queryClient, timeFrame]);

  return {
    isSubscribed: subscriptionsRef.current.length > 0
  };
}
