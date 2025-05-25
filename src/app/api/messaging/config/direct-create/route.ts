import { NextRequest, NextResponse } from 'next/server';
import { messagingConfigSchema } from '@/schemas/messaging-config-schema';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/config/direct-create
 * Create a new SMS provider configuration using direct SQL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = messagingConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const config = validationResult.data;

    // Create a Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not found in environment variables' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, create the tables if they don't exist
    try {
      // Try to establish a connection
      try {
        await supabase.from('_dummy_request_').select('*').limit(1);
      } catch (connectionError) {
        // This is expected to fail, we're just using it to establish a connection
        console.log('Expected connection error:', connectionError);
      }

      // Create the tables using direct SQL with pgcrypto instead of uuid-ossp
      const createTablesSQL = `
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


      `;

      // Execute the SQL directly using the REST API
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({
            sql_query: createTablesSQL
          })
        });

        if (!response.ok) {
          console.error('Error creating tables with exec_sql:', await response.text());

          // Try direct SQL execution as a fallback
          const directResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              query: createTablesSQL
            })
          });

          if (!directResponse.ok) {
            console.error('Error with direct SQL execution:', await directResponse.text());
          } else {
            console.log('Tables created with direct SQL execution');
          }
        } else {
          console.log('Tables created with exec_sql');
        }
      } catch (sqlError) {
        console.error('Error executing SQL:', sqlError);
      }
    } catch (error) {
      console.error('Error creating tables:', error);
      // Continue anyway, as the tables might already exist
    }

    // Now try to create the configuration
    try {
      // If this is set as default, update all other configurations to not be default
      if (config.is_default) {
        try {
          const { error: updateError } = await supabase
            .from('messaging_configurations')
            .update({ is_default: false })
            .eq('is_default', true);

          if (updateError) {
            console.error('Error updating existing default configurations:', updateError);
          }
        } catch (updateError) {
          console.error('Error updating existing default configurations:', updateError);
        }
      }

      // Insert the new configuration
      try {
        const { data, error } = await supabase
          .from('messaging_configurations')
          .insert(config)
          .select()
          .single();

        if (error) {
          console.error('Error creating messaging configuration:', error);

          // Try a direct SQL insertion as a last resort
          try {
            const insertSQL = `
              INSERT INTO messaging_configurations (
                provider_name, api_key, api_secret, base_url, auth_type, is_default
              ) VALUES (
                '${config.provider_name}',
                '${config.api_key || ''}',
                '${config.api_secret || ''}',
                '${config.base_url || ''}',
                '${config.auth_type || ''}',
                ${config.is_default ? 'TRUE' : 'FALSE'}
              ) RETURNING *;
            `;

            const directInsertResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({
                sql_query: insertSQL
              })
            });

            if (!directInsertResponse.ok) {
              console.error('Error with direct SQL insertion:', await directInsertResponse.text());
              return NextResponse.json(
                { error: 'Failed to create messaging configuration', details: error.message },
                { status: 500 }
              );
            }

            // If direct insertion succeeded, return success
            return NextResponse.json({
              data: {
                id: 'direct-insert',
                provider_name: config.provider_name,
                api_key: config.api_key,
                api_secret: config.api_secret,
                base_url: config.base_url,
                auth_type: config.auth_type,
                is_default: config.is_default
              },
              message: 'Configuration created with direct SQL'
            });
          } catch (directInsertError) {
            console.error('Error with direct SQL insertion:', directInsertError);
            return NextResponse.json(
              { error: 'Failed to create messaging configuration', details: error.message },
              { status: 500 }
            );
          }
        }

        return NextResponse.json({ data });
      } catch (insertError) {
        console.error('Error inserting configuration:', insertError);
        return NextResponse.json(
          { error: 'Failed to create messaging configuration', details: insertError instanceof Error ? insertError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error in createMessagingConfiguration:', error);
      return NextResponse.json(
        { error: 'Failed to create messaging configuration', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/messaging/config/direct-create:', error);
    return NextResponse.json(
      {
        error: 'Failed to create messaging configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
