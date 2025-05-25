"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Layout } from "@/components/layout";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { MobileSettingsNav } from "@/components/settings/mobile-settings-nav";
import { GeneralSettings } from "@/components/settings/general-settings";
import { MembershipSettings } from "@/components/settings/membership-settings";
import { FinanceSettings } from "@/components/settings/finance-settings";
import { DatabaseSettings } from "@/components/settings/database-settings";
import { MessageSettingsWithSuspense } from "@/components/settings/message-settings";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GeneralSettingsSkeleton } from "@/components/settings/general/general-settings-skeleton";
import { MembershipSettingsSkeleton } from "@/components/settings/membership/membership-settings-skeleton";
import { FinanceSettingsSkeleton } from "@/components/settings/finance/finance-settings-skeleton";
import { DatabaseSettingsSkeleton } from "@/components/settings/database/database-settings-skeleton";
import { MessageSettingsSkeleton } from "@/components/settings/messages/message-settings-skeleton";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Handle tab change with URL update - optimized to avoid unnecessary refreshes
  const handleTabChange = useCallback((tab: string) => {
    if (tab === activeTab) {
      // If it's the same tab, don't force a refresh
      return;
    }

    setActiveTab(tab);

    // Update URL with the new tab
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);

    // Keep the section parameter if it exists
    const section = searchParams.get("section");
    if (section) {
      params.set("section", section);
    }

    router.push(`/settings?${params.toString()}`, { scroll: false });
  }, [activeTab, router, searchParams]);

  // Handle URL parameters for direct navigation
  useEffect(() => {
    const tab = searchParams.get("tab");
    const section = searchParams.get("section");

    if (tab && ["general", "membership", "finance", "database", "messages"].includes(tab)) {
      setActiveTab(tab);
    }

    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  // Memoized skeletons to prevent unnecessary re-renders
  const generalSkeleton = useMemo(() => (
    <Card className="p-6"><GeneralSettingsSkeleton /></Card>
  ), []);

  const membershipSkeleton = useMemo(() => (
    <Card className="p-6"><MembershipSettingsSkeleton /></Card>
  ), []);

  const financeSkeleton = useMemo(() => (
    <Card className="p-6"><FinanceSettingsSkeleton /></Card>
  ), []);

  const databaseSkeleton = useMemo(() => (
    <Card className="p-6"><DatabaseSettingsSkeleton /></Card>
  ), []);

  const messagesSkeleton = useMemo(() => (
    <Card className="p-6"><MessageSettingsSkeleton /></Card>
  ), []);

  // Render content based on active tab - memoized to prevent unnecessary re-renders
  const renderContent = useMemo(() => {
    switch (activeTab) {
      case "general":
        return (
          <Suspense fallback={generalSkeleton}>
            <GeneralSettings initialSection={activeSection} />
          </Suspense>
        );
      case "membership":
        return (
          <Suspense fallback={membershipSkeleton}>
            <MembershipSettings />
          </Suspense>
        );
      case "finance":
        return (
          <Suspense fallback={financeSkeleton}>
            <FinanceSettings />
          </Suspense>
        );
      case "database":
        return (
          <Suspense fallback={databaseSkeleton}>
            <DatabaseSettings />
          </Suspense>
        );
      case "messages":
        return (
          <Suspense fallback={messagesSkeleton}>
            <MessageSettingsWithSuspense />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={generalSkeleton}>
            <GeneralSettings initialSection={activeSection} />
          </Suspense>
        );
    }
  }, [activeTab, activeSection, generalSkeleton, membershipSkeleton, financeSkeleton, databaseSkeleton, messagesSkeleton]);

  return (
    <Layout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Mobile Settings Navigation (visible only on small screens) */}
        <div className="block lg:hidden mb-2">
          <MobileSettingsNav activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>

        {/* Desktop Sidebar (hidden on small screens) */}
        <div className="hidden lg:block lg:col-span-1">
          <SettingsSidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>

        {/* Content Area (full width on mobile, 3/4 on desktop) */}
        <div className="lg:col-span-3">
          {renderContent}
        </div>
      </div>
    </Layout>
  );
}
