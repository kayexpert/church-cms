// Server component - skeleton components don't need client-side interactivity

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Base skeleton components for reuse
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function CardHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-10 w-1/4" />
      </div>
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
      <div className="flex justify-between items-center pt-4">
        <Skeleton className="h-8 w-20" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// Asset Management specific skeletons
export function AssetFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardHeaderSkeleton />
      </CardHeader>
      <CardContent className="space-y-4">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-24" />
      </CardFooter>
    </Card>
  );
}

export function AssetListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardHeaderSkeleton />
      </CardHeader>
      <CardContent>
        <TableSkeleton />
      </CardContent>
    </Card>
  );
}

export function AssetManagementSkeleton() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="assets">
            <Skeleton className="h-4 w-24" />
          </TabsTrigger>
          <TabsTrigger value="disposals">
            <Skeleton className="h-4 w-24" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <AssetFormSkeleton />
            </div>
            <div className="md:col-span-2">
              <AssetListSkeleton />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="disposals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <AssetFormSkeleton />
            </div>
            <div className="md:col-span-2">
              <AssetListSkeleton />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
