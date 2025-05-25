"use client";

import { Suspense, useCallback, memo, lazy } from "react";
import { Layout } from "@/components/layout";
import { MessagingSidebar } from "@/components/messaging/messaging-sidebar";
import { MessagingSettingsLink } from "@/components/messaging/settings-link";
import { ProcessScheduledMessagesButton } from "@/components/messaging/process-scheduled-messages-button";
import { TriggerCronButton } from "@/components/messaging/trigger-cron-button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessageScheduler } from "@/hooks/use-message-scheduler";
import { useMessagingTabs } from "@/hooks/use-messaging-tabs";

// Lazy load components for better code splitting
const QuickMessageTab = lazy(() => import("@/components/messaging/quick-message-tab").then(mod => ({ default: mod.QuickMessageTab })));
const GroupMessageTab = lazy(() => import("@/components/messaging/group-message-tab").then(mod => ({ default: mod.GroupMessageTab })));
const BirthdayMessageTab = lazy(() => import("@/components/messaging/birthday-message-tab").then(mod => ({ default: mod.BirthdayMessageTab })));

// Unified skeleton loader for better maintainability and consistency
const MessageTabSkeleton = memo(function MessageTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
});

// Main component
function MessagingPageContent() {
  // Use custom hooks for tab management and message scheduling
  const { activeTab, setActiveTab } = useMessagingTabs();

  // Start message schedulers using custom hook
  const { isRunning: schedulersRunning } = useMessageScheduler();

  // Memoized content renderer to prevent unnecessary re-renders
  const renderContent = useCallback(() => {
    // Common fallback for all tabs
    const getFallback = () => (
      <Card className="p-6">
        <MessageTabSkeleton />
      </Card>
    );

    // Map of tab types to their components
    const tabComponents = {
      'quick-message': QuickMessageTab,
      'group-message': GroupMessageTab,
      'birthday-message': BirthdayMessageTab
    };

    const TabComponent = tabComponents[activeTab];

    return (
      <Suspense fallback={getFallback()}>
        <TabComponent />
      </Suspense>
    );
  }, [activeTab]);

  return (
    <Layout title="Messaging">
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 flex items-center gap-2">
          <ProcessScheduledMessagesButton />
          <TriggerCronButton />
          {!schedulersRunning && (
            <span className="text-xs text-amber-500">
              Scheduler inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MessagingSettingsLink />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-16 md:pb-0">
        <div className="md:col-span-1 lg:col-span-1">
          <MessagingSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}

// Export memoized component for better performance
export default memo(MessagingPageContent);
