/**
 * Database Health Check Utility
 *
 * This utility provides functions to check the health of the database,
 * verify required functions exist, and diagnose common issues.
 */
import { supabase } from './supabase';
import { toast } from 'sonner';

/**
 * Check if a database function exists
 * @param functionName The name of the function to check
 * @returns Promise<boolean> True if the function exists, false otherwise
 */
export async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    // First try using the check_function_exists utility function
    const { data: existsData, error: existsError } = await supabase.rpc('check_function_exists', {
      function_name: functionName
    });

    if (!existsError && existsData !== null) {
      return !!existsData;
    }

    // If the utility function doesn't exist, try a direct query
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT EXISTS (
          SELECT 1
          FROM pg_proc
          WHERE proname = '${functionName}'
        ) as exists
      `
    });

    if (error) {
      console.error(`Error checking if function ${functionName} exists:`, error);
      return false;
    }

    return data && data[0] ? !!data[0].exists : false;
  } catch (error) {
    console.error(`Exception checking if function ${functionName} exists:`, error);
    return false;
  }
}

/**
 * Check if a table exists
 * @param tableName The name of the table to check
 * @returns Promise with detailed result about the table check
 */
export async function checkTableExists(tableName: string): Promise<{
  exists: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log(`Checking if table ${tableName} exists...`);

    // First try using the exec_sql function
    console.log(`Trying to check table ${tableName} using exec_sql...`);
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        ) as exists
      `
    });

    if (error) {
      console.error(`Error in exec_sql for table ${tableName}:`, error);
    } else {
      console.log(`exec_sql result for table ${tableName}:`, data);
    }

    if (error) {
      console.log(`Error using exec_sql to check table ${tableName}:`, error);

      // If exec_sql function doesn't exist, try a direct query
      try {
        console.log(`Trying direct query for table ${tableName}...`);
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (tableError) {
          console.log(`Direct query error for table ${tableName}:`, tableError);
          return {
            exists: false,
            error: tableError.message,
            details: tableError
          };
        }

        return { exists: true };
      } catch (directError) {
        console.error(`Exception in direct query for table ${tableName}:`, directError);
        return {
          exists: false,
          error: directError instanceof Error ? directError.message : String(directError)
        };
      }
    }

    const exists = data && data[0] ? !!data[0].exists : false;
    console.log(`Table ${tableName} exists: ${exists}`);
    return { exists };
  } catch (error) {
    console.error(`Exception checking if table ${tableName} exists:`, error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get a list of all tables in the database
 * @returns Promise with the list of tables
 */
export async function listAllTables(): Promise<{
  tables: string[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
    });

    if (error) {
      return {
        tables: [],
        error: error.message
      };
    }

    return {
      tables: data ? data.map((row: any) => row.table_name) : []
    };
  } catch (error) {
    console.error('Exception listing all tables:', error);
    return {
      tables: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check database health by performing a simple query
 * @returns Promise with the health check result
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = performance.now();

  try {
    const { data, error } = await supabase
      .from('church_info')
      .select('id')
      .limit(1);

    const responseTime = performance.now() - startTime;

    if (error) {
      return {
        healthy: false,
        responseTime,
        error: error.message
      };
    }

    return {
      healthy: true,
      responseTime
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;

    return {
      healthy: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run a comprehensive database health check
 * @returns Promise with the health check results
 */
export async function runDatabaseHealthCheck(): Promise<{
  overall: boolean;
  details: {
    connection: boolean;
    requiredTables: { [key: string]: { exists: boolean; error?: string } };
    requiredFunctions: { [key: string]: boolean };
    allTables?: string[];
  };
  responseTime: number;
  error?: string;
}> {
  const startTime = performance.now();

  try {
    // Check basic connection
    const connectionCheck = await checkDatabaseHealth();

    // Even if the connection check fails, we'll still try to check tables and functions
    // This helps diagnose issues where the connection works but specific tables don't exist
    const isConnected = connectionCheck.healthy;

    // Required tables to check
    const requiredTables = [
      'church_info',
      'members',
      'departments',
      'income_entries',
      'expenditure_entries',
      'liability_entries',
      'events',
      'attendance'
    ];

    // Required functions to check
    const requiredFunctions = [
      'check_function_exists',
      'get_income_report',
      'get_expenditure_report',
      'get_liability_report',
      'get_balance_sheet',
      'get_gender_distribution',
      'get_status_distribution',
      'get_event_summary_report'
    ];

    // Get list of all tables
    const { tables: allTables, error: listTablesError } = await listAllTables();

    // Check tables
    const tableResults: { [key: string]: { exists: boolean; error?: string } } = {};
    for (const table of requiredTables) {
      const result = await checkTableExists(table);
      tableResults[table] = result;
    }

    // Check functions
    const functionResults: { [key: string]: boolean } = {};
    for (const func of requiredFunctions) {
      functionResults[func] = await checkFunctionExists(func);
    }

    // Determine overall health
    const allTablesExist = Object.values(tableResults).every(result => result.exists);
    const allFunctionsExist = Object.values(functionResults).every(exists => exists);
    const overall = isConnected && allTablesExist && allFunctionsExist;

    return {
      overall,
      details: {
        connection: isConnected,
        requiredTables: tableResults,
        requiredFunctions: functionResults,
        allTables: allTables
      },
      responseTime: performance.now() - startTime,
      error: connectionCheck.error || listTablesError
    };
  } catch (error) {
    return {
      overall: false,
      details: {
        connection: false,
        requiredTables: {},
        requiredFunctions: {}
      },
      responseTime: performance.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
