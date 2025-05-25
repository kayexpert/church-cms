"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export function MemberIdMigrationAlert() {
  const [needsMigration, setNeedsMigration] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkMigration() {
      try {
        setIsChecking(true);
        // Try to select the member_id column from income_entries
        const { error } = await supabase
          .from('income_entries')
          .select('member_id')
          .limit(1);

        // If there's an error, the column doesn't exist
        setNeedsMigration(!!error);
      } catch (error) {
        console.error('Error checking migration status:', error);
        setNeedsMigration(true); // Assume migration is needed if there's an error
      } finally {
        setIsChecking(false);
      }
    }

    checkMigration();
  }, []);

  if (isChecking || needsMigration === null) {
    return null; // Don't show anything while checking
  }

  if (!needsMigration) {
    return null; // Don't show anything if migration is not needed
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Database Migration Required</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>
          The Member Finance feature requires a database migration to add the member_id column to the income_entries table.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/member-finance-migration">
              Run Migration
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="/migrations/add_member_id_to_income.sql" download>
              Download SQL
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
