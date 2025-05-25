"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { MemberFinanceMigrationButton } from "@/components/admin/member-finance-migration-button";

export default function MigrationsPage() {
  const [isRunningBudgetMigration, setIsRunningBudgetMigration] = useState(false);
  const [budgetMigrationResult, setBudgetMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isRunningExpenditureMigration, setIsRunningExpenditureMigration] = useState(false);
  const [expenditureMigrationResult, setExpenditureMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isRunningDirectMigration, setIsRunningDirectMigration] = useState(false);
  const [directMigrationResult, setDirectMigrationResult] = useState<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  } | null>(null);

  const [isRunningReconciliationMigration, setIsRunningReconciliationMigration] = useState(false);
  const [reconciliationMigrationResult, setReconciliationMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [memberFinanceMigrationResult, setMemberFinanceMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const runBudgetMigration = async () => {
    try {
      setIsRunningBudgetMigration(true);
      setBudgetMigrationResult(null);

      const response = await fetch("/api/db/add-account-id-to-budget-items", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        setBudgetMigrationResult({
          success: true,
          message: result.message || "Migration completed successfully",
        });
      } else {
        setBudgetMigrationResult({
          success: false,
          message: result.error || "Migration failed",
        });
      }
    } catch (error) {
      setBudgetMigrationResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRunningBudgetMigration(false);
    }
  };

  const runExpenditureMigration = async () => {
    try {
      setIsRunningExpenditureMigration(true);
      setExpenditureMigrationResult(null);

      const response = await fetch("/api/db/add-budget-item-id-to-expenditures", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        setExpenditureMigrationResult({
          success: true,
          message: result.message || "Migration completed successfully",
        });
      } else {
        setExpenditureMigrationResult({
          success: false,
          message: result.error || "Migration failed",
        });
      }
    } catch (error) {
      setExpenditureMigrationResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRunningExpenditureMigration(false);
    }
  };

  const runReconciliationMigration = async () => {
    try {
      setIsRunningReconciliationMigration(true);
      setReconciliationMigrationResult(null);

      const response = await fetch("/api/db/add-reconciliation-adjustment-fields", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        setReconciliationMigrationResult({
          success: true,
          message: result.message || "Migration completed successfully",
        });
      } else {
        setReconciliationMigrationResult({
          success: false,
          message: result.error || "Migration failed",
        });
      }
    } catch (error) {
      setReconciliationMigrationResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRunningReconciliationMigration(false);
    }
  };

  const runDirectMigration = async () => {
    try {
      setIsRunningDirectMigration(true);
      setDirectMigrationResult(null);

      const response = await fetch("/api/db/run-direct-migration", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        setDirectMigrationResult({
          success: true,
          message: result.message || "Migration completed successfully",
          details: result
        });
      } else {
        setDirectMigrationResult({
          success: false,
          message: result.error || "Migration failed",
          details: result
        });
      }
    } catch (error) {
      setDirectMigrationResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRunningDirectMigration(false);
    }
  };



  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Database Migrations</h1>
      <p className="text-muted-foreground mb-8">
        Run database migrations to update the schema for new features.
      </p>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Budget Items Migration */}
        <Card>
          <CardHeader>
            <CardTitle>Add Account ID to Budget Items</CardTitle>
            <CardDescription>
              Adds the account_id column to the budget_items table to support linking budget income items to accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgetMigrationResult && (
              <Alert
                variant={budgetMigrationResult.success ? "default" : "destructive"}
                className="mb-4"
              >
                {budgetMigrationResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {budgetMigrationResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>{budgetMigrationResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={runBudgetMigration}
              disabled={isRunningBudgetMigration}
              className="w-full"
            >
              {isRunningBudgetMigration ? (
                "Running Migration..."
              ) : (
                <>
                  Run Migration <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Expenditure Entries Migration */}
        <Card>
          <CardHeader>
            <CardTitle>Add Budget Item ID to Expenditures</CardTitle>
            <CardDescription>
              Adds the budget_item_id column to the expenditure_entries table to link expenditures to budget items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenditureMigrationResult && (
              <Alert
                variant={expenditureMigrationResult.success ? "default" : "destructive"}
                className="mb-4"
              >
                {expenditureMigrationResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {expenditureMigrationResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>{expenditureMigrationResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={runExpenditureMigration}
              disabled={isRunningExpenditureMigration}
              className="w-full"
            >
              {isRunningExpenditureMigration ? (
                "Running Migration..."
              ) : (
                <>
                  Run Migration <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Reconciliation Adjustment Fields Migration */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Add Reconciliation Adjustment Fields</CardTitle>
            <CardDescription>
              Adds the is_reconciliation_adjustment and reconciliation_id columns to income_entries and expenditure_entries tables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reconciliationMigrationResult && (
              <Alert
                variant={reconciliationMigrationResult.success ? "default" : "destructive"}
                className="mb-4"
              >
                {reconciliationMigrationResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {reconciliationMigrationResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>{reconciliationMigrationResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={runReconciliationMigration}
              disabled={isRunningReconciliationMigration}
              className="w-full"
            >
              {isRunningReconciliationMigration ? (
                "Running Migration..."
              ) : (
                <>
                  Add Reconciliation Fields <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Member Finance Migration */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Add Member ID to Income Entries</CardTitle>
            <CardDescription>
              Adds the member_id column to the income_entries table to link income transactions to members. This is required for the Member Finance feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memberFinanceMigrationResult && (
              <Alert
                variant={memberFinanceMigrationResult.success ? "default" : "destructive"}
                className="mb-4"
              >
                {memberFinanceMigrationResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {memberFinanceMigrationResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>{memberFinanceMigrationResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <MemberFinanceMigrationButton
              onSuccess={(message) => {
                setMemberFinanceMigrationResult({
                  success: true,
                  message
                });
              }}
              onError={(message) => {
                setMemberFinanceMigrationResult({
                  success: false,
                  message
                });
              }}
            />
          </CardFooter>
        </Card>
      </div>

      {/* Direct SQL Migration */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Run Direct SQL Migration (Recommended)</CardTitle>
            <CardDescription>
              Runs all migrations in a single operation. This is the recommended approach if you&apos;re experiencing issues with the individual migrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {directMigrationResult && (
              <Alert
                variant={directMigrationResult.success ? "default" : "destructive"}
                className="mb-4"
              >
                {directMigrationResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {directMigrationResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>
                  {directMigrationResult.message}
                </AlertDescription>
                {directMigrationResult.details && directMigrationResult.details.verification && (
                  <div className="mt-2 ml-8">
                    <p className="font-semibold">Verification Results:</p>
                    <ul className="list-disc pl-5 text-sm">
                      {(directMigrationResult.details.verification as Array<{success: boolean, table: string, column: string, error?: string}>).map((result, index: number) => (
                        <li key={index} className={result.success ? "text-green-500" : "text-red-500"}>
                          {result.table}.{result.column}: {result.success ? "Success" : `Failed - ${result.error}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={runDirectMigration}
              disabled={isRunningDirectMigration}
              className="w-full"
              variant="default"
            >
              {isRunningDirectMigration ? (
                "Running Migration..."
              ) : (
                <>
                  Run All Migrations <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
