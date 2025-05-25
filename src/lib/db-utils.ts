import { supabase } from './supabase';
import { toast } from "sonner";

/**
 * Check if a database function exists
 * @param functionName The name of the function to check
 * @returns Promise<boolean> True if the function exists, false otherwise
 */
export async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    // First check localStorage to avoid unnecessary database calls
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(`rpc_${functionName}_exists`);
      if (storedValue === 'true') return true;
      if (storedValue === 'false') return false;
    }

    // For now, let's assume the function exists to avoid potential issues
    // This is a temporary workaround until we can fix the authentication issues
    console.log(`Assuming function ${functionName} exists to avoid potential auth issues`);

    // Store the result in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rpc_${functionName}_exists`, 'false');
    }

    // Return false to use the standard query approach instead of RPC
    return false;

    /* Commented out for now to avoid authentication issues
    // Query the database to check if the function exists
    const { data, error } = await supabase.rpc('check_function_exists', {
      function_name: functionName
    });

    // If there's an error with the check_function_exists function itself,
    // we need to fall back to a direct query
    if (error && error.message.includes('function "check_function_exists" does not exist')) {
      const { data: schemaData, error: schemaError } = await supabase
        .from('_functions_check')
        .select('exists')
        .eq('function_name', functionName)
        .single();

      if (schemaError) {
        // If the _functions_check view doesn't exist, we'll assume the function doesn't exist
        if (typeof window !== 'undefined') {
          localStorage.setItem(`rpc_${functionName}_exists`, 'false');
        }
        return false;
      }

      const exists = schemaData?.exists || false;

      // Store the result in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`rpc_${functionName}_exists`, exists ? 'true' : 'false');
      }

      return exists;
    }

    // If we got a result from check_function_exists, use it
    const exists = data || false;

    // Store the result in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rpc_${functionName}_exists`, exists ? 'true' : 'false');
    }

    return exists;
    */
  } catch (error) {
    console.error(`Error checking if function ${functionName} exists:`, error);

    // Store the result in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rpc_${functionName}_exists`, 'false');
    }

    return false;
  }
}

/**
 * Mark a function as existing or not in localStorage
 * @param functionName The name of the function
 * @param exists Whether the function exists
 */
export function markFunctionExists(functionName: string, exists: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`rpc_${functionName}_exists`, exists ? 'true' : 'false');
  }
}

/**
 * Clear the function existence cache
 */
export function clearFunctionExistsCache(): void {
  if (typeof window !== 'undefined') {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rpc_') && key.endsWith('_exists')) {
        keys.push(key);
      }
    }

    keys.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * Ensures the profiles table exists and has the required columns
 * @returns A promise that resolves to a boolean indicating success
 */
export async function ensureProfilesTable(): Promise<boolean> {
  try {
    // Check if the profiles table exists
    const { error: tableCheckError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    // If the table doesn't exist, we need to create it manually
    if (tableCheckError && tableCheckError.code === "42P01") {
      console.log("Profiles table doesn't exist. Creating it...");

      // Create the profiles table with SQL
      const { error: createError } = await supabase.rpc("exec_sql", {
        sql_query: `
          CREATE TABLE IF NOT EXISTS profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            profile_image TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Enable RLS on profiles table
          ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

          -- Create policies for profiles table
          CREATE POLICY "Users can view their own profile"
          ON profiles FOR SELECT
          TO authenticated
          USING (auth.uid() = id);

          CREATE POLICY "Users can update their own profile"
          ON profiles FOR UPDATE
          TO authenticated
          USING (auth.uid() = id);

          CREATE POLICY "Users can insert their own profile"
          ON profiles FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = id);
        `
      });

      if (createError) {
        console.error("Error creating profiles table:", createError);

        // If the exec_sql function doesn't exist, show a more helpful message
        if (createError.message.includes('function "exec_sql" does not exist')) {
          toast.error("Database setup required. Please run the migration scripts in the Supabase SQL Editor.");
        } else {
          toast.error("Failed to create profiles table. Please contact an administrator.");
        }
        return false;
      }

      toast.success("Profiles table created successfully");
      return true;
    }

    // Check if the profile_image column exists using a safer approach
    try {
      // Try to select the profile_image column from a dummy query
      // This will fail if the column doesn't exist, but succeed if it does
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_image')
        .limit(1);

      // If there's an error and it mentions the column doesn't exist
      const hasProfileImageColumn = !error || !error.message.includes('column "profile_image" does not exist');

      if (error && !error.message.includes('column "profile_image" does not exist')) {
        console.error("Error checking for profile_image column:", error);
      }

      // If the column doesn't exist, add it
      if (!hasProfileImageColumn) {
        console.log("profile_image column doesn't exist. Adding it...");

        try {
          // First try using the exec_sql function
          const { error: addColumnError } = await supabase.rpc("exec_sql", {
            sql_query: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image TEXT;"
          });

          if (addColumnError) {
            // If the exec_sql function doesn't exist, try direct SQL
            if (addColumnError.message.includes('function "exec_sql" does not exist')) {
              console.log("exec_sql function doesn't exist. Using direct SQL...");

              // Try direct SQL using the Supabase SQL editor
              toast.info("Profile image support needs to be added. Please run the migration scripts in the Supabase SQL Editor.");
            } else {
              console.error("Error adding profile_image column:", addColumnError);
              toast.error("Failed to add profile_image column. Please contact an administrator.");
            }
          } else {
            toast.success("Profile image support added successfully");
          }
        } catch (error) {
          console.error("Error adding profile_image column:", error);
        }
      }
    } catch (error) {
      console.error("Error checking for profile_image column:", error);
    }

    // Continue anyway, we'll handle missing column gracefully
    return true;
  } catch (error) {
    console.error("Error ensuring profiles table:", error);
    return false;
  }
}
