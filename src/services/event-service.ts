import { supabase } from "@/lib/supabase";
import { ServiceResponse } from "@/types";

// Define the Event type based on the database schema
export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  location?: string;
  type?: string;
  organizer?: string;
  category_id?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  color?: string;
  department_id?: string;
  is_all_day?: boolean;
  start_time?: string;
  end_time?: string;
  created_at?: string;
  updated_at?: string;
}

// Event with category information
export interface EventWithCategory extends Event {
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  department?: {
    id: string;
    name: string;
  };
}

// Event category type
export interface EventCategory {
  id: string;
  name: string;
  color?: string;
  // Note: description field exists in the database schema but is not used in the UI
  description?: string;
}

/**
 * Get all events with optional filtering
 */
export async function getEvents(options?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  categoryId?: string;
  departmentId?: string;
}): Promise<ServiceResponse<EventWithCategory[]>> {
  try {
    // Build the query directly without checking table existence first
    let query = supabase
      .from('events')
      .select(`
        *,
        category:category_id(id, name, color),
        department:department_id(id, name)
      `)
      .order('date', { ascending: true });

    // Apply filters if provided
    if (options?.startDate) {
      query = query.gte('date', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('date', options.endDate);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.departmentId) {
      query = query.eq('department_id', options.departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching events:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Get upcoming events for the next N days
 */
export async function getUpcomingEvents(days: number = 7): Promise<ServiceResponse<EventWithCategory[]>> {
  try {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const result = await getEvents({
      startDate: startDateStr,
      endDate: endDateStr,
      status: 'upcoming'
    });

    // If there was an error, log it but still return an empty array
    if (result.error) {
      console.error('Error in getUpcomingEvents:', result.error);
      return { data: [], error: result.error };
    }

    return result;
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Get a single event by ID
 */
export async function getEventById(id: string): Promise<ServiceResponse<EventWithCategory>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        category:category_id(id, name, color),
        department:department_id(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching event ${id}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching event ${id}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Add a new event
 */
export async function addEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<Event>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('Error adding event:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error adding event:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(id: string, event: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>): Promise<ServiceResponse<Event>> {
  try {
    // Filter out undefined values and empty UUID strings
    const cleanedEvent: any = {};
    Object.keys(event).forEach(key => {
      const value = event[key as keyof typeof event];

      // Skip undefined values
      if (value === undefined) {
        return;
      }

      // Handle UUID fields - convert empty strings to null
      if ((key === 'category_id' || key === 'department_id') && value === '') {
        cleanedEvent[key] = null;
      } else {
        cleanedEvent[key] = value;
      }
    });

    // Prepare the update data
    const updateData = {
      ...cleanedEvent,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message || 'Unknown error updating event') };
    }

    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating event';
    return { data: null, error: new Error(errorMessage) };
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting event ${id}:`, error);
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error(`Error deleting event ${id}:`, error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all event categories
 */
export async function getEventCategories(): Promise<ServiceResponse<EventCategory[]>> {
  try {
    const { data, error } = await supabase
      .from('event_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching event categories:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching event categories:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Add a new event category
 */
export async function addEventCategory(category: Omit<EventCategory, 'id'>): Promise<ServiceResponse<EventCategory>> {
  try {
    // First check if a category with the same name already exists
    const { data: existingCategory, error: checkError } = await supabase
      .from('event_categories')
      .select('id')
      .eq('name', category.name)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing category:', checkError);
      return { data: null, error: checkError };
    }

    if (existingCategory) {
      const duplicateError = new Error(`A category with the name "${category.name}" already exists`);
      console.error('Error adding event category:', duplicateError);
      return { data: null, error: duplicateError };
    }

    // If no duplicate exists, proceed with insertion
    const { data, error } = await supabase
      .from('event_categories')
      .insert(category)
      .select()
      .single();

    if (error) {
      console.error('Error adding event category:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error adding event category:', errorMessage);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Update an existing event category
 */
export async function updateEventCategory(id: string, category: Partial<Omit<EventCategory, 'id'>>): Promise<ServiceResponse<EventCategory>> {
  try {
    // Check if the category exists
    const { data: existingCategory, error: checkError } = await supabase
      .from('event_categories')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error(`Error checking if category ${id} exists:`, checkError);
      return { data: null, error: checkError };
    }

    if (!existingCategory) {
      const notFoundError = new Error(`Category with ID ${id} not found`);
      console.error('Error updating event category:', notFoundError);
      return { data: null, error: notFoundError };
    }

    // Update the category
    const { data, error } = await supabase
      .from('event_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating event category ${id}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error updating event category ${id}:`, errorMessage);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Delete an event category
 */
export async function deleteEventCategory(id: string): Promise<ServiceResponse<null>> {
  try {
    // First check if there are any events using this category
    const { data: eventsUsingCategory, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (checkError) {
      console.error(`Error checking if category ${id} is in use:`, checkError);
      return { data: null, error: checkError };
    }

    if (eventsUsingCategory && eventsUsingCategory.length > 0) {
      const inUseError = new Error(`Cannot delete category because it is being used by one or more events`);
      console.error('Error deleting event category:', inUseError);
      return { data: null, error: inUseError };
    }

    // If not in use, proceed with deletion
    const { error } = await supabase
      .from('event_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting event category ${id}:`, error);
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error deleting event category ${id}:`, errorMessage);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// This real-time subscription functionality is not currently used in the application
// and can be safely removed or replaced with a more efficient implementation
// if real-time updates are needed in the future.
