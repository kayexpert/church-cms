'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageTabType } from '@/components/messaging/messaging-sidebar';

/**
 * Custom hook to manage messaging tabs with URL synchronization
 * 
 * @returns Object with active tab and setter function
 */
export function useMessagingTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MessageTabType>('quick-message');
  
  // Handle URL parameters for direct navigation
  useEffect(() => {
    const tab = searchParams.get('tab') as MessageTabType | null;
    const validTabs: MessageTabType[] = ['quick-message', 'group-message', 'birthday-message'];
    
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    } else if (tab) {
      // If an invalid tab is specified, update URL to default tab
      router.replace('/messaging?tab=quick-message');
    }
  }, [searchParams, router]);

  // Handle tab change with URL update
  const handleTabChange = useCallback((tab: MessageTabType) => {
    setActiveTab(tab);
    router.replace(`/messaging?tab=${tab}`);
  }, [router]);

  return {
    activeTab,
    setActiveTab: handleTabChange
  };
}
