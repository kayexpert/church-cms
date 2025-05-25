import { supabase } from "@/lib/supabase";
import fs from 'fs';
import path from 'path';

/**
 * Checks if the events tables exist and creates them if they don't
 * This function can be called from the client side to ensure the tables exist
 */
export async function ensureEventsTables(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if the events table exists
    const { count, error: countError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    
    // If there's no error, the table exists
    if (!countError) {
      return { success: true, message: "Events tables already exist" };
    }
    
    // If we get here, the table doesn't exist, so we need to create it
    console.log("Events tables don't exist. Attempting to create them...");
    
    // Get the SQL from the migration file
    const sqlPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'create_events_tables.sql');
    
    if (!fs.existsSync(sqlPath)) {
      return { 
        success: false, 
        message: "Migration file not found. Please run the migration manually." 
      };
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('execute_sql', { query: sql });
    
    if (error) {
      console.error("Error creating events tables:", error);
      return { 
        success: false, 
        message: `Error creating events tables: ${error.message}` 
      };
    }
    
    return { 
      success: true, 
      message: "Events tables created successfully" 
    };
  } catch (error) {
    console.error("Error ensuring events tables:", error);
    return { 
      success: false, 
      message: `Error ensuring events tables: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}
