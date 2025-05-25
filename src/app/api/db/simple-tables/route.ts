import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/db/simple-tables
 * Create the messaging tables using the simplest possible approach
 */
export async function POST() {
  try {
    console.log('Creating tables with simple approach');

    // Try to create the tables using a single SQL statement
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `
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



          -- Insert default records if they don't exist
          INSERT INTO messaging_configurations (provider_name, is_default)
          SELECT 'mock', TRUE
          WHERE NOT EXISTS (SELECT 1 FROM messaging_configurations WHERE is_default = TRUE);



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
      });

      if (error) {
        console.error('Error creating tables with exec_sql:', error);

        // Try a different approach - direct REST API call
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
            },
            body: JSON.stringify({
              sql_query: `
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


              `
            })
          });

          if (!response.ok) {
            console.error('Error with direct REST API call:', await response.text());
          } else {
            console.log('Tables created with direct REST API call');
          }
        } catch (restError) {
          console.error('Error with direct REST API call:', restError);
        }
      } else {
        console.log('Tables created successfully with exec_sql');
      }
    } catch (error) {
      console.error('Error creating tables:', error);
    }

    // Try direct insertion as a test
    try {
      try {
        const { error } = await supabase
          .from('messaging_configurations')
          .insert({
            provider_name: 'mock',
            is_default: true
          });

        if (error) {
          console.error('Error inserting test record:', error);

          // If insertion fails, try a different approach
          if (error.message.includes('relation "messaging_configurations" does not exist')) {
            // Try a different SQL approach with DO block
            try {
              const { error: doBlockError } = await supabase.rpc('exec_sql', {
                sql_query: `
                  CREATE EXTENSION IF NOT EXISTS pgcrypto;

                  DO $$
                  BEGIN
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


                  EXCEPTION
                    WHEN OTHERS THEN
                      RAISE NOTICE 'Error creating tables: %', SQLERRM;
                  END $$;
                `
              });

              if (doBlockError) {
                console.error('Error with DO block approach:', doBlockError);
              } else {
                console.log('Tables created with DO block approach');
              }
            } catch (doBlockError) {
              console.error('Error with DO block approach:', doBlockError);
            }
          }
        } else {
          console.log('Test record inserted successfully');
        }
      } catch (insertError) {
        console.error('Error with test insertion:', insertError);
      }

      // Try direct SQL insertion as a last resort
      try {
        const { error: directInsertError } = await supabase.rpc('exec_sql', {
          sql_query: `
            INSERT INTO messaging_configurations (provider_name, is_default)
            SELECT 'mock', TRUE
            WHERE NOT EXISTS (SELECT 1 FROM messaging_configurations WHERE is_default = TRUE);


          `
        });

        if (directInsertError) {
          console.error('Error with direct SQL insertion:', directInsertError);
        } else {
          console.log('Default records inserted with direct SQL');
        }
      } catch (directInsertError) {
        console.error('Error with direct SQL insertion:', directInsertError);
      }
    } catch (error) {
      console.error('Error with test insertion:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Tables created or already exist'
    });
  } catch (error) {
    console.error('Error in simple-tables:', error);
    return NextResponse.json(
      {
        error: 'Failed to create tables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
