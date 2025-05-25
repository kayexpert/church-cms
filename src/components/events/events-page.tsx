"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import dynamic from 'next/dynamic';
import {
  Calendar,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  Database,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setupEventsTables } from "@/utils/setup-events-tables";
import { supabase } from "@/lib/supabase";
import { EventCalendar } from "@/components/events/event-calendar";
import { EventList } from "@/components/events/event-list";
import { useEvents, useEventCategories, useEventMutations } from "@/hooks/useEvents";
import { EventWithCategory } from "@/services/event-service";
import { toast } from "sonner";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";

// Loading component for dynamic imports
const DialogLoader = () => (
  <div className="p-4 flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin mr-2" />
    <span>Loading...</span>
  </div>
);

// Dynamically import dialog components with preloading
const CreateEventDialog = dynamic(() =>
  import('@/components/events/create-event-dialog').then(mod => mod.CreateEventDialog),
  { ssr: false, loading: () => <DialogLoader /> }
);

const ViewEventDialog = dynamic(() =>
  import('@/components/events/view-event-dialog').then(mod => mod.ViewEventDialog),
  { ssr: false, loading: () => <DialogLoader /> }
);

const EditEventDialog = dynamic(() =>
  import('@/components/events/edit-event-dialog').then(mod => mod.EditEventDialog),
  { ssr: false, loading: () => <DialogLoader /> }
);

const DeleteEventDialog = dynamic(() =>
  import('@/components/events/delete-event-dialog').then(mod => mod.DeleteEventDialog),
  { ssr: false, loading: () => <DialogLoader /> }
);

// Preload dialog components
if (typeof window !== 'undefined') {
  // Preload in sequence with small delays to avoid overwhelming the browser
  const preloadDialogs = async () => {
    // Wait for initial render
    setTimeout(() => import('@/components/events/create-event-dialog'), 1000);
    setTimeout(() => import('@/components/events/view-event-dialog'), 1500);
    setTimeout(() => import('@/components/events/edit-event-dialog'), 2000);
    setTimeout(() => import('@/components/events/delete-event-dialog'), 2500);
  };

  preloadDialogs();
}

interface EventsPageProps {
  initialTablesExist?: boolean;
}

export function EventsPage({ initialTablesExist }: EventsPageProps) {
  // State for view management
  const [activeView, setActiveView] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithCategory | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State for table existence check
  const [tablesExist, setTablesExist] = useState<boolean | null>(initialTablesExist ?? null);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [isSettingUpTables, setIsSettingUpTables] = useState(false);

  // Check if the events tables exist (only if not provided from server)
  useEffect(() => {
    // Skip check if we already have the value from the server
    if (initialTablesExist !== undefined) return;

    const checkTables = async () => {
      try {
        // Check if the events table exists by trying to get the count
        const { error } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });

        // If there's no error, the table exists
        setTablesExist(!error);
        if (error) {
          setTablesError(error.message);
        }
      } catch (error) {
        console.error("Error checking tables:", error);
        setTablesExist(false);
        setTablesError("Error checking tables: " + (error instanceof Error ? error.message : String(error)));
      }
    };

    checkTables();
  }, [initialTablesExist]);

  // Handle setting up the events tables
  const handleSetupTables = async () => {
    try {
      setIsSettingUpTables(true);
      const result = await setupEventsTables();

      if (result.success) {
        setTablesExist(true);
        setTablesError(null);
      } else {
        setTablesError(result.message);
      }
    } catch (error) {
      console.error("Error setting up tables:", error);
      setTablesError("Error setting up tables: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSettingUpTables(false);
    }
  };

  // Get event categories for filtering
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError
  } = useEventCategories();

  // Log any category loading errors
  useEffect(() => {
    if (categoriesError) {
      console.error('Error loading event categories:', categoriesError);
    }
  }, [categoriesError]);

  const { deleteEventMutation } = useEventMutations();

  // Get events with filters
  const {
    data: events = [],
    isLoading: isEventsLoading,
    error: eventsError
  } = useEvents({
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    refreshTrigger,
  });

  // Log any event loading errors
  useEffect(() => {
    if (eventsError) {
      console.error('Error loading events:', eventsError);
    }
  }, [eventsError]);

  // Combined loading state
  const isLoading = isEventsLoading || isCategoriesLoading;

  // Memoized filtered events
  const filteredEvents = useMemo(() => {
    return events || [];
  }, [events]);

  // Event handlers with useCallback for better performance
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  }, []);

  const handleToday = useCallback(() => {
    setCurrentMonth(startOfMonth(new Date()));
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleSelectEvent = useCallback((event: EventWithCategory) => {
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
  }, []);

  const handleAddEvent = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleEditEvent = useCallback(() => {
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(() => {
    setIsViewDialogOpen(false);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return;

    try {
      await deleteEventMutation.mutateAsync(selectedEvent.id);
      toast.success("Event deleted successfully");
      setRefreshTrigger(prev => prev + 1);
      setIsDeleteDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  }, [deleteEventMutation, selectedEvent]);

  const handleEventCreated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsCreateDialogOpen(false);
  }, []);

  const handleEventUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsEditDialogOpen(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Table existence check */}
      {tablesExist === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Database Tables Missing</AlertTitle>
          <AlertDescription>
            <p>The events tables don't exist in the database. You can set them up automatically or manually.</p>
            {tablesError && (
              <p className="mt-2 text-sm">
                <strong>Error:</strong> {tablesError}
              </p>
            )}
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleSetupTables}
                disabled={isSettingUpTables}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {isSettingUpTables ? "Setting Up Tables..." : "Set Up Tables Automatically"}
              </Button>
              <p className="text-sm text-muted-foreground mt-2 sm:mt-0 sm:self-center">
                Or run the SQL in <code>src/db/migrations/create_events_tables.sql</code> manually in your Supabase SQL Editor.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar Controls - Improved responsive layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>

        {/* Filters section - stacks on mobile, side by side on larger screens */}
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Filter controls - full width on mobile, side by side on tablet+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
            >
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Navigation and action buttons - flex row on all screen sizes */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday} className="whitespace-nowrap">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleAddEvent} className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs
        defaultValue="calendar"
        value={activeView}
        onValueChange={(value) => setActiveView(value as "calendar" | "list")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <Suspense fallback={
            <Card className="p-4">
              <div className="flex justify-center items-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </Card>
          }>
            <Card>
              <EventCalendar
                events={filteredEvents}
                currentMonth={currentMonth}
                onSelectDate={handleSelectDate}
                onSelectEvent={handleSelectEvent}
                isLoading={isLoading}
              />
            </Card>
          </Suspense>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Suspense fallback={
            <Card className="p-4">
              <div className="flex justify-center items-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </Card>
          }>
            <EventList
              events={filteredEvents}
              currentMonth={currentMonth}
              onSelectEvent={handleSelectEvent}
              isLoading={isLoading}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Event Dialogs */}
      <CreateEventDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onEventCreated={handleEventCreated}
        categories={categories}
        initialDate={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
      />

      {selectedEvent && (
        <>
          <ViewEventDialog
            event={selectedEvent}
            isOpen={isViewDialogOpen}
            onClose={() => setIsViewDialogOpen(false)}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
          />

          <EditEventDialog
            event={selectedEvent}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onEventUpdated={handleEventUpdated}
          />

          <DeleteEventDialog
            eventId={selectedEvent.id}
            eventTitle={selectedEvent.title}
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={confirmDeleteEvent}
          />
        </>
      )}
    </div>
  );
}
