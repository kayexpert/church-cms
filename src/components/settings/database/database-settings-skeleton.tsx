"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DatabaseHealthSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function DatabaseIndexingSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-4 w-full mb-6" />
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32 mt-4" />
    </Card>
  );
}

export function ImageOptimizationSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-4 w-full mb-6" />
      <div className="space-y-3">
        {Array(2).fill(0).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32 mt-4" />
    </Card>
  );
}

export function StorageUsageSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function DatabaseStatusSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DatabaseSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-full mb-6" />
      <DatabaseHealthSkeleton />
    </div>
  );
}
