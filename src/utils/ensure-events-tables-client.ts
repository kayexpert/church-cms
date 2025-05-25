import { supabase } from "@/lib/supabase";

/**
 * Client-side function to check if the events tables exist
 * This is a simplified version that doesn't create the tables
 * but can be used to check if they exist and show a message to the user
 */
export async function checkEventsTables(): Promise<{ exists: boolean; error?: string }> {
  try {
    // Check if the events table exists
    const { count, error: eventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    
    // Check if the event_categories table exists
    const { count: categoryCount, error: categoriesError } = await supabase
      .from('event_categories')
      .select('*', { count: 'exact', head: true });
    
    // If there's no error, the tables exist
    if (!eventsError && !categoriesError) {
      return { exists: true };
    }
    
    // If we get here, at least one table doesn't exist
    const errors = [];
    if (eventsError) errors.push(`Events table: ${eventsError.message}`);
    if (categoriesError) errors.push(`Event categories table: ${categoriesError.message}`);
    
    return { 
      exists: false, 
      error: `Tables don't exist: ${errors.join(', ')}` 
    };
  } catch (error) {
    console.error("Error checking events tables:", error);
    return { 
      exists: false, 
      error: `Error checking events tables: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}
