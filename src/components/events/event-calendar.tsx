"use client";

import { useState, useMemo, useEffect } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  parseISO
} from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { EventWithCategory } from "@/services/event-service";
import { cn } from "@/lib/utils";
import { formatEventTime, getEventColor } from "@/utils/event-utils";

interface EventCalendarProps {
  events: EventWithCategory[];
  currentMonth: Date;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: EventWithCategory) => void;
  isLoading?: boolean;
}

export function EventCalendar({
  events,
  currentMonth,
  onSelectDate,
  onSelectEvent,
  isLoading = false
}: EventCalendarProps) {
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

  // Get all dates in current month view (including some days from prev/next month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });
  }, [currentMonth]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Ensure events is an array before filtering
    if (!Array.isArray(events)) {
      console.warn('Events is not an array in getEventsForDate', events);
      return [];
    }

    return events.filter(event => {
      try {
        if (!event || !event.date) return false;
        const eventDate = parseISO(event.date);
        return isSameDay(eventDate, date);
      } catch (error) {
        console.error('Error parsing event date:', error, event);
        return false;
      }
    });
  };

  // Event utility functions are now imported from @/utils/event-utils

  // Memoize the skeleton loading state
  const loadingSkeleton = useMemo(() => (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i + 7} className="h-24 w-full" />
        ))}
      </div>
    </div>
  ), []);

  if (isLoading) {
    return loadingSkeleton;
  }

  // Determine day name format based on screen size
  const dayNameFormat = isMobile ? 'EEEEE' : 'EEE'; // Single letter on mobile, 3 letters otherwise

  return (
    <div className="p-2 sm:p-4 overflow-x-auto">
      <div className="grid grid-cols-7 gap-px min-w-[700px] sm:min-w-0">
        {/* Days of week headers */}
        {calendarDays.slice(0, 7).map((date) => (
          <div
            key={format(date, 'EEEE')}
            className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground"
          >
            {format(date, dayNameFormat)}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((date, index) => {
          const dateEvents = getEventsForDate(date);
          const isCurrentDate = isToday(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);

          // Determine how many events to show based on screen size and available space
          const maxVisibleEvents = isMobile ? 1 : 3;

          return (
            <div
              key={index}
              onClick={() => onSelectDate(date)}
              className={cn(
                "min-h-16 sm:min-h-24 p-1 border border-border relative",
                isCurrentMonth ? "bg-background" : "bg-muted/30",
                isCurrentDate && "ring-2 ring-primary ring-inset",
                "hover:bg-accent/50 cursor-pointer transition-colors"
              )}
            >
              <div
                className={cn(
                  "text-xs sm:text-sm p-1 text-right",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                  isCurrentDate && "font-bold"
                )}
              >
                {format(date, "dd")}
              </div>

              <div className="space-y-1">
                {dateEvents.slice(0, maxVisibleEvents).map((event) => {
                  const { bg, text } = getEventColor(event);

                  // Simplified event display on mobile
                  const eventTitle = isMobile
                    ? event.title
                    : (event.is_all_day
                        ? event.title
                        : `${formatEventTime(event.start_time)} ${event.title}`);

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className="px-1 sm:px-2 py-1 text-xs rounded truncate cursor-pointer"
                      style={{ backgroundColor: bg, color: text }}
                    >
                      {eventTitle}
                    </div>
                  );
                })}

                {dateEvents.length > maxVisibleEvents && (
                  <div className="text-xs text-muted-foreground px-1 sm:px-2">
                    +{dateEvents.length - maxVisibleEvents} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
