"use client";

import { Suspense, useCallback, memo, lazy, useMemo } from "react";

// Force dynamic rendering for pages using search params
export const dynamic = 'force-dynamic';
import { Layout } from "@/components/layout";
import { MessagingSidebar } from "@/components/messaging/messaging-sidebar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessageScheduler } from "@/hooks/use-message-scheduler";
import { useMessagingTabs } from "@/hooks/use-messaging-tabs";
// Performance monitor removed for production optimization

// Enhanced lazy loading with preloading and error boundaries
const QuickMessageTab = lazy(() =>
  import("@/components/messaging/quick-message-tab")
    .then(mod => ({ default: mod.QuickMessageTab }))
    .catch(error => {
      console.error('Failed to load QuickMessageTab:', error);
      return { default: () => <div>Error loading Quick Message tab</div> };
    })
);

const GroupMessageTab = lazy(() =>
  import("@/components/messaging/group-message-tab")
    .then(mod => ({ default: mod.GroupMessageTab }))
    .catch(error => {
      console.error('Failed to load GroupMessageTab:', error);
      return { default: () => <div>Error loading Group Message tab</div> };
    })
);

const BirthdayMessageTab = lazy(() =>
  import("@/components/messaging/birthday-message-tab")
    .then(mod => ({ default: mod.BirthdayMessageTab }))
    .catch(error => {
      console.error('Failed to load BirthdayMessageTab:', error);
      return { default: () => <div>Error loading Birthday Message tab</div> };
    })
);

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

// Preload components based on user interaction patterns
const preloadComponents = () => {
  // Preload the most commonly used tabs
  import("@/components/messaging/quick-message-tab");
  import("@/components/messaging/group-message-tab");
};

// Main component
function MessagingPageContent() {
  // Use custom hooks for tab management and message scheduling
  const { activeTab, setActiveTab } = useMessagingTabs();

  // Start message schedulers using custom hook (keep for background scheduling)
  useMessageScheduler();

  // Memoized tab components map for better performance
  const tabComponents = useMemo(() => ({
    'quick-message': QuickMessageTab,
    'group-message': GroupMessageTab,
    'birthday-message': BirthdayMessageTab
  }), []);

  // Memoized fallback component
  const fallbackComponent = useMemo(() => (
    <Card className="p-6">
      <MessageTabSkeleton />
    </Card>
  ), []);

  // Memoized content renderer to prevent unnecessary re-renders
  const renderContent = useCallback(() => {
    const TabComponent = tabComponents[activeTab];

    if (!TabComponent) {
      console.error(`Unknown tab: ${activeTab}`);
      return fallbackComponent;
    }

    return (
      <Suspense fallback={fallbackComponent}>
        <TabComponent />
      </Suspense>
    );
  }, [activeTab, tabComponents, fallbackComponent]);

  // Preload components on hover for better UX
  const handleSidebarHover = useCallback(() => {
    preloadComponents();
  }, []);

  // Memoized layout to prevent unnecessary re-renders
  const layoutContent = useMemo(() => (
    <div className="space-y-6">
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        <div
          className="md:col-span-1 lg:col-span-1"
          onMouseEnter={handleSidebarHover}
        >
          <MessagingSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  ), [activeTab, setActiveTab, renderContent, handleSidebarHover]);

  return (
    <Layout title="Messaging">
      {layoutContent}
    </Layout>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
function MessagingPage() {
  return (
    <Suspense fallback={
      <Layout title="Messaging">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="md:col-span-1 lg:col-span-1">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    }>
      <MessagingPageContent />
    </Suspense>
  );
}

// Export memoized component for better performance
export default memo(MessagingPage);
