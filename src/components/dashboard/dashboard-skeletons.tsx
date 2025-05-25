// Server component - skeleton components don't need client-side interactivity
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Base skeleton component with consistent animation
 * Used as a building block for all dashboard skeletons
 */
export function BaseDashboardSkeleton({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-pulse space-y-6">
      {children}
    </div>
  );
}

/**
 * Stats Card Skeleton component
 * Used for rendering stat card skeletons consistently
 */
export function StatCardSkeleton({
  titleWidth = "w-24",
  valueWidth = "w-32",
  subtitleWidth = "w-20"
}: {
  titleWidth?: string,
  valueWidth?: string,
  subtitleWidth?: string
}) {
  return (
    <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Skeleton className={`h-5 ${titleWidth}`} />
          <div className="h-4 w-4 rounded-full bg-muted/50" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className={`h-8 ${valueWidth} mb-2`} />
        <Skeleton className={`h-3 ${subtitleWidth}`} />
      </CardContent>
    </Card>
  );
}

/**
 * Chart Skeleton component
 * Used for rendering chart skeletons consistently
 */
export function ChartSkeleton({
  height = "h-[400px]",
  titleWidth = "w-48",
  subtitleWidth = "w-32",
  hasControls = true
}: {
  height?: string,
  titleWidth?: string,
  subtitleWidth?: string,
  hasControls?: boolean
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className={`h-6 ${titleWidth} mb-2`} />
            <Skeleton className={`h-4 ${subtitleWidth}`} />
          </div>
          {hasControls && (
            <Skeleton className="h-10 w-[200px]" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${height} bg-muted/30 rounded-lg`} />
      </CardContent>
    </Card>
  );
}

/**
 * Upcoming Events Card Skeleton
 */
export function UpcomingEventsCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-24" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-start space-x-4">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
              <Skeleton className="h-3 w-[180px]" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Upcoming Birthdays Card Skeleton
 */
export function UpcomingBirthdaysCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-64" />
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
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
}

/**
 * Quick Access Card Skeleton
 */
export function QuickAccessCardSkeleton() {
  return (
    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
      <CardContent className="px-2 py-1 flex flex-col items-center text-center">
        <div className="flex items-center">
          <Skeleton className="h-5 w-5 bg-white/50" />
          <Skeleton className="h-6 w-24 ml-2 bg-white/50" />
        </div>
        <Skeleton className="h-4 w-32 mt-1 bg-white/30" />
      </CardContent>
    </Card>
  );
}

/**
 * Complete Dashboard Skeleton
 * Used when the entire dashboard is loading
 */
export function DashboardSkeleton() {
  return (
    <BaseDashboardSkeleton>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton
              key={index}
              titleWidth={index % 2 === 0 ? "w-24" : "w-32"}
              valueWidth={index % 2 === 0 ? "w-16" : "w-24"}
            />
          ))}
        </div>

        {/* Financial Chart and Upcoming Events */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <ChartSkeleton
              height="h-[400px]"
              titleWidth="w-48"
              subtitleWidth="w-64"
            />
          </div>
          <div className="md:col-span-1">
            <UpcomingEventsCardSkeleton />
          </div>
        </div>

        {/* Birthdays and Membership Growth */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 h-[455px]">
            <UpcomingBirthdaysCardSkeleton />
          </div>
          <div className="md:col-span-2 h-[455px]">
            <ChartSkeleton
              height="h-[400px]"
              titleWidth="w-40"
              subtitleWidth="w-36"
              hasControls={false}
            />
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <QuickAccessCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </BaseDashboardSkeleton>
  );
}
