// Server component - skeleton components don't need client-side interactivity

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  Cake,
  UserCircle2,
} from "lucide-react";
import {
  MembersDashboardSkeleton,
  AttendanceSkeleton,
  BirthdaysSkeleton
} from "@/components/members/members-consolidated-skeletons";
import { MembersListSkeleton } from "@/components/members/members-consolidated-skeletons";

/**
 * Skeleton loader for the members content
 * Used while the server component is loading
 */
export function MembersContentSkeleton() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <div className="flex items-center justify-between overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-initial">
              <Users className="h-4 w-4 mr-2 hidden sm:inline" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 sm:flex-initial">
              <UserCircle2 className="h-4 w-4 mr-2 hidden sm:inline" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 sm:flex-initial">
              <Calendar className="h-4 w-4 mr-2 hidden sm:inline" />
              <span>Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="flex-1 sm:flex-initial">
              <Cake className="h-4 w-4 mr-2 hidden sm:inline" />
              <span>Birthdays</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-6">
          <MembersDashboardSkeleton />
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <MembersListSkeleton includeHeader={true} />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <AttendanceSkeleton />
        </TabsContent>

        <TabsContent value="birthdays" className="space-y-6">
          <BirthdaysSkeleton />
        </TabsContent>
      </Tabs>
    </div>
  );
}
