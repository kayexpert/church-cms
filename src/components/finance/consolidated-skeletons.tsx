// Server component - skeleton components don't need client-side interactivity
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * Base skeleton component with consistent animation
 * Used as a building block for all finance skeletons
 */
export function BaseFinanceSkeleton({ children }: { children: React.ReactNode }) {
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
 * Used for rendering card headers consistently
 */
export function CardHeaderSkeleton({
  withIcon = true,
  titleWidth = "w-40",
  descriptionWidth = "w-56"
}: {
  withIcon?: boolean,
  titleWidth?: string,
  descriptionWidth?: string
}) {
  return (
    <div className="flex items-center gap-2">
      {withIcon && <Skeleton className="h-10 w-10 rounded-lg" />}
      <div>
        <Skeleton className={`h-6 ${titleWidth}`} />
        <Skeleton className={`h-4 ${descriptionWidth} mt-1`} />
      </div>
    </div>
  );
}

/**
 * Stats Card Skeleton component
 * Used for rendering stat card skeletons consistently
 */
export function StatsCardSkeleton({
  titleWidth = "w-24",
  valueWidth = "w-32",
  subtitleWidth = "w-20",
  colorScheme = "blue"
}: {
  titleWidth?: string,
  valueWidth?: string,
  subtitleWidth?: string,
  colorScheme?: "blue" | "red" | "green" | "amber"
}) {
  // Get gradient classes based on color scheme
  const gradientClasses = {
    blue: "bg-gradient-to-br from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5",
    red: "bg-gradient-to-br from-red-500/20 to-red-500/5 dark:from-red-500/10 dark:to-red-500/5",
    green: "bg-gradient-to-br from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5",
    amber: "bg-gradient-to-br from-amber-500/20 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/5"
  };

  // Get icon color classes based on color scheme
  const iconColorClasses = {
    blue: "text-blue-500",
    red: "text-red-500",
    green: "text-green-500",
    amber: "text-amber-500"
  };

  return (
    <Card className={`${gradientClasses[colorScheme]} border-0`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <div className="h-8 w-8 rounded-lg flex items-center justify-center">
          <Skeleton className={`h-4 w-4 ${iconColorClasses[colorScheme]}`} />
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
export function ChartSkeleton({
  height = "h-[400px]",
  titleWidth = "w-48",
  subtitleWidth = "w-32",
  showControls = true,
  chartType = "bar"
}: {
  height?: string,
  titleWidth?: string,
  subtitleWidth?: string,
  showControls?: boolean,
  chartType?: "bar" | "line" | "pie"
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className={`h-5 ${titleWidth} mb-2`} />
            <Skeleton className={`h-4 ${subtitleWidth}`} />
          </div>
          {showControls && (
            <Skeleton className="h-10 w-[200px]" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${height} rounded-lg`}>
          {chartType === "bar" && (
            <div className="w-full h-full flex flex-col justify-end">
              <div className="flex justify-between items-end h-[85%] w-full px-4 pb-8 pt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 w-1/6">
                    <div className="flex gap-1 w-full justify-center">
                      <Skeleton className={`w-6 h-${20 + (i % 3) * 10} bg-blue-500/40`} />
                      <Skeleton className={`w-6 h-${15 + (i % 4) * 8} bg-red-500/40`} />
                      <Skeleton className={`w-6 h-${10 + (i % 5) * 6} bg-green-500/40`} />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
              <div className="h-[15%] flex items-center justify-center px-4">
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
            </div>
          )}

          {chartType === "line" && (
            <div className="w-full h-full flex flex-col justify-end">
              <div className="flex flex-col justify-between h-[85%] w-full px-4 pb-8 pt-4 relative">
                <Skeleton className="absolute top-1/4 left-0 right-0 h-[1px] bg-muted/40" />
                <Skeleton className="absolute top-2/4 left-0 right-0 h-[1px] bg-muted/40" />
                <Skeleton className="absolute top-3/4 left-0 right-0 h-[1px] bg-muted/40" />

                <Skeleton className="absolute top-[10%] left-[5%] right-[5%] h-[2px] bg-blue-500/60 rounded-full"
                  style={{ clipPath: "polygon(0 0, 20% 30%, 40% 10%, 60% 40%, 80% 20%, 100% 50%, 100% 100%, 0 100%)" }} />
                <Skeleton className="absolute top-[30%] left-[5%] right-[5%] h-[2px] bg-red-500/60 rounded-full"
                  style={{ clipPath: "polygon(0 0, 20% 40%, 40% 60%, 60% 20%, 80% 50%, 100% 30%, 100% 100%, 0 100%)" }} />
                <Skeleton className="absolute top-[50%] left-[5%] right-[5%] h-[2px] bg-green-500/60 rounded-full"
                  style={{ clipPath: "polygon(0 0, 20% 20%, 40% 40%, 60% 10%, 80% 30%, 100% 20%, 100% 100%, 0 100%)" }} />

                <div className="flex justify-between items-end w-full absolute bottom-0 left-0 right-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-16" />
                  ))}
                </div>
              </div>
              <div className="h-[15%] flex items-center justify-center px-4">
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
            </div>
          )}

          {chartType === "pie" && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="relative w-[200px] h-[200px] rounded-full overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[120px] h-[120px] rounded-full bg-background"></div>
                </div>
                <div className="absolute inset-0" style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0)" }}>
                  <Skeleton className="w-full h-full bg-blue-500/40" />
                </div>
                <div className="absolute inset-0" style={{ clipPath: "polygon(50% 50%, 100% 0, 50% 0, 0 0, 0 50%)" }}>
                  <Skeleton className="w-full h-full bg-red-500/40" />
                </div>
                <div className="absolute inset-0" style={{ clipPath: "polygon(50% 50%, 0 50%, 0 0, 50% 0)" }}>
                  <Skeleton className="w-full h-full bg-green-500/40" />
                </div>
              </div>
              <div className="ml-8 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Transaction List Skeleton component
 * Used for rendering transaction list skeletons consistently
 */
export function TransactionListSkeleton({
  rows = 5,
  titleWidth = "w-32"
}: {
  rows?: number,
  titleWidth?: string
}) {
  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-muted/20 rounded-md flex items-center justify-center">
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className={`h-6 ${titleWidth}`} />
        </div>
      </CardHeader>
      <div>
        <div className="border-b bg-muted/10 p-3 grid grid-cols-3">
          <Skeleton className="h-4 w-16 bg-muted/50" />
          <Skeleton className="h-4 w-24 bg-muted/50" />
          <Skeleton className="h-4 w-16 bg-muted/50 ml-auto" />
        </div>
        {Array.from({ length: rows }).map((_, j) => (
          <div key={`transaction-row-${j}`} className="border-b p-3 grid grid-cols-3 hover:bg-muted/5">
            <Skeleton className="h-4 w-20 bg-muted/40" />
            <Skeleton className="h-5 w-24 bg-muted/20 rounded-full border border-muted/30" />
            <Skeleton className="h-4 w-16 bg-muted/40 ml-auto" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Table skeleton component
 * Used for rendering table skeletons consistently
 */
export function TableSkeleton({
  columns = 5,
  rows = 5,
  headerWidths = ["w-16", "w-24", "w-32", "w-20", "w-16"],
  cellWidths = ["w-24", "w-28", "w-40", "w-20", "w-8"],
  hasActions = true,
  hasStatus = true,
  hasSearch = true
}: {
  columns?: number,
  rows?: number,
  headerWidths?: string[],
  cellWidths?: string[],
  hasActions?: boolean,
  hasStatus?: boolean,
  hasSearch?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <Skeleton className="h-5 w-48" />
            {hasSearch && <Skeleton className="h-4 w-64 mt-1" />}
          </div>
          {hasSearch && (
            <div className="flex gap-2">
              <Skeleton className="h-10 w-64" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              {/* Table Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 bg-muted/50 p-3">
                {Array.from({ length: columns }).map((_, i) => (
                  <Skeleton
                    key={`header-${i}`}
                    className={`h-4 ${headerWidths[i] || "w-24"} ${i >= columns/2 ? "ml-auto" : ""}`}
                  />
                ))}
              </div>

              {/* Table Rows */}
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 p-3 border-b hover:bg-muted/5"
                >
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <div
                      key={`cell-${rowIndex}-${colIndex}`}
                      className={colIndex >= columns/2 ? "flex justify-end" : ""}
                    >
                      {colIndex === 0 ? (
                        <Skeleton className={`h-5 ${cellWidths[colIndex] || "w-24"}`} />
                      ) : colIndex === 1 ? (
                        <div className="flex items-center gap-2">
                          {hasStatus && <Skeleton className="h-2 w-2 rounded-full bg-green-500/50" />}
                          <Skeleton className={`h-5 ${cellWidths[colIndex] || "w-28"}`} />
                        </div>
                      ) : colIndex === columns - 1 && hasActions ? (
                        <div className="flex gap-2 justify-end">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      ) : (
                        <Skeleton className={`h-5 ${cellWidths[colIndex] || "w-24"}`} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main finance page skeleton
 * Used when the entire finance section is loading
 */
export function FinanceSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="space-y-6">
        {/* Desktop Tabs Skeleton - Hidden on mobile */}
        <div className="hidden md:flex overflow-x-auto">
          <div className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className={`h-8 ${i === 0 ? 'w-32 bg-background rounded-md shadow-sm' : 'w-28'} mx-1`} />
            ))}
          </div>
        </div>

        {/* Mobile Tabs Skeleton - Hidden on desktop */}
        <div className="md:hidden">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Dashboard Skeleton - simplified version */}
        <div className="space-y-6">
          {/* Time Frame Selector Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-5 w-[180px]" />
                  <Skeleton className="h-4 w-[250px] mt-2" />
                </div>
                <Skeleton className="h-10 w-[300px]" />
              </div>
            </CardHeader>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCardSkeleton titleWidth="w-24" valueWidth="w-32" subtitleWidth="w-20" colorScheme="blue" />
            <StatsCardSkeleton titleWidth="w-28" valueWidth="w-36" subtitleWidth="w-24" colorScheme="red" />
            <StatsCardSkeleton titleWidth="w-32" valueWidth="w-28" subtitleWidth="w-20" colorScheme="green" />
            <StatsCardSkeleton titleWidth="w-24" valueWidth="w-32" subtitleWidth="w-24" colorScheme="amber" />
          </div>

          {/* Monthly Finance Chart */}
          <ChartSkeleton
            height="h-[400px]"
            titleWidth="w-64"
            subtitleWidth="w-80"
            showControls={false}
            chartType="bar"
          />

          {/* Category Distribution Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <ChartSkeleton
              height="h-[300px]"
              titleWidth="w-48"
              subtitleWidth="w-64"
              showControls={false}
              chartType="pie"
            />
            <ChartSkeleton
              height="h-[300px]"
              titleWidth="w-56"
              subtitleWidth="w-72"
              showControls={false}
              chartType="pie"
            />
          </div>
        </div>
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Finance dashboard skeleton
 * Used when the dashboard tab is loading
 */
export function FinanceDashboardSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="space-y-6">
        {/* Time Frame Selector Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-[180px]" />
                <Skeleton className="h-4 w-[250px] mt-2" />
              </div>
              <Skeleton className="h-10 w-[300px]" />
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCardSkeleton titleWidth="w-24" valueWidth="w-32" subtitleWidth="w-20" colorScheme="blue" />
          <StatsCardSkeleton titleWidth="w-28" valueWidth="w-36" subtitleWidth="w-24" colorScheme="red" />
          <StatsCardSkeleton titleWidth="w-32" valueWidth="w-28" subtitleWidth="w-20" colorScheme="green" />
          <StatsCardSkeleton titleWidth="w-24" valueWidth="w-32" subtitleWidth="w-24" colorScheme="amber" />
        </div>

        {/* Monthly Finance Chart Skeleton */}
        <ChartSkeleton
          height="h-[400px]"
          titleWidth="w-64"
          subtitleWidth="w-80"
          showControls={false}
          chartType="bar"
        />

        {/* Category Distribution Charts Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton
            height="h-[300px]"
            titleWidth="w-48"
            subtitleWidth="w-64"
            showControls={false}
            chartType="pie"
          />
          <ChartSkeleton
            height="h-[300px]"
            titleWidth="w-56"
            subtitleWidth="w-72"
            showControls={false}
            chartType="pie"
          />
        </div>

        {/* Finance Trend Chart Skeleton */}
        <ChartSkeleton
          height="h-[300px]"
          titleWidth="w-40"
          subtitleWidth="w-80"
          showControls={false}
          chartType="line"
        />
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Generic finance management skeleton
 * Base component for all management skeletons
 */
export function FinanceManagementSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Skeleton - Left Column */}
        <div className="md:col-span-1">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardHeaderSkeleton />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Form Fields */}
                <FormFieldSkeleton labelWidth="w-16" />
                <FormFieldSkeleton labelWidth="w-24" />
                <FormFieldSkeleton labelWidth="w-20" />

                <div className="grid grid-cols-2 gap-4">
                  <FormFieldSkeleton labelWidth="w-32" />
                  <FormFieldSkeleton labelWidth="w-20" />
                </div>

                <FormFieldSkeleton labelWidth="w-28" inputHeight="h-24" />

                <div className="flex justify-end">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List Skeleton - Right Column */}
        <div className="md:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <CardHeaderSkeleton />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TableSkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Income Management Skeleton
 * Specialized skeleton for the income management tab
 */
export function IncomeManagementSkeleton() {
  return (
    <BaseFinanceSkeleton>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income Form Skeleton - Left Column */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64 mt-1" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Date Field */}
                <FormFieldSkeleton labelWidth="w-32" />

                {/* Category Field */}
                <FormFieldSkeleton labelWidth="w-24" />

                {/* Amount and Payment Method Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldSkeleton labelWidth="w-20" />
                  <FormFieldSkeleton labelWidth="w-36" />
                </div>

                {/* Source Field */}
                <FormFieldSkeleton labelWidth="w-28" />

                {/* Account Field */}
                <FormFieldSkeleton labelWidth="w-32" />

                {/* Description Field */}
                <FormFieldSkeleton labelWidth="w-32" inputHeight="h-24" />

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income List Skeleton - Right Column */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="max-h-[600px] overflow-y-auto">
                    {/* Table Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 bg-muted/50 p-3">
                      <Skeleton className="h-4 w-24" /> {/* Date */}
                      <Skeleton className="h-4 w-32" /> {/* Category */}
                      <Skeleton className="h-4 w-40" /> {/* Description */}
                      <Skeleton className="h-4 w-24 ml-auto" /> {/* Amount */}
                      <Skeleton className="h-4 w-16 ml-auto" /> {/* Actions */}
                    </div>

                    {/* Table Rows */}
                    {Array.from({ length: 6 }).map((_, rowIndex) => (
                      <div
                        key={`row-${rowIndex}`}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 p-3 border-b hover:bg-muted/5"
                      >
                        <Skeleton className="h-5 w-24" /> {/* Date */}
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2 w-2 rounded-full bg-green-500/50" />
                          <Skeleton className="h-5 w-32" /> {/* Category */}
                        </div>
                        <Skeleton className="h-5 w-40" /> {/* Description */}
                        <Skeleton className="h-5 w-24 ml-auto" /> {/* Amount */}
                        <div className="flex gap-2 justify-end">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Expenditure Management Skeleton
 * Specialized skeleton for the expenditure management tab
 */
export function ExpenditureManagementSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Expenditure Form Skeleton - Left Column */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-64 mt-1" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Date Field */}
                <FormFieldSkeleton labelWidth="w-32" />

                {/* Category Field */}
                <FormFieldSkeleton labelWidth="w-36" />

                {/* Amount and Payment Method Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldSkeleton labelWidth="w-20" />
                  <FormFieldSkeleton labelWidth="w-36" />
                </div>

                {/* Recipient Field */}
                <FormFieldSkeleton labelWidth="w-28" />

                {/* Account Field */}
                <FormFieldSkeleton labelWidth="w-32" />

                {/* Description Field */}
                <FormFieldSkeleton labelWidth="w-32" inputHeight="h-24" />

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenditure List Skeleton - Right Column */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-64 mt-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="max-h-[600px] overflow-y-auto">
                    {/* Table Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 bg-muted/50 p-3">
                      <Skeleton className="h-4 w-24" /> {/* Date */}
                      <Skeleton className="h-4 w-32" /> {/* Category */}
                      <Skeleton className="h-4 w-40" /> {/* Description */}
                      <Skeleton className="h-4 w-24 ml-auto" /> {/* Amount */}
                      <Skeleton className="h-4 w-16 ml-auto" /> {/* Actions */}
                    </div>

                    {/* Table Rows */}
                    {Array.from({ length: 6 }).map((_, rowIndex) => (
                      <div
                        key={`row-${rowIndex}`}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 p-3 border-b hover:bg-muted/5"
                      >
                        <Skeleton className="h-5 w-24" /> {/* Date */}
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2 w-2 rounded-full bg-red-500/50" />
                          <Skeleton className="h-5 w-32" /> {/* Category */}
                        </div>
                        <Skeleton className="h-5 w-40" /> {/* Description */}
                        <Skeleton className="h-5 w-24 ml-auto" /> {/* Amount */}
                        <div className="flex gap-2 justify-end">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Liability Management Skeleton
 * Specialized skeleton for the liability management tab
 */
export function LiabilityManagementSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Liability Form Skeleton - Left Column */}
        <div className="md:col-span-1">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardHeaderSkeleton titleWidth="w-52" descriptionWidth="w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormFieldSkeleton labelWidth="w-32" />
                <FormFieldSkeleton labelWidth="w-36" />
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldSkeleton labelWidth="w-20" />
                  <FormFieldSkeleton labelWidth="w-24" />
                </div>
                <FormFieldSkeleton labelWidth="w-28" />
                <FormFieldSkeleton labelWidth="w-32" inputHeight="h-24" />
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liability List Skeleton - Right Column */}
        <div className="md:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <CardHeaderSkeleton titleWidth="w-52" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TableSkeleton
                columns={5}
                rows={6}
                headerWidths={["w-24", "w-32", "w-40", "w-24", "w-16"]}
                cellWidths={["w-24", "w-32", "w-40", "w-24", "w-16"]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Budget Management Skeleton
 * Specialized skeleton for the budget management tab
 */
export function BudgetManagementSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="space-y-6">
        {/* Budget List Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Budget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`budget-card-${i}`} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Bank Reconciliation Skeleton
 * Specialized skeleton for the bank reconciliation tab
 */
export function BankReconciliationSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="space-y-6">
        {/* Reconciliation List Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-64 mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Reconciliation Table */}
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <TableSkeleton
              columns={6}
              rows={5}
              headerWidths={["w-24", "w-32", "w-32", "w-24", "w-24", "w-16"]}
              cellWidths={["w-24", "w-32", "w-32", "w-24", "w-24", "w-16"]}
            />
          </CardContent>
        </Card>
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Account Management skeleton
 * Used for the account management tab
 */
export function AccountManagementSkeleton() {
  return (
    <BaseFinanceSkeleton>
      <div className="space-y-6">
        {/* Tabs Skeleton */}
        <div className="h-10 w-[300px] bg-muted rounded-md mb-4"></div>

        {/* Content Skeleton - Account Balances by default */}
        <AccountBalancesSkeleton />
      </div>
    </BaseFinanceSkeleton>
  );
}

/**
 * Account Balances skeleton
 * Used for the account balances tab
 */
export function AccountBalancesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={`account-card-${i}`} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32 mt-1" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Account Transfers skeleton
 * Used for the account transfers tab
 */
export function AccountTransfersSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Transfer Form Skeleton */}
      <div className="md:col-span-1">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardHeaderSkeleton titleWidth="w-48" descriptionWidth="w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Form Fields */}
              <FormFieldSkeleton labelWidth="w-32" />
              <FormFieldSkeleton labelWidth="w-36" />
              <FormFieldSkeleton labelWidth="w-28" />
              <FormFieldSkeleton labelWidth="w-32" />
              <div className="pt-2">
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers Skeleton */}
      <div className="md:col-span-2">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardHeaderSkeleton titleWidth="w-48" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <TableSkeleton
              columns={5}
              rows={5}
              headerWidths={["w-24", "w-32", "w-32", "w-32", "w-20"]}
              cellWidths={["w-24", "w-32", "w-32", "w-32", "w-16"]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}