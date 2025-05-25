"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MonthlyData } from "@/hooks/use-finance-dashboard-components";
import { formatCurrency } from "@/lib/format-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface MonthlyFinanceChartProps {
  data: MonthlyData[];
  timeFrame: string;
}

export function MonthlyFinanceChart({ data, timeFrame }: MonthlyFinanceChartProps) {
  // Format data for the chart
  const chartData = data.map(item => ({
    name: `${item.month} ${item.year}`,
    income: item.income,
    expenditure: item.expenditure,
    net: item.net || item.income - item.expenditure
  }));

  // Get the title based on the time frame
  const getTitle = () => {
    switch (timeFrame) {
      case 'month':
        return 'Monthly Financial Overview';
      case 'quarter':
        return 'Quarterly Financial Overview';
      case 'year':
        return 'Yearly Financial Overview';
      case 'all':
        return 'All-Time Financial Overview';
      default:
        return 'Financial Overview';
    }
  };

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
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <CardDescription>Income, expenditure and net cash flow over time</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
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
                  cursor={{ fill: 'transparent' }} // This removes the gray background on hover
                />
                <Legend
                  wrapperStyle={{ fontSize: 14 }}
                />
                <ReferenceLine y={0} stroke="#666" />
                <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenditure" name="Expenditure" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-[14px] text-muted-foreground">No data available for the selected period</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
