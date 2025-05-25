import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Sets up the events tables in the database
 * This function can be called from the client side to set up the events tables
 */
export async function setupEventsTables(): Promise<{ success: boolean; message: string }> {
  try {
    // Show progress toast
    const progressToast = toast.loading("Setting up events tables...");

    // Check if the events table already exists
    const { count, error: countError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    // If there's no error, the table exists
    if (!countError) {
      toast.dismiss(progressToast);
      toast.info("Events tables already exist");
      return { success: true, message: "Events tables already exist" };
    }

    // Get the SQL content from the create_events_tables.sql file
    const response = await fetch('/api/db/get-migration-sql?file=create_events_tables.sql');

    if (!response.ok) {
      const errorText = await response.text();
      toast.dismiss(progressToast);
      toast.error(`Failed to get SQL: ${errorText}`);
      return {
        success: false,
        message: `Failed to get SQL: ${errorText}`
      };
    }

    const sqlContent = await response.text();

    // Execute the SQL using the execute_sql RPC function
    const { error } = await supabase.rpc('execute_sql', { query: sqlContent });

    if (error) {
      console.error("Error setting up events tables:", error);
      toast.dismiss(progressToast);
      toast.error(`Failed to set up events tables: ${error.message}`);
      return {
        success: false,
        message: `Error setting up events tables: ${error.message}`
      };
    }

    // Verify that the tables were created
    const { error: verifyEventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    const { error: verifyDepartmentsError } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true });

    const { error: verifyCategoriesError } = await supabase
      .from('event_categories')
      .select('*', { count: 'exact', head: true });

    if (verifyEventsError || verifyDepartmentsError || verifyCategoriesError) {
      console.error("Error verifying tables:", {
        events: verifyEventsError,
        departments: verifyDepartmentsError,
        categories: verifyCategoriesError
      });
      toast.dismiss(progressToast);
      toast.error(`Tables may not have been created properly. Check the console for details.`);
      return {
        success: false,
        message: `Tables may not have been created properly. Check the console for details.`
      };
    }

    toast.dismiss(progressToast);
    toast.success("Events tables set up successfully");
    return {
      success: true,
      message: "Events tables set up successfully"
    };
  } catch (error) {
    console.error("Error setting up events tables:", error);
    toast.error(`Error setting up events tables: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: `Error setting up events tables: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
