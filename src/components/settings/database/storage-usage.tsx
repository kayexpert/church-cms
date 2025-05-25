"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, TrendingUp } from "lucide-react";
import { StorageInfo, DatabaseHealthInfo } from "@/types/database";

interface StorageUsageProps {
  storageInfo: StorageInfo | null;
  healthInfo: DatabaseHealthInfo | null;
  isLoading: boolean;
}

export function StorageUsage({ storageInfo, healthInfo, isLoading }: StorageUsageProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  return (
    <Card className="p-6 mt-2">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
          <Layers className="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <h2 className="text-lg font-medium">Storage Usage Summary</h2>
      </div>
      <div className="space-y-4">
        {storageInfo?.buckets.map((bucket, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium capitalize">{bucket.name}</span>
              <span>{bucket.sizeFormatted}</span>
            </div>
            <Progress
              value={storageInfo.totalSize > 0 ? (bucket.size / storageInfo.totalSize) * 100 : 0}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {storageInfo.totalSize > 0
                ? `${Math.round((bucket.size / storageInfo.totalSize) * 100)}% of total storage • ${bucket.fileCount} files`
                : `${bucket.fileCount} files`}
            </p>
          </div>
        ))}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Database</span>
            <span>{healthInfo?.databaseSize || "Unknown"}</span>
          </div>
          <Progress
            value={storageInfo?.totalSize && healthInfo?.databaseSize
              ? (parseFloat(healthInfo.databaseSize) / (storageInfo.totalSize + parseFloat(healthInfo.databaseSize || "0"))) * 100
              : 0}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {storageInfo?.totalSize && healthInfo?.databaseSize
              ? `${Math.round((parseFloat(healthInfo.databaseSize) / (storageInfo.totalSize + parseFloat(healthInfo.databaseSize || "0"))) * 100)}% of total storage`
              : "Database size information"}
          </p>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Storage Used</span>
            <span>{storageInfo?.totalSizeFormatted || "0 B"} / {storageInfo?.maxSizeFormatted || "5 GB"}</span>
          </div>
          <Progress value={storageInfo?.usagePercentage || 0} className="h-2 mt-2" />

          {storageInfo?.growthRate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>Growing by approximately {storageInfo.growthRate.monthlyFormatted} per month</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
