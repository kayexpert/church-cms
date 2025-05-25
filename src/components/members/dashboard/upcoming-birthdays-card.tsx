"use client";

import { Cake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  days_until?: number;
  profile_image?: string;
  status: 'active' | 'inactive';
}

interface UpcomingBirthdaysCardProps {
  data: Member[];
  isLoading?: boolean;
}

export function UpcomingBirthdaysCard({ data, isLoading = false }: UpcomingBirthdaysCardProps) {
  // If loading, show skeleton
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
        <div>
          <CardTitle>Upcoming Birthdays</CardTitle>
          <CardDescription>Members with birthdays in the next 30 days</CardDescription>
        </div>
        <Cake className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {data && data.length > 0 ? (
          <ScrollArea className="h-[350px] px-6 py-2">
            <div className="divide-y divide-border">
              {data.map((member, index) => {
                const daysUntil = member.days_until || 0;
                const birthDate = new Date(member.date_of_birth);
                // Format as dd-MMM (day and short month name)
                const day = birthDate.getDate().toString().padStart(2, '0');
                const month = birthDate.toLocaleDateString('en-US', { month: 'short' });
                const formattedDate = `${day}-${month}`;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between py-3 ${index === 0 ? 'pt-0' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {member.profile_image ? (
                            <img
                              src={member.profile_image}
                              alt={`${member.first_name} ${member.last_name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-medium text-muted-foreground">
                              {member.first_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className={`absolute -top-1 -right-1 h-4 w-4 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                        <p className="text-xs text-muted-foreground">{formattedDate}</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      {daysUntil === 0 ? (
                        <span className="text-green-500 font-medium">Today!</span>
                      ) : daysUntil === 1 ? (
                        <span className="text-amber-500 font-medium">Tomorrow</span>
                      ) : (
                        <span className="text-muted-foreground">in {daysUntil} days</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[390px] px-6">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Cake className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No upcoming birthdays in the next 30 days</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
