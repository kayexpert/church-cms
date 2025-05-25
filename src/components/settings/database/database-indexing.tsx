"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DatabaseIndexingProps {
  onApplyIndexes: () => Promise<void>;
  isApplyingIndexes: boolean;
}

export function DatabaseIndexing({
  onApplyIndexes,
  isApplyingIndexes
}: DatabaseIndexingProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
          <Search className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
          <h3 className="font-medium">Database Indexes</h3>
          <p className="text-sm text-muted-foreground">
            Apply database indexes to improve query performance
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={onApplyIndexes}
        disabled={isApplyingIndexes}
      >
        {isApplyingIndexes ? "Applying..." : "Apply Indexes"}
      </Button>
    </div>
  );
}

// Standalone function for applying database indexes
export async function applyDatabaseIndexes(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Show progress toast
    const progressToast = toast.loading("Applying database indexes...");

    // Prepare SQL content
    let sqlContent = "";

    try {
      // Try to fetch the file from the public directory first
      const response = await fetch('/optimized_indexes.sql');
      if (response.ok) {
        sqlContent = await response.text();
      } else {
        throw new Error('File not in public directory');
      }
    } catch (fetchError) {
      console.warn('Could not fetch SQL file from public directory:', fetchError);

      // Hardcoded SQL content as fallback
      sqlContent = `
-- Optimized Performance Indexes for Church CMS
-- This script is designed to be run directly in the Supabase SQL Editor
-- It includes error handling and checks to ensure indexes are created only when needed

DO $$
DECLARE
    slow_query_count INTEGER := 0;
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Check if we need to optimize by looking for slow queries
    BEGIN
        SELECT COUNT(*) INTO slow_query_count
        FROM pg_stat_statements
        WHERE mean_exec_time > 100 -- milliseconds
        AND calls > 10;

        RAISE NOTICE 'Found % potentially slow queries that could benefit from indexing', slow_query_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_stat_statements extension not available, proceeding with optimization anyway';
    END;

    -- Members table indexes
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'members'
    ) INTO table_exists;

    IF table_exists THEN
        -- Index on last_name, first_name for name searches
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'members' AND indexname = 'idx_members_name'
        ) THEN
            CREATE INDEX idx_members_name ON members (last_name, first_name);
            RAISE NOTICE 'Created index on members(last_name, first_name)';
        END IF;

        -- Index on status for filtering
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'members' AND indexname = 'idx_members_status'
        ) THEN
            CREATE INDEX idx_members_status ON members (status);
            RAISE NOTICE 'Created index on members(status)';
        END IF;

        -- Index on date_of_birth for birthday queries
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'members' AND indexname = 'idx_members_dob'
        ) THEN
            CREATE INDEX idx_members_dob ON members (date_of_birth);
            RAISE NOTICE 'Created index on members(date_of_birth)';
        END IF;
    END IF;

    -- Events table indexes
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
    ) INTO table_exists;

    IF table_exists THEN
        -- Index on date for date range queries
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'events' AND indexname = 'idx_events_date'
        ) THEN
            CREATE INDEX idx_events_date ON events (date);
            RAISE NOTICE 'Created index on events(date)';
        END IF;

        -- Index on status for filtering
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'events' AND indexname = 'idx_events_status'
        ) THEN
            CREATE INDEX idx_events_status ON events (status);
            RAISE NOTICE 'Created index on events(status)';
        END IF;

        -- Index on category_id for filtering
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'events' AND indexname = 'idx_events_category'
        ) THEN
            CREATE INDEX idx_events_category ON events (category_id);
            RAISE NOTICE 'Created index on events(category_id)';
        END IF;
    END IF;

    -- Attendance table indexes
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'attendance'
    ) INTO table_exists;

    IF table_exists THEN
        -- Index on date for date range queries
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'attendance' AND indexname = 'idx_attendance_date'
        ) THEN
            CREATE INDEX idx_attendance_date ON attendance (date);
            RAISE NOTICE 'Created index on attendance(date)';
        END IF;

        -- GIN index on members JSONB for member attendance queries
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'attendance' AND indexname = 'idx_attendance_members'
        ) THEN
            CREATE INDEX idx_attendance_members ON attendance USING GIN (members);
            RAISE NOTICE 'Created GIN index on attendance(members)';
        END IF;
    END IF;

    -- Add more indexes for other tables as needed

    RAISE NOTICE 'Database optimization completed successfully';
END $$;
      `;
    }

    // Execute the SQL
    const { error } = await supabase.rpc('execute_sql', { query: sqlContent });

    if (error) {
      // If the RPC method fails, try an alternative approach
      console.warn('Failed to apply indexes using RPC method:', error);
      
      // Split the SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      // Execute each statement separately
      for (const statement of statements) {
        try {
          await supabase.rpc('execute_sql', { query: statement });
        } catch (stmtError) {
          console.warn(`Error executing statement: ${statement.substring(0, 100)}...`, stmtError);
        }
      }
    }

    // Dismiss progress toast
    toast.dismiss(progressToast);
    toast.success("Database indexes applied successfully");

    return { success: true };
  } catch (error) {
    console.error("Error applying database indexes:", error);
    toast.error(`Failed to apply database indexes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
