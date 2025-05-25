"use client";

import { Suspense, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatabaseHealth } from "./database-health";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DatabaseIndexing } from "./database/database-indexing";
import { ImageOptimization } from "./database/image-optimization";
import { DataManagement } from "./database/data-management";
import { DatabaseTools } from "./database/database-tools";
import { StorageUsage } from "./database/storage-usage";
import { DatabaseStatus } from "./database/database-status";
import {
  DatabaseHealthSkeleton,
  DatabaseIndexingSkeleton,
  ImageOptimizationSkeleton,
  StorageUsageSkeleton,
  DatabaseStatusSkeleton
} from "./database/database-settings-skeleton";
import { DatabaseSettingsProvider, useDatabaseSettings } from "@/contexts/database-settings-context";

// Wrapper component that provides the context
export function DatabaseSettings() {
  return (
    <DatabaseSettingsProvider>
      <DatabaseSettingsContent />
    </DatabaseSettingsProvider>
  );
}

// Main component that uses the context
function DatabaseSettingsContent() {
  const {
    isLoading,
    refreshData,
    operations,
    dialogs,
    importFile,
    setImportFile,
    toggleDialog,
    handleExport,
    handleImport,
    handleReset,
    handleApplyIndexes,
    handleOptimizeImages
  } = useDatabaseSettings();

  // Fetch data on component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle file selection for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">Database Settings</h1>
        <p className="text-muted-foreground mb-6">
          Manage your database health and performance.
        </p>

        <div>
          <ErrorBoundary fallback={
            <Card className="p-6">
              <div className="flex items-center gap-2 text-destructive mb-4">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-medium">Error Loading Database Health</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                There was a problem loading the database health information. This could be due to a connection issue or missing database functions.
              </p>
              <Button
                variant="outline"
                onClick={refreshData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </Card>
          }>
            <Suspense fallback={<DatabaseHealthSkeleton />}>
              <DatabaseHealth
                onExport={handleExport}
                onImport={() => toggleDialog('showImportDialog', true)}
                onReset={() => toggleDialog('showResetDialog', true)}
                onApplyIndexes={handleApplyIndexes}
                onOptimizeImages={handleOptimizeImages}
                isExporting={operations.exporting}
                isImporting={operations.importing}
                isResetting={operations.resetting}
                isApplyingIndexes={operations.applyingIndexes}
                isOptimizingImages={operations.optimizingImages}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Import Dialog */}
      <AlertDialog
        open={dialogs.showImportDialog}
        onOpenChange={(open) => toggleDialog('showImportDialog', open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Database</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all existing data with the imported data. This action cannot be undone.
              <div className="mt-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              disabled={operations.importing || !importFile}
            >
              {operations.importing ? "Importing..." : "Import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog
        open={dialogs.showResetDialog}
        onOpenChange={(open) => toggleDialog('showResetDialog', open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset Database
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all members, transactions, events, and attendance records. Settings like departments, categories, and accounts will be preserved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={operations.resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {operations.resetting ? "Resetting..." : "Reset Database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
