import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from '@supabase/supabase-js';
import fs from "fs";
import path from "path";

export async function GET() {
  return await createExecSqlFunction();
}

export async function POST() {
  return await createExecSqlFunction();
}

async function createExecSqlFunction() {
  try {
    console.log('Creating exec_sql function in Supabase');

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Try to read the SQL file first
    let sqlContent = '';
    try {
      const sqlFilePath = path.join(process.cwd(), "src", "db", "migrations", "create_exec_sql_function.sql");
      if (fs.existsSync(sqlFilePath)) {
        sqlContent = fs.readFileSync(sqlFilePath, "utf8");
        console.log('Read SQL file from disk');
      }
    } catch (fileError) {
      console.log('Could not read SQL file:', fileError);
    }

    // If we couldn't read the file, use the hardcoded SQL
    if (!sqlContent) {
      console.log('Using hardcoded SQL');
      sqlContent = `
        -- First drop the function if it exists
        DROP FUNCTION IF EXISTS exec_sql(text);

        -- Create a function to execute arbitrary SQL with sql_query parameter
        -- This is used for migrations and fixes
        CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
        RETURNS JSONB AS $$
        DECLARE
          result JSONB;
        BEGIN
          EXECUTE sql_query INTO result;
          RETURN result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE,
            'query', sql_query
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
    }

    // Try multiple approaches to create the function

    // Approach 1: Use the admin client with exec_sql
    try {
      console.log('Trying to create function with admin client and exec_sql');
      const { data, error } = await supabaseAdmin.rpc("exec_sql", { sql_query: sqlContent });

      if (!error) {
        console.log('Function created successfully with admin client and exec_sql');
        return NextResponse.json(
          { success: true, message: "exec_sql function created successfully with admin client" },
          { status: 200 }
        );
      } else {
        console.log('Error creating function with admin client:', error);
      }
    } catch (adminError) {
      console.log('Exception creating function with admin client:', adminError);
    }

    // Approach 2: Use the regular client with exec_sql
    try {
      console.log('Trying to create function with regular client and exec_sql');
      const { data, error } = await supabase.rpc("exec_sql", { sql_query: sqlContent });

      if (!error) {
        console.log('Function created successfully with regular client and exec_sql');
        return NextResponse.json(
          { success: true, message: "exec_sql function created successfully with regular client" },
          { status: 200 }
        );
      } else {
        console.log('Error creating function with regular client:', error);
      }
    } catch (regularError) {
      console.log('Exception creating function with regular client:', regularError);
    }

    // Approach 3: Use a temporary table
    try {
      console.log('Trying to create function with temporary table');

      // Create a temporary table if it doesn't exist
      try {
        await supabaseAdmin.from('_temp_migrations').select('id').limit(1);
      } catch {
        // Table doesn't exist, create it
        await supabaseAdmin.rpc("exec_sql", {
          sql_query: `
            CREATE TABLE IF NOT EXISTS _temp_migrations (
              id SERIAL PRIMARY KEY,
              name TEXT,
              sql TEXT,
              executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });
      }

      // Insert the SQL into the temporary table
      const { error: insertError } = await supabaseAdmin.from('_temp_migrations').insert({
        name: 'create_exec_sql_function',
        sql: sqlContent
      });

      if (!insertError) {
        console.log('SQL inserted into temporary table');

        // Try to execute the SQL from the temporary table
        const { error: execError } = await supabaseAdmin.rpc("exec_sql", {
          sql_query: `SELECT sql FROM _temp_migrations WHERE name = 'create_exec_sql_function' ORDER BY id DESC LIMIT 1;`
        });

        if (!execError) {
          console.log('Function created successfully with temporary table');
          return NextResponse.json(
            { success: true, message: "exec_sql function created successfully with temporary table" },
            { status: 200 }
          );
        } else {
          console.log('Error executing SQL from temporary table:', execError);
        }
      } else {
        console.log('Error inserting SQL into temporary table:', insertError);
      }
    } catch (tempError) {
      console.log('Exception creating function with temporary table:', tempError);
    }

    // If all approaches failed, return the SQL for manual execution
    console.log('All automatic approaches failed, returning SQL for manual execution');
    return NextResponse.json(
      {
        success: false,
        message: "Could not automatically create exec_sql function. Please run the following SQL in the Supabase SQL editor:",
        sql: sqlContent
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating exec_sql function:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create exec_sql function: ${error instanceof Error ? error.message : String(error)}`,
        message: "An error occurred while trying to create the exec_sql function"
      },
      { status: 500 }
    );
  }
}
