"use client";

import { useState, Suspense, useEffect, useCallback, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Users,
  Calendar,
  Cake,
  UserCircle2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { memberKeys } from "@/providers/query-config";
import { getMembers } from "@/services/member-service";
import { MobileMembersTabs } from "@/components/members/mobile-members-tabs";
import {
  MembersDashboardSkeleton,
  MembersListSkeleton,
  AttendanceSkeleton,
  BirthdaysSkeleton
} from "@/components/members/members-consolidated-skeletons";
import { MembersListPage } from "@/components/members/members-list-page";
// Using MembersListSkeleton from consolidated skeletons

// Dynamically import components for code splitting
// Optimized with proper loading states and consistent patterns

// Consistent pattern for all dynamic imports
// Remove loading states to prevent duplicate skeletons
const MembersDashboard = dynamic(
  () => import("@/components/members/members-dashboard").then(mod => ({ default: mod.MembersDashboard })),
  { ssr: true } // Enable SSR for dashboard to improve initial load
);

const MembersAttendance = dynamic(
  () => import("@/components/members/attendance").then(mod => ({ default: mod.MembersAttendance })),
  { ssr: false } // Disable SSR for attendance to improve initial load
);

const MembersBirthdays = dynamic(
  () => import("@/components/members/members-birthdays").then(mod => ({ default: mod.MembersBirthdays })),
  { ssr: false } // Disable SSR for birthdays to improve initial load
);

const AddMemberDialog = dynamic(
  () => import("@/components/members/add-member-form").then(mod => ({ default: mod.AddMemberDialog })),
  { ssr: false } // Disable SSR for dialog to improve initial load
);



interface MembersContentProps {
  initialMembers?: any[];
  initialCount?: number;
  initialStats?: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    newMembersThisMonth: number;
  } | null;
}

export const MembersContent = memo(function MembersContent({
  initialMembers = [],
  initialCount = 0,
  initialStats = null
}: MembersContentProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get search params for tab state
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  // Set active tab based on URL or default to dashboard
  const [activeTab, setActiveTab] = useState(
    tabParam && ['dashboard', 'members', 'attendance', 'birthdays'].includes(tabParam)
      ? tabParam
      : 'dashboard'
  );

  // Handle tab change
  // Optimized to update URL and improve navigation
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);

    // Update URL with the tab parameter for better navigation and bookmarking
    // Use history.replaceState to avoid adding a new entry to the browser history
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Create a query client for prefetching
  const queryClient = useQueryClient();

  // Prefetch data when component mounts
  // Optimized to avoid unnecessary prefetching and improve cache hydration
  useEffect(() => {
    // Hydrate the query cache with initial data from the server
    if (initialMembers && initialMembers.length > 0) {
      // Set the data in the cache with proper structure
      queryClient.setQueryData(
        memberKeys.list({ page: 1, pageSize: 8 }),
        { data: { data: initialMembers, count: initialCount } }
      );

      // Prefetch next page of members with a small delay to prioritize current page rendering
      const prefetchTimer = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: memberKeys.list({ page: 2, pageSize: 8 }),
          queryFn: () => getMembers({ page: 2, pageSize: 8 }),
          staleTime: 30000 // 30 seconds - reduce refetches
        });
      }, 300);

      return () => clearTimeout(prefetchTimer);
    }

    // Set stats data in cache if available
    if (initialStats) {
      queryClient.setQueryData(memberKeys.stats, { data: initialStats });
    }
  }, [initialMembers, initialCount, initialStats, queryClient]);

  // Function to trigger a refresh of the members list
  const handleMemberAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {/* Mobile Tabs */}
        <MobileMembersTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="hidden md:flex items-center justify-between overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-initial">
              <Users className="h-4 w-4 mr-2" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 sm:flex-initial">
              <UserCircle2 className="h-4 w-4 mr-2" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 sm:flex-initial">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="flex-1 sm:flex-initial">
              <Cake className="h-4 w-4 mr-2" />
              <span>Birthdays</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-6">
          <Suspense key="dashboard-suspense" fallback={<MembersDashboardSkeleton />}>
            <MembersDashboard initialStats={initialStats} />
          </Suspense>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <MembersListPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            refreshTrigger={refreshTrigger}
            setIsAddMemberOpen={setIsAddMemberOpen}
          />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Suspense key="attendance-suspense" fallback={<AttendanceSkeleton />}>
            <MembersAttendance />
          </Suspense>
        </TabsContent>

        <TabsContent value="birthdays" className="space-y-6">
          <Suspense key="birthdays-suspense" fallback={<BirthdaysSkeleton />}>
            <MembersBirthdays />
          </Suspense>
        </TabsContent>
      </Tabs>

      <AddMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
});
