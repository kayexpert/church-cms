"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { formatCurrency } from "@/lib/format-utils";
import { CategoryData } from "@/hooks/use-finance-dashboard-components";
import { useState } from "react";

interface CategoryDistributionChartsProps {
  incomeByCategory: CategoryData[];
  expenditureByCategory: CategoryData[];
}

export function CategoryDistributionCharts({
  incomeByCategory,
  expenditureByCategory
}: CategoryDistributionChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <CategoryChart
        data={incomeByCategory}
        title="Income by Category"
        description="Distribution of income across categories"
        colorScheme="income"
      />
      <CategoryChart
        data={expenditureByCategory}
        title="Expenditure by Category"
        description="Distribution of expenditure across categories"
        colorScheme="expenditure"
      />
    </div>
  );
}

interface CategoryChartProps {
  data: CategoryData[];
  title: string;
  description: string;
  colorScheme: "income" | "expenditure";
}

function CategoryChart({ data, title, description, colorScheme }: CategoryChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Default colors for income and expenditure
  const INCOME_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af'];
  const EXPENDITURE_COLORS = ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#dc2626', '#b91c1c', '#991b1b'];

  const COLORS = colorScheme === 'income' ? INCOME_COLORS : EXPENDITURE_COLORS;

  // Process data to ensure it has all required properties
  const processedData = data
    .filter(item => item.amount > 0)
    .map(item => ({
      ...item,
      percentage: item.percentage || 0,
      color: item.color || COLORS[0]
    }))
    .sort((a, b) => b.amount - a.amount);



  // Handle mouse enter on pie chart
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Handle mouse leave on pie chart
  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  // Custom tooltip for the chart
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium text-[14px]">{data.category}</p>
          <p className="text-[14px]">{formatCurrency(data.amount)}</p>
          <p className="text-[14px] text-muted-foreground">{data.percentage.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  // Render active shape with more details
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill={fill} style={{ fontSize: '14px', fontWeight: 500 }}>
          {payload.category}
        </text>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} style={{ fontSize: '14px', fontWeight: 700 }}>
          {formatCurrency(payload.amount)}
        </text>
        <text x={cx} y={cy} dy={25} textAnchor="middle" style={{ fontSize: '14px', opacity: 0.7 }}>
          {payload.percentage.toFixed(1)}% of total
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.2}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {processedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={processedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="amount"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {processedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                      stroke="rgba(255, 255, 255, 0.2)"
                    />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  formatter={(value, entry: any) => (
                    <span style={{ fontSize: '14px' }}>
                      {value} ({entry.payload.percentage.toFixed(1)}%)
                    </span>
                  )}
                  wrapperStyle={{ fontSize: 14 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[14px] text-muted-foreground">No data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
