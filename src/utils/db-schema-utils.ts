/**
 * Database Schema Utilities
 * 
 * This module provides utilities for checking and fixing database schema issues.
 */

/**
 * Check and fix the database schema if needed
 * @param context A string identifying where this function was called from (for logging)
 * @returns A promise that resolves when the check is complete
 */
export async function checkAndFixDatabaseSchema(context: string): Promise<boolean> {
  try {
    console.log(`[${context}] Checking and fixing database schema if needed...`);
    
    // Call the API to fix the database schema
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/db/fix-messaging-system`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      console.error(`[${context}] Failed to fix database schema:`, await response.text());
      return false;
    }
    
    console.log(`[${context}] Database schema fix initiated. Waiting for completion...`);
    
    // Wait a moment for the schema changes to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    console.error(`[${context}] Error fixing database schema:`, error);
    return false;
  }
}

/**
 * Check if a table exists in the database
 * @param supabaseClient The Supabase client to use
 * @param tableName The name of the table to check
 * @param context A string identifying where this function was called from (for logging)
 * @returns A promise that resolves to true if the table exists, false otherwise
 */
export async function checkTableExists(
  supabaseClient: any,
  tableName: string,
  context: string
): Promise<boolean> {
  try {
    console.log(`[${context}] Checking if table '${tableName}' exists...`);
    
    const { count, error } = await supabaseClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`[${context}] Error checking if table '${tableName}' exists:`, error);
      
      // If the error message indicates the table doesn't exist, return false
      if (error.message && (
          error.message.includes('relation') || 
          error.message.includes('does not exist')
      )) {
        console.log(`[${context}] Table '${tableName}' does not exist`);
        return false;
      }
      
      // For other errors, we're not sure, so return false to be safe
      return false;
    }
    
    console.log(`[${context}] Table '${tableName}' exists with ${count} rows`);
    return true;
  } catch (error) {
    console.error(`[${context}] Exception checking if table '${tableName}' exists:`, error);
    return false;
  }
}
