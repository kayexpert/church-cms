// Server component - skeleton components don't need client-side interactivity
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * Base skeleton component with consistent animation
 * Used as a building block for all members skeletons
 */
export function BaseMembersSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-pulse space-y-6">
      {children}
    </div>
  );
}

/**
 * Form field skeleton component
 * Used for rendering form field skeletons consistently
 */
export function FormFieldSkeleton({
  labelWidth = "w-24",
  inputHeight = "h-10"
}: {
  labelWidth?: string,
  inputHeight?: string
}) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className={`${inputHeight} w-full`} />
    </div>
  );
}

/**
 * Card header skeleton component
 * Used for rendering card header skeletons consistently
 */
export function CardHeaderSkeleton({
  titleWidth = "w-32",
  descriptionWidth = "w-48"
}: {
  titleWidth?: string,
  descriptionWidth?: string
}) {
  return (
    <div>
      <Skeleton className={`h-5 ${titleWidth} mb-1`} />
      {descriptionWidth && <Skeleton className={`h-4 ${descriptionWidth}`} />}
    </div>
  );
}

/**
 * Stats Card Skeleton component
 * Used for rendering stat card skeletons consistently with gradient backgrounds
 */
export function MembersStatCardSkeleton({
  titleWidth = "w-24",
  valueWidth = "w-16",
  subtitleWidth = "w-32",
  colorScheme = "blue"
}: {
  titleWidth?: string,
  valueWidth?: string,
  subtitleWidth?: string,
  colorScheme?: "blue" | "green" | "purple" | "amber"
}) {
  // Get gradient classes based on color scheme
  const gradientClasses = {
    blue: "bg-gradient-to-br from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5",
    green: "bg-gradient-to-br from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5",
    purple: "bg-gradient-to-br from-purple-500/20 to-purple-500/5 dark:from-purple-500/10 dark:to-purple-500/5",
    amber: "bg-gradient-to-br from-amber-500/20 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/5"
  };

  // Get icon color classes based on color scheme
  const iconColorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    amber: "text-amber-500"
  };

  return (
    <Card className={`${gradientClasses[colorScheme]} border-0`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <div className="h-5 w-5 rounded-full flex items-center justify-center">
          <Skeleton className={`h-4 w-4 rounded-full ${iconColorClasses[colorScheme]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className={`h-8 ${valueWidth} mb-1`} />
        <Skeleton className={`h-3 ${subtitleWidth} bg-muted/50`} />
      </CardContent>
    </Card>
  );
}

/**
 * Chart Skeleton component
 * Used for rendering chart skeletons consistently
 */
export function MembersChartSkeleton({
  height = "h-[300px]",
  titleWidth = "w-40",
  subtitleWidth = "w-32",
  chartType = "line"
}: {
  height?: string,
  titleWidth?: string,
  subtitleWidth?: string,
  chartType?: "line" | "area" | "bar"
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <Skeleton className={`h-5 ${titleWidth} mb-1`} />
          <Skeleton className={`h-4 ${subtitleWidth}`} />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className={`${height} rounded-lg`}>
          {chartType === "line" && (
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
          )}

          {chartType === "area" && (
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
          )}

          {chartType === "bar" && (
            <div className="w-full h-full flex flex-col justify-end">
              <div className="flex justify-between items-end h-[85%] w-full px-4 pb-8 pt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 w-1/6">
                    <Skeleton className={`w-12 h-${20 + (i % 3) * 10} bg-blue-500/40`} />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
              <div className="h-[15%] flex items-center justify-center px-4">
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Upcoming Birthdays Card Skeleton component
 * Used for rendering upcoming birthdays card skeleton consistently
 */
export function UpcomingBirthdaysCardSkeleton({
  height = "h-[350px]",
  itemCount = 5
}: {
  height?: string,
  itemCount?: number
}) {
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
          {Array.from({ length: itemCount }).map((_, index) => (
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
 * Member Card Skeleton component
 * Used for rendering member card skeletons consistently
 * Precisely mirrors the actual MemberCard component
 */
export function MemberCardSkeleton() {
  return (
    <div className="rounded-lg border shadow-sm overflow-hidden transition-all bg-card">
      <div className="relative">
        {/* Status Badge */}
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Profile Image and Name */}
        <div className="p-3 sm:p-6 text-center border-b bg-card">
          <Skeleton className="mx-auto mb-2 sm:mb-4 h-14 w-14 sm:h-20 sm:w-20 rounded-full" />
          <Skeleton className="h-5 w-32 mx-auto" />
        </div>

        {/* Contact Information */}
        <div className="p-3 sm:p-5 space-y-2 sm:space-y-4">
          <div className="space-y-2 sm:space-y-3">
            {/* Phone */}
            <div className="flex items-center">
              <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2 sm:mr-3" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Email */}
            <div className="flex items-center">
              <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2 sm:mr-3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-t">
        <Skeleton className="h-8 sm:h-9 w-16 sm:w-20 rounded" />
        <div className="flex gap-1 sm:gap-2">
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Pagination Skeleton component
 * Used for rendering pagination skeleton consistently
 * Precisely mirrors the actual FinancePagination component
 */
export function PaginationSkeleton({
  showPageNumbers = true,
  maxPageButtons = 5
}: {
  showPageNumbers?: boolean,
  maxPageButtons?: number
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 py-3 border-t">
      {/* "Showing X to Y of Z entries" text */}
      <div className="text-[13px] text-muted-foreground">
        <Skeleton className="h-4 w-[220px]" />
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* First page button */}
        {showPageNumbers && (
          <Skeleton className="h-7 w-7 rounded" />
        )}

        {/* Previous page button */}
        <Skeleton className="h-7 w-7 rounded" />

        {/* Page number buttons */}
        {showPageNumbers && (
          <>
            {Array.from({ length: Math.min(maxPageButtons, 5) }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-7 w-7 rounded ${i === 0 ? 'bg-primary/40' : ''}`}
              />
            ))}
          </>
        )}

        {/* Next page button */}
        <Skeleton className="h-7 w-7 rounded" />

        {/* Last page button */}
        {showPageNumbers && (
          <Skeleton className="h-7 w-7 rounded" />
        )}
      </div>
    </div>
  );
}

