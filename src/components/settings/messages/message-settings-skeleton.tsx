// Server component - skeleton components don't need client-side interactivity
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function MessageTemplateFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export function MessageTemplateListSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-4">
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MessageLogListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-8 w-32" />
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th><Skeleton className="h-5 w-24 mx-auto" /></th>
                  <th><Skeleton className="h-5 w-24 mx-auto" /></th>
                  <th><Skeleton className="h-5 w-24 mx-auto" /></th>
                  <th><Skeleton className="h-5 w-24 mx-auto" /></th>
                  <th><Skeleton className="h-5 w-16 mx-auto" /></th>
                </tr>
              </thead>
              <tbody>
                {Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton className="h-4 w-32 my-4 mx-auto" /></td>
                    <td><Skeleton className="h-4 w-32 my-4 mx-auto" /></td>
                    <td><Skeleton className="h-4 w-16 my-4 mx-auto" /></td>
                    <td><Skeleton className="h-4 w-32 my-4 mx-auto" /></td>
                    <td>
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SMSProviderConfigSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex justify-end space-x-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CostTrackingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Wigal Balance Card Skeleton - Full Width */}
      <Card>
        <div className="p-6">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <Skeleton className="h-16 w-48 mb-4" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex justify-center mt-4">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </Card>

      {/* Message Statistics Card Skeleton - Full Width */}
      <Card>
        <div className="p-6">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center space-y-2 p-4 bg-muted/20 rounded-lg">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export function MessageSettingsSkeleton() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex space-x-2 mb-6">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-8">
          <div>
            <Skeleton className="h-6 w-40 mb-4" />
            <MessageTemplateFormSkeleton />
          </div>
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <MessageTemplateListSkeleton />
          </div>
        </div>
      </div>
    </Card>
  );
}
