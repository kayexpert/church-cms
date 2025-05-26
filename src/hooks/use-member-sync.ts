/**
 * Custom hook for member synchronization
 * Ensures consistent updates across all member-related queries
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { memberKeys } from '@/providers/query-config';

export function useMemberSync() {
  const queryClient = useQueryClient();

  // Force refresh all member-related queries
  const refreshMemberQueries = useCallback(async () => {
    console.log('Refreshing all member queries...');
    
    // Invalidate and refetch all member list queries
    await queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) &&
               queryKey.length >= 2 &&
               queryKey[0] === 'members' &&
               queryKey[1] === 'list';
      }
    });

    // Invalidate stats and other member-related queries
    queryClient.invalidateQueries({ queryKey: memberKeys.stats });
    queryClient.invalidateQueries({ queryKey: ["activeMembers"] });
    
    console.log('Member queries refreshed successfully');
  }, [queryClient]);

  // Sync specific member after update
  const syncMemberUpdate = useCallback(async (memberId: string) => {
    console.log(`Syncing member update for ID: ${memberId}`);
    
    // First, invalidate the specific member detail
    queryClient.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
    
    // Then refresh all list queries to ensure consistency
    await refreshMemberQueries();
    
    // Small delay to ensure all updates are processed
    setTimeout(() => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === 'members';
        }
      });
    }, 500);
    
    console.log(`Member sync completed for ID: ${memberId}`);
  }, [queryClient, refreshMemberQueries]);

  // Sync after member deletion
  const syncMemberDeletion = useCallback(async (memberId: string) => {
    console.log(`Syncing member deletion for ID: ${memberId}`);
    
    // Remove the specific member from cache
    queryClient.removeQueries({ queryKey: memberKeys.detail(memberId) });
    
    // Refresh all list queries
    await refreshMemberQueries();
    
    console.log(`Member deletion sync completed for ID: ${memberId}`);
  }, [queryClient, refreshMemberQueries]);

  // Sync after member addition
  const syncMemberAddition = useCallback(async () => {
    console.log('Syncing member addition...');
    
    // Refresh all list queries to include the new member
    await refreshMemberQueries();
    
    console.log('Member addition sync completed');
  }, [refreshMemberQueries]);

  return {
    refreshMemberQueries,
    syncMemberUpdate,
    syncMemberDeletion,
    syncMemberAddition,
  };
}
