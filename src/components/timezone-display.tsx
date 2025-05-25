"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimezone } from './timezone-provider';
import { useFormattedDate } from '@/hooks/use-formatted-date';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Component to display timezone information and date formatting examples
 */
export function TimezoneDisplay() {
  const { timezone, isDetected } = useTimezone();
  const { formatWithTimezone, format } = useFormattedDate();

  // Use state for all date-related values to avoid hydration errors
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [exampleDates, setExampleDates] = useState<{
    today: Date | null;
    tomorrow: Date | null;
    nextWeek: Date | null;
  }>({
    today: null,
    tomorrow: null,
    nextWeek: null
  });

  // Initialize dates only on the client side
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    setExampleDates({
      today,
      tomorrow,
      nextWeek
    });

    setCurrentTime(new Date());

    // Update the current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Determine if we're still loading
  const isLoading = !currentTime || !exampleDates.today;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Timezone & Date Format</CardTitle>
        <CardDescription>
          Showing detected timezone and date formatting examples
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Timezone Information</h3>
            <p><strong>Detected Timezone:</strong> {timezone}</p>
            <p><strong>Detection Status:</strong> {isDetected ? 'Detected' : 'Not detected'}</p>

            {isLoading ? (
              <>
                <p><strong>Current Time:</strong> <Skeleton className="h-4 w-24 inline-block" /></p>
                <p><strong>Timezone Offset:</strong> <Skeleton className="h-4 w-24 inline-block" /></p>
              </>
            ) : (
              <>
                <p><strong>Current Time:</strong> {currentTime.toLocaleTimeString()}</p>
                <p><strong>Timezone Offset:</strong> {currentTime.getTimezoneOffset() / -60} hours from UTC</p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Date Format Examples</h3>

            {isLoading ? (
              <>
                <p><strong>Today:</strong> <Skeleton className="h-4 w-24 inline-block" /></p>
                <p><strong>Tomorrow:</strong> <Skeleton className="h-4 w-24 inline-block" /></p>
                <p><strong>Next Week:</strong> <Skeleton className="h-4 w-24 inline-block" /></p>
                <p><strong>ISO Format:</strong> <Skeleton className="h-4 w-40 inline-block" /></p>
              </>
            ) : (
              <>
                <p><strong>Today:</strong> {format(exampleDates.today)}</p>
                <p><strong>Tomorrow:</strong> {format(exampleDates.tomorrow)}</p>
                <p><strong>Next Week:</strong> {format(exampleDates.nextWeek)}</p>
                <p><strong>ISO Format:</strong> {exampleDates.today.toISOString()}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
