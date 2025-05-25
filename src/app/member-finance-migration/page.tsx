"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowRight, Download, ExternalLink } from "lucide-react";
import { MemberFinanceMigrationButton } from "@/components/admin/member-finance-migration-button";
import Link from "next/link";

export default function MemberFinanceMigrationPage() {
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-4">Member Finance Migration</h1>
      <p className="text-muted-foreground mb-8">
        Run this migration to add the member_id column to the income_entries table.
        This is required for the Member Finance feature.
      </p>

      <div className="mb-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Add Member ID to Income Entries</CardTitle>
            <CardDescription>
              Adds the member_id column to the income_entries table to link income transactions to members.
              This is required for the Member Finance feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {migrationResult && (
              <Alert
                variant={migrationResult.success ? "default" : "destructive"}
                className="mb-4"
              >
                {migrationResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {migrationResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>{migrationResult.message}</AlertDescription>
              </Alert>
            )}

            {migrationResult?.success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-medium text-green-800 mb-2">Migration Successful!</h3>
                <p className="text-green-700 mb-4">
                  The member_id column has been added to the income_entries table.
                  You can now use the Member Finance feature.
                </p>
                <div className="flex gap-4">
                  <Button asChild>
                    <Link href="/finance?tab=income">
                      Go to Income Management
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/members">
                      Go to Members
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {migrationResult?.success === false && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <h3 className="font-medium text-amber-800 mb-2">Migration Failed</h3>
                <p className="text-amber-700 mb-4">
                  The automatic migration failed. This is likely because the Supabase client doesn't have permission
                  to execute SQL directly. You can run the migration manually using the Supabase dashboard.
                </p>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <h4 className="font-medium text-amber-800">Option 1: Download SQL File</h4>
                    <p className="text-amber-700 text-sm">
                      Download the SQL file and run it in the Supabase SQL Editor.
                    </p>
                    <Button asChild variant="outline" size="sm" className="w-fit">
                      <a href="/migrations/add_member_id_to_income.sql" download>
                        <Download className="mr-2 h-4 w-4" />
                        Download SQL File
                      </a>
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className="font-medium text-amber-800">Option 2: Run SQL in Supabase Dashboard</h4>
                    <p className="text-amber-700 text-sm">
                      Copy and paste the following SQL into the Supabase SQL Editor:
                    </p>
                    <div className="bg-gray-800 text-gray-100 p-3 rounded-md text-sm overflow-x-auto">
                      <pre>{`-- Add member_id column to income_entries table
ALTER TABLE IF EXISTS income_entries
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Create an index on member_id for faster queries
CREATE INDEX IF NOT EXISTS income_entries_member_id_idx ON income_entries(member_id);

-- Add comment to the column
COMMENT ON COLUMN income_entries.member_id IS 'Reference to the member who made the payment (for tithes, welfare, etc.)';`}</pre>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-fit">
                      <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Supabase SQL Editor
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <MemberFinanceMigrationButton
              onSuccess={(message) => {
                setMigrationResult({
                  success: true,
                  message
                });
              }}
              onError={(message) => {
                setMigrationResult({
                  success: false,
                  message
                });
              }}
            />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
