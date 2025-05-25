"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Sample data for financial overview
const financialData = {
  month: [
    { name: "Week 1", income: 4000, expenditure: 2400 },
    { name: "Week 2", income: 3000, expenditure: 1398 },
    { name: "Week 3", income: 2000, expenditure: 3800 },
    { name: "Week 4", income: 2780, expenditure: 3908 },
  ],
  quarter: [
    { name: "Jan", income: 12000, expenditure: 8400 },
    { name: "Feb", income: 9000, expenditure: 7398 },
    { name: "Mar", income: 10000, expenditure: 9800 },
  ],
  year: [
    { name: "Jan", income: 12000, expenditure: 8400 },
    { name: "Feb", income: 9000, expenditure: 7398 },
    { name: "Mar", income: 10000, expenditure: 9800 },
    { name: "Apr", income: 11000, expenditure: 8200 },
    { name: "May", income: 8500, expenditure: 7000 },
    { name: "Jun", income: 7800, expenditure: 6800 },
    { name: "Jul", income: 9200, expenditure: 8100 },
    { name: "Aug", income: 10500, expenditure: 7900 },
    { name: "Sep", income: 11200, expenditure: 8300 },
    { name: "Oct", income: 9800, expenditure: 7200 },
    { name: "Nov", income: 8700, expenditure: 6500 },
    { name: "Dec", income: 14500, expenditure: 10200 },
  ],
};

// Sample data for membership growth
const membershipData = [
  { name: "Jan", members: 120 },
  { name: "Feb", members: 132 },
  { name: "Mar", members: 145 },
  { name: "Apr", members: 162 },
  { name: "May", members: 180 },
  { name: "Jun", members: 192 },
  { name: "Jul", members: 210 },
  { name: "Aug", members: 220 },
  { name: "Sep", members: 232 },
  { name: "Oct", members: 240 },
  { name: "Nov", members: 250 },
  { name: "Dec", members: 256 },
];

interface FinancialOverviewChartProps {
  timeFrame: "month" | "quarter" | "year";
}

export function FinancialOverviewChart({ timeFrame }: FinancialOverviewChartProps) {
  const data = useMemo(() => financialData[timeFrame], [timeFrame]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ fontWeight: "bold" }}
        />
        <Legend />
        <Bar dataKey="income" name="Income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenditure" name="Expenditure" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MembershipGrowthChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={membershipData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ fontWeight: "bold" }}
        />
        <Area
          type="monotone"
          dataKey="members"
          name="Members"
          stroke="var(--chart-2)"
          fill="var(--chart-2)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
