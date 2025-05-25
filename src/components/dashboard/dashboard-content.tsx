"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  CreditCard,
  TrendingUp,
  Users,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format-utils";
import { UpcomingEventsCard } from "@/components/dashboard/upcoming-events-card";
import { UpcomingBirthdaysCard } from "@/components/members/dashboard/upcoming-birthdays-card";
import { MembershipGrowthChart } from "@/components/members/dashboard/membership-growth-chart";
import { DashboardMonthlyChart } from "@/components/dashboard/monthly-finance-chart";
import { useMainDashboard } from "@/hooks/use-main-dashboard";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeletons";

export function DashboardContent() {
  const [timeFrame, setTimeFrame] = useState("year");
  const { data, isLoading, error } = useMainDashboard(timeFrame);

  // Handle loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-6 text-center">
        <h3 className="text-lg font-semibold text-destructive">Error loading dashboard data</h3>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    );
  }

  // Calculate trend values and directions
  const memberTrend = data.memberStats.newMembersThisMonth > 0 ? "up" : "down";
  const memberTrendValue = data.memberStats.newMembersThisMonth > 0
    ? `+${data.memberStats.newMembersThisMonth}`
    : `${data.memberStats.newMembersThisMonth}`;

  const financialTrend = data.financialData.netCash > 0 ? "up" : "down";
  const financialTrendValue = data.financialData.netCash > 0
    ? `+${((data.financialData.netCash / (data.financialData.totalIncome || 1)) * 100).toFixed(1)}%`
    : `${((data.financialData.netCash / (data.financialData.totalIncome || 1)) * 100).toFixed(1)}%`;

  const eventsTrend = "neutral"; // We don't have historical data for events
  const eventsTrendValue = "";

  const growthTrend = parseFloat(data.growthRate) > 0 ? "up" : "down";
  const growthTrendValue = parseFloat(data.growthRate) > 0
    ? `+${data.growthRate}%`
    : `${data.growthRate}%`;

  return (

    <div className="space-y-6">

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={data.memberStats.totalMembers.toString()}
          description={`Active: ${data.memberStats.activeMembers} (${data.activePercentage}%)`}
          trend={memberTrend}
          trendValue={memberTrendValue}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(data.financialData.netCash)}
          description="Income - Expenditure"
          trend={financialTrend}
          trendValue={financialTrendValue}
          icon={CreditCard}
          color="green"
        />
        <StatCard
          title="Upcoming Events"
          value={data.upcomingEvents.length.toString()}
          description="Next 7 days"
          trend={eventsTrend}
          trendValue={eventsTrendValue}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Membership Growth"
          value={`${data.growthRate}%`}
          description="Last 3 months"
          trend={growthTrend}
          trendValue={growthTrendValue}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
            <DashboardMonthlyChart
              monthlyData={data.financialData.monthlyData}
              totalIncome={data.financialData.totalIncome}
              totalExpenditure={data.financialData.totalExpenditure}
              netCash={data.financialData.netCash}
              timeFrame={timeFrame}
              onTimeFrameChange={setTimeFrame}
              previousYearData={data.financialData.previousYearData}
              isLoading={isLoading}
            />
            </div>
       <div className="md:col-span-1">
          <UpcomingEventsCard />
          </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 h-[455px]">
        <UpcomingBirthdaysCard
          data={data.upcomingBirthdays}
          isLoading={isLoading}
        />
        </div>

          <div className=" md:col-span-2 h-[455px]">
            <MembershipGrowthChart
              data={data.membershipGrowthData}
              growthRate={data.growthRate}
              isLoading={isLoading}
            />
        </div>

      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <QuickAccessCard
          title="Members"
          description="Manage church members"
          icon={Users}
          href="/members"
          color="blue"
        />
        <QuickAccessCard
          title="Finance"
          description="Track income & expenses"
          icon={CreditCard}
          href="/finance"
          color="green"
        />
        <QuickAccessCard
          title="Events"
          description="Schedule church events"
          icon={Calendar}
          href="/events"
          color="purple"
        />
        <QuickAccessCard
          title="Reports"
          description="Generate church reports"
          icon={BarChart3}
          href="/reports"
          color="amber"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "amber";
}

function StatCard({ title, value, description, trend, trendValue, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5",
    green: "from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5",
    purple: "from-purple-500/20 to-purple-500/5 dark:from-purple-500/10 dark:to-purple-500/5",
    amber: "from-amber-500/20 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/5",
  };

  const iconColors = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    amber: "text-amber-500",
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${iconColors[color]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {trendValue && (
          <div className="flex items-center mt-2">
            {trend === "up" ? (
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
            ) : null}
            <span className={`text-xs font-medium ${
              trend === "up" ? "text-green-500" :
              trend === "down" ? "text-red-500" :
              "text-muted-foreground"
            }`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: "blue" | "green" | "purple" | "amber";
}

function QuickAccessCard({ title, description, icon: Icon, href, color }: QuickAccessCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    green: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
    purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    amber: "from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
  };

  return (
    <Link href={href} className="block">
      <Card className={`bg-gradient-to-br ${colorClasses[color]} text-white transition-all hover:shadow-lg`}>
        <CardContent className="px-2 py-1 flex flex-col items-center text-center">
          <div className="flex items-center">
          <Icon className="h-5 w-5" />
          <CardTitle className="text-xl ml-2">{title}</CardTitle>
          </div>
          <CardDescription className="text-white/80">{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}




