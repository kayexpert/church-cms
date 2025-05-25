"use client";

import { useMemo, useEffect, useState } from "react";
import { format, parseISO, isSameMonth } from "date-fns";
import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventWithCategory } from "@/services/event-service";
import { cn } from "@/lib/utils";
import { formatEventTime, getStatusBadgeVariant } from "@/utils/event-utils";

interface EventListProps {
  events: EventWithCategory[];
  currentMonth: Date;
  onSelectEvent: (event: EventWithCategory) => void;
  isLoading?: boolean;
}

export function EventList({
  events,
  currentMonth,
  onSelectEvent,
  isLoading = false
}: EventListProps) {
  // State to track viewport size for responsive adjustments
  const [isMobile, setIsMobile] = useState(false);

  // Check viewport size on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Group events by date
  const groupedEvents = useMemo(() => {
    // Ensure events is an array before processing
    if (!Array.isArray(events)) {
      console.warn('Events is not an array in groupedEvents', events);
      return {};
    }

    try {
      // Filter events for current month
      const filteredEvents = events.filter(event => {
        if (!event || !event.date) return false;
        try {
          const eventDate = parseISO(event.date);
          return isSameMonth(eventDate, currentMonth);
        } catch (error) {
          console.error('Error parsing event date:', error, event);
          return false;
        }
      });

      // Sort events by date and time
      const sortedEvents = [...filteredEvents].sort((a, b) => {
        try {
          // First sort by date
          const dateComparison = a.date.localeCompare(b.date);
          if (dateComparison !== 0) return dateComparison;

          // If same date, sort by all-day status (all-day events first)
          if (a.is_all_day && !b.is_all_day) return -1;
          if (!a.is_all_day && b.is_all_day) return 1;

          // If both are all-day or both are not all-day, sort by start time
          if (a.start_time && b.start_time) {
            return a.start_time.localeCompare(b.start_time);
          }

          return 0;
        } catch (error) {
          console.error('Error sorting events:', error, { a, b });
          return 0;
        }
      });

      // Group by date
      const grouped: Record<string, EventWithCategory[]> = {};
      sortedEvents.forEach(event => {
        if (!event || !event.date) return;

        if (!grouped[event.date]) {
          grouped[event.date] = [];
        }
        grouped[event.date].push(event);
      });

      return grouped;
    } catch (error) {
      console.error('Error in groupedEvents:', error);
      return {};
    }
  }, [events, currentMonth]);

  // Event utility functions are now imported from @/utils/event-utils

  // Memoize the skeleton loading state
  const loadingSkeleton = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Events for {format(currentMonth, "MMMM yyyy")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 3 }).map((_, dateIndex) => (
          <div key={dateIndex} className="space-y-4">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 2 }).map((_, eventIndex) => (
              <div key={eventIndex} className="border rounded-md p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  ), [currentMonth]);

  if (isLoading) {
    return loadingSkeleton;
  }

  const dateKeys = Object.keys(groupedEvents).sort();

  if (dateKeys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Events for {format(currentMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No events found</h3>
          <p className="text-muted-foreground mt-1">
            There are no events scheduled for this month
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Events for {format(currentMonth, "MMMM yyyy")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {dateKeys.map(dateStr => (
          <div key={dateStr} className="space-y-4">
            <h3 className="font-medium text-lg">
              {format(parseISO(dateStr), "EEEE, dd-MMM-yy")}
            </h3>

            <div className="space-y-3">
              {groupedEvents[dateStr].map(event => {
                const categoryColor = event.category?.color || event.color || "#4CAF50";

                return (
                  <div
                    key={event.id}
                    className="border rounded-md p-3 sm:p-4 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => onSelectEvent(event)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(event.status)}>
                            {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : "Unknown"}
                          </Badge>

                          {event.category && !isMobile && (
                            <Badge
                              variant="outline"
                              className="border-0"
                              style={{
                                backgroundColor: `${categoryColor}20`,
                                color: categoryColor
                              }}
                            >
                              {event.category.name}
                            </Badge>
                          )}
                        </div>

                        <h4 className="font-semibold text-base truncate pr-2">{event.title}</h4>
                      </div>

                      <Button variant="ghost" size="icon" className="mt-1 flex-shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {event.is_all_day ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">All day</span>
                          </div>
                        ) : (
                          event.start_time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate">
                                {formatEventTime(event.start_time)}
                                {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                              </span>
                            </div>
                          )
                        )}

                        {event.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
