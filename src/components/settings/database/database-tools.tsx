"use client";

import { memo, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Sparkles, Wrench } from "lucide-react";
import { useDatabaseSettings } from "@/contexts/database-settings-context";
import { DatabaseIndexing } from "./database-indexing";
import { ImageOptimization } from "./image-optimization";

interface DatabaseToolsProps {
  onApplyIndexes: (() => void) | undefined;
  onOptimizeImages: (() => void) | undefined;
  isApplyingIndexes: boolean;
  isOptimizingImages: boolean;
}

// Memoize the DatabaseTools component to prevent unnecessary re-renders
export const DatabaseTools = memo(function DatabaseTools({
  onApplyIndexes,
  onOptimizeImages,
  isApplyingIndexes = false,
  isOptimizingImages = false
}: DatabaseToolsProps) {
  // Use the context for shared state and operations
  const { operations, handleDatabaseCleanup, handleFixAssetFunction } = useDatabaseSettings();

  // Memoize the database maintenance card
  const databaseMaintenanceCard = useMemo(() => (
    <Card className="p-4">
      <div className="flex flex-col space-y-2">
        <h4 className="font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Database Maintenance
        </h4>
        <p className="text-sm text-muted-foreground">
          Clean up temporary tables and optimize database performance.
        </p>

        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDatabaseCleanup}
            disabled={operations.cleaningUp}
          >
            {operations.cleaningUp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Clean Up Database
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFixAssetFunction}
            disabled={operations.fixingAssetFunction}
          >
            {operations.fixingAssetFunction ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-4 w-4" />
                Fix Asset Function
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  ), [operations.cleaningUp, operations.fixingAssetFunction, handleDatabaseCleanup, handleFixAssetFunction]);

  // Memoize the database indexing component
  const databaseIndexingComponent = useMemo(() => (
    <DatabaseIndexing
      onApplyIndexes={onApplyIndexes || (() => {})}
      isApplyingIndexes={isApplyingIndexes}
    />
  ), [onApplyIndexes, isApplyingIndexes]);

  // Memoize the image optimization component
  const imageOptimizationComponent = useMemo(() => (
    <ImageOptimization
      onOptimizeImages={onOptimizeImages || (() => {})}
      isOptimizingImages={isOptimizingImages}
    />
  ), [onOptimizeImages, isOptimizingImages]);

  return (
    <>
      <h3 className="text-lg font-medium mt-6">Performance Optimization</h3>
      <div className="grid grid-cols-1 gap-4">
        {databaseMaintenanceCard}
        {databaseIndexingComponent}
        {imageOptimizationComponent}
      </div>
    </>
  );
});
