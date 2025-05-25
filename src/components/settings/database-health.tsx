"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, RefreshCw } from "lucide-react";
import { checkDatabaseHealth } from "@/lib/db-enhanced";
import { supabase } from "@/lib/supabase";
import { DatabaseHealthProps, DatabaseHealthInfo, StorageInfo } from "@/types/database";
import { useDatabaseSettings } from "@/contexts/database-settings-context";

// Import subcomponents
import { DatabaseStatus } from "@/components/settings/database/database-status";
import { StorageUsage } from "@/components/settings/database/storage-usage";
import { DataManagement } from "@/components/settings/database/data-management";
import { DatabaseTools } from "@/components/settings/database/database-tools";

// Memoize the DatabaseHealth component to prevent unnecessary re-renders
export const DatabaseHealth = memo(function DatabaseHealth({
  onExport,
  onImport,
  onReset,
  onApplyIndexes,
  onOptimizeImages,
  isExporting = false,
  isImporting = false,
  isResetting = false,
  isApplyingIndexes = false,
  isOptimizingImages = false
}: DatabaseHealthProps = {}) {
  // Use the context for shared state
  const { healthInfo, storageInfo, isLoading, isRefreshing, refreshData } = useDatabaseSettings();

  // Helper function to format bytes into human-readable format
  const formatBytes = useCallback((bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }, []);

  // Memoize the tabs to prevent unnecessary re-renders
  const tabsList = useMemo(() => (
    <TabsList className="mb-4 flex overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
      <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
      <TabsTrigger value="database-management" className="whitespace-nowrap">Database Management</TabsTrigger>
    </TabsList>
  ), []);

  // Memoize the overview tab content
  const overviewTabContent = useMemo(() => (
    <TabsContent value="overview" className="space-y-4">
      <DatabaseStatus
        healthInfo={healthInfo}
        isLoading={isLoading}
      />
    </TabsContent>
  ), [healthInfo, isLoading]);

  // Memoize the database management tab content
  const databaseManagementTabContent = useMemo(() => (
    <TabsContent value="database-management" className="space-y-6">
      <DataManagement
        onExport={onExport}
        onImport={onImport}
        onReset={onReset}
        isExporting={isExporting}
        isImporting={isImporting}
        isResetting={isResetting}
      />

      <DatabaseTools
        onApplyIndexes={onApplyIndexes}
        onOptimizeImages={onOptimizeImages}
        isApplyingIndexes={isApplyingIndexes}
        isOptimizingImages={isOptimizingImages}
      />

      <StorageUsage
        storageInfo={storageInfo}
        healthInfo={healthInfo}
        isLoading={isLoading}
      />
    </TabsContent>
  ), [
    onExport, onImport, onReset, isExporting, isImporting, isResetting,
    onApplyIndexes, onOptimizeImages, isApplyingIndexes, isOptimizingImages,
    storageInfo, healthInfo, isLoading
  ]);

  // Memoize the loading skeleton
  const loadingSkeleton = useMemo(() => (
    <div className="space-y-3">
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
    </div>
  ), []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h2 className="text-lg font-medium">Database Health</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? loadingSkeleton : (
        <Tabs defaultValue="overview" className="w-full">
          {tabsList}
          {overviewTabContent}
          {databaseManagementTabContent}
        </Tabs>
      )}
    </Card>
  );
});
