"use client";

import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  BarChart
} from "lucide-react";
import { DatabaseHealthInfo } from "@/types/database";

interface DatabaseStatusProps {
  healthInfo: DatabaseHealthInfo | null;
  isLoading: boolean;
}

// Memoize the DatabaseStatus component to prevent unnecessary re-renders
export const DatabaseStatus = memo(function DatabaseStatus({ healthInfo, isLoading }: DatabaseStatusProps) {
  // Function to get response time color based on performance - memoized
  const getResponseTimeColor = useMemo(() => {
    return (time: number) => {
      if (time < 100) return "text-green-500";
      if (time < 300) return "text-yellow-500";
      return "text-red-500";
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  // Memoize the status card
  const statusCard = useMemo(() => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">Status:</span>
        {healthInfo?.status === 'healthy' ? (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Healthy
          </Badge>
        ) : (
          <Badge variant="destructive">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Error
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span className="font-medium">Response Time:</span>
        {healthInfo ? (
          <span className={getResponseTimeColor(healthInfo.responseTime)}>
            <Activity className="h-4 w-4 inline mr-1" />
            {healthInfo.responseTime.toFixed(2)}ms
          </span>
        ) : (
          <span>Unknown</span>
        )}
      </div>

      {healthInfo?.error && (
        <div className="text-red-500 mt-2">
          <AlertTriangle className="h-4 w-4 inline mr-1" />
          {healthInfo.error}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        Last checked: {healthInfo?.timestamp ? new Date(healthInfo.timestamp).toLocaleString() : 'Never'}
      </div>
    </Card>
  ), [healthInfo, getResponseTimeColor]);

  // Memoize the database info card
  const databaseInfoCard = useMemo(() => (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="font-medium">Database Size:</span>
        <span>
          <HardDrive className="h-4 w-4 inline mr-1" />
          {healthInfo?.databaseSize || "Unknown"}
        </span>
      </div>

      {healthInfo?.connectionCount !== undefined && healthInfo?.maxConnections !== undefined && (
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Database Connections:</span>
            <span>{healthInfo.connectionCount} / {healthInfo.maxConnections}</span>
          </div>
          <Progress
            value={(healthInfo.connectionCount / healthInfo.maxConnections) * 100}
            className="h-2"
          />
        </div>
      )}
    </Card>
  ), [healthInfo]);

  // Memoize the cache hit ratio card
  const cacheHitRatioCard = useMemo(() => {
    if (healthInfo?.cacheHitRatio === undefined) return null;

    return (
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Cache Hit Ratio:</span>
            <span className={healthInfo.cacheHitRatio > 90 ? "text-green-500" : "text-yellow-500"}>
              {healthInfo.cacheHitRatio.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={healthInfo.cacheHitRatio}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Higher values indicate better cache utilization. Values above 90% are excellent.
          </p>
        </div>
      </Card>
    );
  }, [healthInfo?.cacheHitRatio]);

  // Memoize the index usage card
  const indexUsageCard = useMemo(() => {
    if (healthInfo?.indexUsage === undefined) return null;

    return (
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Index Usage:</span>
            <span className={healthInfo.indexUsage > 80 ? "text-green-500" : "text-yellow-500"}>
              {healthInfo.indexUsage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={healthInfo.indexUsage}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Percentage of queries using indexes. Higher values indicate better performance.
          </p>
        </div>
      </Card>
    );
  }, [healthInfo?.indexUsage]);

  // Memoize the slow queries card
  const slowQueriesCard = useMemo(() => {
    if (!healthInfo?.slowQueries || healthInfo.slowQueries.length === 0) return null;

    return (
      <Card className="p-4">
        <div className="space-y-2">
          <h3 className="font-medium flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Slow Queries ({healthInfo.slowQueries.length})
          </h3>
          <div className="max-h-40 overflow-y-auto text-sm">
            {healthInfo.slowQueries.map((query, index) => (
              <div key={index} className="p-2 border-b last:border-0">
                <div className="flex justify-between">
                  <span className="font-mono truncate max-w-[80%]">{query.query}</span>
                  <span className={getResponseTimeColor(query.avgTime)}>
                    {query.avgTime.toFixed(2)}ms
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Called {query.calls} times
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }, [healthInfo?.slowQueries, getResponseTimeColor]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statusCard}
        {databaseInfoCard}
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cacheHitRatioCard}
        {indexUsageCard}
      </div>

      {slowQueriesCard}
    </>
  );
});
