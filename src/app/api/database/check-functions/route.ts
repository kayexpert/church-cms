import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to check if both exec_sql and exec_sql_void functions exist in the database
 * GET /api/database/check-functions
 */
export async function GET() {
  try {
    // Use a direct SQL query to check for both functions
    const query = `
      SELECT 
        EXISTS (
          SELECT 1 
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE p.proname = 'exec_sql'
          AND n.nspname = 'public'
        ) as exec_sql_exists,
        EXISTS (
          SELECT 1 
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE p.proname = 'exec_sql_void'
          AND n.nspname = 'public'
        ) as exec_sql_void_exists;
    `;
    
    // Try using the regular client first
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: query 
      });
      
      if (!error && data && data.length > 0) {
        return NextResponse.json({
          exec_sql: data[0].exec_sql_exists === true,
          exec_sql_void: data[0].exec_sql_void_exists === true,
          message: 'Function check completed successfully'
        });
      }
    } catch (error) {
      console.log('Error checking functions with exec_sql:', error);
    }
    
    // If the first approach fails, try using service role
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Try to execute the query directly
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: query
        });
        
        if (!error && data && data.length > 0) {
          return NextResponse.json({
            exec_sql: data[0].exec_sql_exists === true,
            exec_sql_void: data[0].exec_sql_void_exists === true,
            message: 'Function check completed successfully using service role'
          });
        }
      } catch (serviceRoleError) {
        console.log('Error checking functions with service role:', serviceRoleError);
      }
    }
    
    // If all approaches fail, try individual checks
    const execSqlExists = await checkFunctionExists('exec_sql');
    const execSqlVoidExists = await checkFunctionExists('exec_sql_void');
    
    return NextResponse.json({
      exec_sql: execSqlExists,
      exec_sql_void: execSqlVoidExists,
      message: 'Function check completed using individual checks'
    });
  } catch (error) {
    console.error('Error checking database functions:', error);
    return NextResponse.json({ 
      exec_sql: false,
      exec_sql_void: false,
      message: 'Error checking database functions',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Helper function to check if a specific function exists
 */
async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    // Try to execute the function directly
    const { error } = await supabase.rpc(functionName, { 
      sql_query: 'SELECT 1' 
    });
    
    // If there's no error, the function exists
    if (!error) {
      return true;
    }
    
    // If there's an error but it's not about the function not existing,
    // it might still exist but have other issues
    if (!error.message.includes(`function "${functionName}" does not exist`)) {
      return true;
    }
    
    return false;
  } catch (error) {
    // If there's an exception, assume the function doesn't exist
    return false;
  }
}