/**
 * Members Dashboard Skeleton
 * Used when the dashboard tab is loading
 */
export function MembersDashboardSkeleton() {
  return (
    <BaseMembersSkeleton>
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MembersStatCardSkeleton titleWidth="w-28" valueWidth="w-16" subtitleWidth="w-32" colorScheme="blue" />
          <MembersStatCardSkeleton titleWidth="w-36" valueWidth="w-32" subtitleWidth="w-24" colorScheme="green" />
          <MembersStatCardSkeleton titleWidth="w-28" valueWidth="w-16" subtitleWidth="w-32" colorScheme="purple" />
          <MembersStatCardSkeleton titleWidth="w-36" valueWidth="w-16" subtitleWidth="w-32" colorScheme="amber" />
        </div>

        {/* Membership Growth Chart */}
        <MembersChartSkeleton
          height="h-[300px]"
          titleWidth="w-40"
          subtitleWidth="w-32"
          chartType="line"
        />

        {/* Attendance Trend and Upcoming Birthdays */}
        <div className="grid gap-6 md:grid-cols-3 h-[450px]">
          <div className="md:col-span-2 h-full">
            <MembersChartSkeleton
              height="h-[350px]"
              titleWidth="w-32"
              subtitleWidth="w-48"
              chartType="area"
            />
          </div>
          <div className="md:col-span-1 h-full">
            <UpcomingBirthdaysCardSkeleton height="h-[350px]" itemCount={5} />
          </div>
        </div>
      </div>
    </BaseMembersSkeleton>
  );
}

/**
 * Members List Header Skeleton
 * Used for the header section of the members list page
 */
export function MembersListHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {/* Search Input */}
        <div className="relative w-full sm:w-[300px]">
          <div className="absolute left-2.5 top-2.5 h-4 w-4">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-md pl-8" />
        </div>

        {/* Filter and Add Button */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-full sm:w-[180px] rounded-md" />
          <Skeleton className="h-10 w-[100px] flex-shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Members List Skeleton
 * Used when the members list tab is loading
 * Precisely mirrors the actual members list component
 */
export function MembersListSkeleton({
  includeHeader = false
}: {
  includeHeader?: boolean
}) {
  // Calculate the number of cards to show based on screen size
  // This is a rough approximation - in a real implementation we'd use responsive hooks
  const cardCount = 10; // Default to 10 cards

  return (
    <BaseMembersSkeleton>
      {includeHeader && (
        <Card>
          <CardHeader className="pb-3">
            <MembersListHeaderSkeleton />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Member Cards Grid with responsive columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: cardCount }).map((_, index) => (
                  <MemberCardSkeleton key={index} />
                ))}
              </div>

              {/* Pagination - Always shown in skeleton */}
              <PaginationSkeleton showPageNumbers={true} maxPageButtons={5} />
            </div>
          </CardContent>
        </Card>
      )}

      {!includeHeader && (
        <div className="space-y-4">
          {/* Member Cards Grid with responsive columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: cardCount }).map((_, index) => (
              <MemberCardSkeleton key={index} />
            ))}
          </div>

          {/* Pagination - Always shown in skeleton */}
          <PaginationSkeleton showPageNumbers={true} maxPageButtons={5} />
        </div>
      )}
    </BaseMembersSkeleton>
  );
}

/**
 * Attendance Skeleton
 * Used when the attendance tab is loading
 */
export function AttendanceSkeleton() {
  return (
    <BaseMembersSkeleton>
      <MembersChartSkeleton
        height="h-[400px]"
        titleWidth="w-32"
        subtitleWidth="w-48"
        chartType="area"
      />
    </BaseMembersSkeleton>
  );
}

/**
 * Birthdays Skeleton
 * Used when the birthdays tab is loading
 */
export function BirthdaysSkeleton() {
  return (
    <BaseMembersSkeleton>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-48 mb-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full mr-4" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] rounded" />
          </CardContent>
        </Card>
      </div>
    </BaseMembersSkeleton>
  );
}
