"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getUpcomingEvents, EventWithCategory } from "@/services/event-service";
import { ViewEventDialog } from "@/components/events/view-event-dialog";

export function UpcomingEventsCard() {
  const [events, setEvents] = useState<EventWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithCategory | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getUpcomingEvents(7);
        if (error) {
          console.error("Error fetching upcoming events:", error);
        } else if (data) {
          setEvents(data);
        }
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Next 7 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start space-x-4">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
                <Skeleton className="h-3 w-[180px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[516px] flex flex-col">
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
        <CardDescription>Next 7 days</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {events.length > 0 ? (
          <ScrollArea className="h-[350px] px-6 py-2">
            <div className="space-y-4">
              {events.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  onClick={() => {
                    setSelectedEvent(event);
                    setIsViewOpen(true);
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[350px] px-6">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No upcoming events in the next 7 days</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-4">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/events">View all events</Link>
        </Button>
      </CardFooter>

      {/* View Event Dialog */}
      {selectedEvent && (
        <ViewEventDialog
          event={selectedEvent}
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
        />
      )}
    </Card>
  );
}

interface EventItemProps {
  event: EventWithCategory;
  onClick: () => void;
}

function EventItem({ event, onClick }: EventItemProps) {
  const formattedDate = formatDate(event.date);
  const timeString = event.is_all_day
    ? "All day"
    : event.start_time && event.end_time
    ? `${event.start_time} - ${event.end_time}`
    : "No time specified";

  return (
    <div 
      className="flex items-start space-x-4 rounded-md p-3 transition-all hover:bg-accent cursor-pointer"
      onClick={onClick}
    >
      <div 
        className="flex h-12 w-12 items-center justify-center rounded-md"
        style={{ 
          backgroundColor: `${event.category?.color || "#4CAF50"}20`,
          color: event.category?.color || "#4CAF50"
        }}
      >
        <Calendar className="h-6 w-6" />
      </div>
      <div className="space-y-1 flex-1">
        <h4 className="font-semibold">{event.title}</h4>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <span>{timeString}</span>
          {event.location && (
            <>
              <span className="mx-2">•</span>
              <span>{event.location}</span>
            </>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="mt-1">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
