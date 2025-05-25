"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { formatCurrency } from "@/lib/format-utils";
import { MonthlyData } from "@/hooks/use-finance-dashboard-components";

interface FinanceTrendChartProps {
  data: MonthlyData[];
  timeFrame: string;
}

export function FinanceTrendChart({ data, timeFrame }: FinanceTrendChartProps) {
  // Format data for the chart
  const chartData = data.map(item => ({
    name: `${item.month} ${item.year}`,
    income: item.income,
    expenditure: item.expenditure,
    net: item.net || item.income - item.expenditure,
    date: `${item.year}-${item.month_num}-01` // For sorting
  }))
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());



  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium text-[14px]">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-[14px] text-blue-500">
              Income: {formatCurrency(payload[0].value)}
            </p>
            <p className="text-[14px] text-red-500">
              Expenditure: {formatCurrency(payload[1].value)}
            </p>
            <p className="text-[14px] font-medium text-emerald-500">
              Net: {formatCurrency(payload[2].value)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Financial Trends</CardTitle>
          <CardDescription>Income, expenditure and net cash flow over time</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 14 }}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })}
                  tick={{ fontSize: 14 }}
                  tickMargin={8}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ outline: 'none' }}
                  cursor={{ stroke: 'transparent', strokeWidth: 0 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 14 }}
                />
                <ReferenceLine y={0} stroke="#666" />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenditure"
                  name="Expenditure"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-[14px] text-muted-foreground">No trend data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
