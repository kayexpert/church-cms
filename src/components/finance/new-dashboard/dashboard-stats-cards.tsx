import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-utils";
import { ArrowDownRight, ArrowUpRight, DollarSign, AlertCircle } from "lucide-react";

interface DashboardStatsCardsProps {
  totalIncome: number;
  totalExpenditure: number;
  netCash: number;
  totalLiabilities: number;
  timeFrame: string;
}

export function DashboardStatsCards({
  totalIncome,
  totalExpenditure,
  netCash,
  totalLiabilities,
  timeFrame
}: DashboardStatsCardsProps) {
  // Format the time frame for display
  const timeFrameDisplay = getTimeFrameDisplay(timeFrame);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Income Card */}
      <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <ArrowDownRight className="w-4 h-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {timeFrameDisplay}
          </p>
        </CardContent>
      </Card>

      {/* Expenditure Card */}
      <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 dark:from-red-500/10 dark:to-red-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
          <ArrowUpRight className="w-4 h-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenditure)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {timeFrameDisplay}
          </p>
        </CardContent>
      </Card>

      {/* Net Cash Card */}
      <Card className={`bg-gradient-to-br ${netCash >= 0 ? 'from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5' : 'from-red-500/20 to-red-500/5 dark:from-red-500/10 dark:to-red-500/5'}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          <DollarSign className={`w-4 h-4 ${netCash >= 0 ? 'text-green-500' : 'text-red-500'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(netCash)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {timeFrameDisplay}
          </p>
        </CardContent>
      </Card>

      {/* Liabilities Card */}
      <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Liabilities</CardTitle>
          <AlertCircle className="w-4 h-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalLiabilities)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total unpaid liabilities
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get a display string for the time frame
function getTimeFrameDisplay(timeFrame: string): string {
  switch (timeFrame) {
    case 'month':
      return 'Current month';
    case 'quarter':
      return 'Current quarter';
    case 'year':
      return 'Current year';
    case 'all':
      return 'All time';
    default:
      return 'Current period';
  }
}
