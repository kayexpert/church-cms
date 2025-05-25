"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { memo } from "react";

/**
 * Stats Cards Skeleton component
 * Used when only the stats cards are loading
 */
export const StatsCardsSkeleton = memo(function StatsCardsSkeleton() {
  // Get gradient classes for different color schemes
  const gradientClasses = {
    blue: "bg-gradient-to-br from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5",
    green: "bg-gradient-to-br from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5",
    purple: "bg-gradient-to-br from-purple-500/20 to-purple-500/5 dark:from-purple-500/10 dark:to-purple-500/5",
    amber: "bg-gradient-to-br from-amber-500/20 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/5"
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Members Card */}
      <Card className={`${gradientClasses.blue} border-0`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-28" />
          <div className="h-5 w-5 rounded-full flex items-center justify-center">
            <Skeleton className="h-4 w-4 rounded-full text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32 bg-muted/50" />
        </CardContent>
      </Card>

      {/* Active Members Card */}
      <Card className={`${gradientClasses.green} border-0`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-36" />
          <div className="h-5 w-5 rounded-full flex items-center justify-center">
            <Skeleton className="h-4 w-4 rounded-full text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-24 bg-muted/50" />
        </CardContent>
      </Card>

      {/* Attendance Rate Card */}
      <Card className={`${gradientClasses.purple} border-0`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-28" />
          <div className="h-5 w-5 rounded-full flex items-center justify-center">
            <Skeleton className="h-4 w-4 rounded-full text-purple-500" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32 bg-muted/50" />
        </CardContent>
      </Card>

      {/* Birthdays Card */}
      <Card className={`${gradientClasses.amber} border-0`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-36" />
          <div className="h-5 w-5 rounded-full flex items-center justify-center">
            <Skeleton className="h-4 w-4 rounded-full text-amber-500" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32 bg-muted/50" />
        </CardContent>
      </Card>
    </div>
  );
});

/**
 * Membership Growth Chart Skeleton component
 * Used when only the membership growth chart is loading
 */
export const MembershipGrowthChartSkeleton = memo(function MembershipGrowthChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] rounded-lg">
          <div className="w-full h-full flex flex-col justify-end">
            <div className="flex flex-col justify-between h-[85%] w-full px-4 pb-8 pt-4 relative">
              <Skeleton className="absolute top-1/4 left-0 right-0 h-[1px] bg-muted/40" />
              <Skeleton className="absolute top-2/4 left-0 right-0 h-[1px] bg-muted/40" />
              <Skeleton className="absolute top-3/4 left-0 right-0 h-[1px] bg-muted/40" />

              <Skeleton className="absolute top-[30%] left-[5%] right-[5%] h-[2px] bg-blue-500/60 rounded-full"
                style={{ clipPath: "polygon(0 0, 20% 40%, 40% 60%, 60% 20%, 80% 50%, 100% 30%, 100% 100%, 0 100%)" }} />

              <div className="flex justify-between items-end w-full absolute bottom-0 left-0 right-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-12" />
                ))}
              </div>
            </div>
            <div className="h-[15%] flex items-center justify-center px-4">
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Attendance Trend Chart Skeleton component
 * Used when only the attendance trend chart is loading
 */
export const AttendanceTrendChartSkeleton = memo(function AttendanceTrendChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="h-[350px] rounded-lg">
          <div className="w-full h-full flex flex-col justify-end">
            <div className="flex flex-col justify-between h-[85%] w-full px-4 pb-8 pt-4 relative">
              <Skeleton className="absolute top-1/4 left-0 right-0 h-[1px] bg-muted/40" />
              <Skeleton className="absolute top-2/4 left-0 right-0 h-[1px] bg-muted/40" />
              <Skeleton className="absolute top-3/4 left-0 right-0 h-[1px] bg-muted/40" />

              <div className="absolute inset-0 mt-[30%]"
                style={{
                  clipPath: "polygon(0 70%, 20% 60%, 40% 40%, 60% 50%, 80% 30%, 100% 40%, 100% 100%, 0 100%)",
                  background: "linear-gradient(to bottom, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.05))"
                }}>
              </div>

              <Skeleton className="absolute top-[30%] left-[5%] right-[5%] h-[2px] bg-blue-500/60 rounded-full"
                style={{ clipPath: "polygon(0 0, 20% 40%, 40% 60%, 60% 50%, 80% 30%, 100% 40%, 100% 100%, 0 100%)" }} />

              <div className="flex justify-between items-end w-full absolute bottom-0 left-0 right-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-12" />
                ))}
              </div>
            </div>
            <div className="h-[15%] flex items-center justify-center px-4">
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Upcoming Birthdays Card Skeleton component
 * Used when only the upcoming birthdays card is loading
 */
export const UpcomingBirthdaysCardSkeleton = memo(function UpcomingBirthdaysCardSkeleton() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
        <div>
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
