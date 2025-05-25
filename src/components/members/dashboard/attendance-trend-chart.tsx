"use client";

import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface AttendanceTrendChartProps {
  data: { month: string; rate: number }[];
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Attendance Trend</CardTitle>
          <CardDescription>Monthly attendance rates</CardDescription>
        </div>
        <Activity className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
              <YAxis className="text-xs" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ fontWeight: "bold" }}
                formatter={(value) => [`${value}%`, "Attendance Rate"]}
              />
              <Area
                type="monotone"
                dataKey="rate"
                name="Attendance Rate"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.2}
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0, fill: "var(--primary)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[350px]">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No attendance data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
