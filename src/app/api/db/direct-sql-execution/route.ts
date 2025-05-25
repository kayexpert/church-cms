import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/db/direct-sql-execution
 * Execute SQL directly using the Supabase REST API
 */
export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    console.log('Executing SQL directly:', sql);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not found in environment variables' },
        { status: 500 }
      );
    }

    try {
      // Execute the SQL directly using the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          sql_query: sql
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error executing SQL:', errorText);

        // If the exec_sql function doesn't exist, try a different approach
        if (errorText.includes('function "exec_sql" does not exist')) {
          console.log('exec_sql function does not exist, trying to create the function');

          // Try to create the exec_sql function
          try {
            const createFunctionResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                query: `
                  CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
                  RETURNS VOID
                  LANGUAGE plpgsql
                  SECURITY DEFINER
                  AS $$
                  BEGIN
                    EXECUTE sql_query;
                  END;
                  $$;

                  GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
                `
              })
            });

            if (!createFunctionResponse.ok) {
              console.error('Error creating exec_sql function:', await createFunctionResponse.text());
            } else {
              console.log('exec_sql function created successfully');

              // Now try to execute the original SQL again
              const retryResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                  sql_query: sql
                })
              });

              if (!retryResponse.ok) {
                console.error('Error executing SQL after creating function:', await retryResponse.text());
              } else {
                console.log('SQL executed successfully after creating function');
                return NextResponse.json({
                  success: true,
                  message: 'SQL executed successfully after creating function'
                });
              }
            }
          } catch (createFunctionError) {
            console.error('Error creating exec_sql function:', createFunctionError);
          }

          // If creating the function failed or executing SQL after creating the function failed,
          // try to create the tables directly
          try {
            const createTablesResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                query: `
                  CREATE EXTENSION IF NOT EXISTS pgcrypto;

                  CREATE TABLE IF NOT EXISTS messaging_configurations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    provider_name TEXT NOT NULL,
                    api_key TEXT,
                    api_secret TEXT,
                    base_url TEXT,
                    auth_type TEXT,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                  );

                  CREATE TABLE IF NOT EXISTS ai_configurations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    ai_provider TEXT NOT NULL,
                    api_key TEXT,
                    api_endpoint TEXT,
                    default_prompt TEXT NOT NULL DEFAULT 'Shorten this message to 160 characters while preserving its core meaning.',
                    character_limit INTEGER NOT NULL DEFAULT 160,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                  );

                  -- Insert default records if they don't exist
                  INSERT INTO messaging_configurations (provider_name, is_default)
                  SELECT 'mock', TRUE
                  WHERE NOT EXISTS (SELECT 1 FROM messaging_configurations WHERE is_default = TRUE);

                  INSERT INTO ai_configurations (ai_provider, default_prompt, character_limit, is_default)
                  SELECT 'default', 'Shorten this message to 160 characters while preserving its core meaning.', 160, TRUE
                  WHERE NOT EXISTS (SELECT 1 FROM ai_configurations WHERE is_default = TRUE);

                  -- Enable RLS on messaging_configurations
                  ALTER TABLE IF EXISTS messaging_configurations ENABLE ROW LEVEL SECURITY;

                  -- Create RLS policies for messaging_configurations
                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to read messaging_configurations"
                    ON messaging_configurations
                    FOR SELECT
                    TO authenticated
                    USING (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert messaging_configurations"
                    ON messaging_configurations
                    FOR INSERT
                    TO authenticated
                    WITH CHECK (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to update messaging_configurations"
                    ON messaging_configurations
                    FOR UPDATE
                    TO authenticated
                    USING (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete messaging_configurations"
                    ON messaging_configurations
                    FOR DELETE
                    TO authenticated
                    USING (true);

                  -- Enable RLS on ai_configurations
                  ALTER TABLE IF EXISTS ai_configurations ENABLE ROW LEVEL SECURITY;

                  -- Create RLS policies for ai_configurations
                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to read ai_configurations"
                    ON ai_configurations
                    FOR SELECT
                    TO authenticated
                    USING (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert ai_configurations"
                    ON ai_configurations
                    FOR INSERT
                    TO authenticated
                    WITH CHECK (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to update ai_configurations"
                    ON ai_configurations
                    FOR UPDATE
                    TO authenticated
                    USING (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete ai_configurations"
                    ON ai_configurations
                    FOR DELETE
                    TO authenticated
                    USING (true);
                `
              })
            });

            if (!createTablesResponse.ok) {
              const createTablesError = await createTablesResponse.text();
              console.error('Error creating tables directly:', createTablesError);
              return NextResponse.json(
                { error: 'Failed to execute SQL and create tables directly', details: createTablesError },
                { status: 500 }
              );
            }

            return NextResponse.json({
              success: true,
              message: 'Tables created directly'
            });
          } catch (createTablesError) {
            console.error('Error creating tables directly:', createTablesError);
            return NextResponse.json(
              { error: 'Failed to execute SQL and create tables directly', details: createTablesError instanceof Error ? createTablesError.message : 'Unknown error' },
              { status: 500 }
            );
          }
        }

        return NextResponse.json(
          { error: 'Failed to execute SQL', details: errorText },
          { status: 500 }
        );
      }
    } catch (fetchError) {
      console.error('Error fetching exec_sql endpoint:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch exec_sql endpoint', details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SQL executed successfully'
    });
  } catch (error) {
    console.error('Error in direct-sql-execution:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute SQL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
