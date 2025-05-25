"use client";

import { BankReconciliation } from "@/types/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ReconciliationSummaryProps {
  reconciliation: BankReconciliation;
  summary: {
    totalIncome: number;
    totalExpenditure: number;
    clearedIncome: number;
    clearedExpenditure: number;
    unclearedIncome: number;
    unclearedExpenditure: number;
  };
  difference: number;
  adjustedBookBalance: number;
  finalDifference: number;
  formatCurrency: (amount: number) => string;
}

export function ReconciliationSummary({
  reconciliation,
  summary,
  difference,
  adjustedBookBalance,
  finalDifference,
  formatCurrency,
}: ReconciliationSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation Summary</CardTitle>
        <CardDescription>
          Summary of bank and book balances with adjustments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Bank and Book Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Bank Balance</h3>
              <p className="text-3xl font-bold">{formatCurrency(reconciliation.bank_balance)}</p>
              <p className="text-sm text-muted-foreground">
                Balance as per bank statement
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Book Balance</h3>
              <p className="text-3xl font-bold">{formatCurrency(reconciliation.book_balance)}</p>
              <p className="text-sm text-muted-foreground">
                Balance as per accounting records
              </p>
            </div>
          </div>

          <Separator />

          {/* Difference */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Initial Difference</h3>
            <p className={`text-2xl font-bold ${difference !== 0 ? "text-destructive" : "text-green-500"}`}>
              {formatCurrency(Math.abs(difference))}
              {difference !== 0 && (
                <span className="text-sm font-normal ml-2">
                  (Bank balance is {difference > 0 ? "higher" : "lower"} than book balance)
                </span>
              )}
            </p>
          </div>

          <Separator />

          {/* Uncleared Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Uncleared Items</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Uncleared Income */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Uncleared Income</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-bold">{formatCurrency(summary.unclearedIncome)}</p>
                  <p className="text-xs text-muted-foreground">
                    Income recorded but not yet reflected in bank
                  </p>
                </CardContent>
              </Card>

              {/* Uncleared Expenditure */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Uncleared Expenditure</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-bold">{formatCurrency(summary.unclearedExpenditure)}</p>
                  <p className="text-xs text-muted-foreground">
                    Expenditure recorded but not yet reflected in bank
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Adjusted Book Balance */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Adjusted Book Balance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Book Balance</span>
                <span>{formatCurrency(reconciliation.book_balance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Add: Uncleared Income</span>
                <span>{formatCurrency(summary.unclearedIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span>Less: Uncleared Expenditure</span>
                <span>({formatCurrency(summary.unclearedExpenditure)})</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Adjusted Book Balance</span>
                <span>{formatCurrency(adjustedBookBalance)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Final Difference */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Final Difference</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-2xl font-bold ${finalDifference !== 0 ? "text-destructive" : "text-green-500"}`}>
                  {formatCurrency(Math.abs(finalDifference))}
                </p>
                {finalDifference !== 0 ? (
                  <p className="text-sm text-muted-foreground">
                    There is still a difference that needs to be reconciled
                  </p>
                ) : (
                  <p className="text-sm text-green-500">
                    The bank and book balances are fully reconciled
                  </p>
                )}
              </div>
              {finalDifference !== 0 && (
                <div className="text-sm text-muted-foreground">
                  Bank balance is {finalDifference > 0 ? "higher" : "lower"} than adjusted book balance
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {reconciliation.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Notes</h3>
                <p className="text-sm">{reconciliation.notes}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
