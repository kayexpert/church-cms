import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API route to check if a database function exists
 */
export async function GET(request: Request) {
  try {
    // Get the function name from the query parameters
    const url = new URL(request.url);
    const functionName = url.searchParams.get("function_name");
    
    if (!functionName) {
      return NextResponse.json(
        { error: "Function name is required" },
        { status: 400 }
      );
    }
    
    // SQL to check if the function exists
    const sql = `
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE pg_proc.proname = '${functionName}'
        AND pg_namespace.nspname = 'public'
      ) AS function_exists;
    `;
    
    // Execute the SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql });
    
    if (error) {
      console.error("Error checking if function exists:", error);
      
      // Try a direct query as a fallback
      try {
        const { data: directData, error: directError } = await supabase
          .from('_dummy_query')
          .select('*')
          .limit(1);
        
        if (directError) {
          return NextResponse.json(
            { error: "Failed to check if function exists", details: directError },
            { status: 500 }
          );
        }
        
        // If we can query the database but not check for the function, assume it doesn't exist
        return NextResponse.json({ exists: false });
      } catch (err) {
        return NextResponse.json(
          { error: "Failed to check if function exists", details: err },
          { status: 500 }
        );
      }
    }
    
    // Check if the function exists
    const exists = data && data.length > 0 && data[0].function_exists;
    
    return NextResponse.json({ exists });
  } catch (error) {
    console.error("Error checking if function exists:", error);
    return NextResponse.json(
      { error: "Failed to check if function exists", details: error },
      { status: 500 }
    );
  }
}
