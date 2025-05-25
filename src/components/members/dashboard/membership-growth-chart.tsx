"use client";

import { TrendingUp, Activity, BarChart2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface MembershipGrowthChartProps {
  data: { month: string; members: number }[];
  growthRate: string;
  isLoading?: boolean;
}

export function MembershipGrowthChart({ data, growthRate, isLoading = false }: MembershipGrowthChartProps) {
  // If loading, show skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="h-[300px] bg-muted/30 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Membership Growth</CardTitle>
          <CardDescription>New members over time</CardDescription>
        </div>
        <BarChart2 className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          {data.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 inline mr-1" />
              {growthRate}% growth over last 3 months
            </div>
          )}
        </div>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Line
                type="monotone"
                dataKey="members"
                name="New Members"
                stroke="#2563EB"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No membership growth data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
