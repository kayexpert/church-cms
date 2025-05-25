"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function CategorySettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="rounded-md border">
          <div className="p-4">
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountsSettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="rounded-md border">
          <div className="p-4">
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="grid grid-cols-5 w-full gap-4">
                    <Skeleton className="h-5 w-full col-span-1" />
                    <Skeleton className="h-5 w-full col-span-1" />
                    <Skeleton className="h-5 w-full col-span-1" />
                    <Skeleton className="h-5 w-full col-span-1" />
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



export function FinanceSettingsSkeleton() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex space-x-2 mb-6">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
        <CategorySettingsSkeleton />
      </div>
    </Card>
  );
}
