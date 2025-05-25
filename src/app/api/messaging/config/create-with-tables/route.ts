import { NextRequest, NextResponse } from 'next/server';
import { messagingConfigSchema } from '@/schemas/messaging-config-schema';
import { supabase } from '@/lib/supabase';
import { MessagingConfiguration } from '@/types/messaging';

/**
 * POST /api/messaging/config/create-with-tables
 * Create the necessary tables and a new SMS provider configuration
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

    // First, try to create the tables
    try {
      // Create messaging_configurations table if it doesn't exist
      try {
        const { error: error1 } = await supabase.rpc('exec_sql', {
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
        });

        if (error1) {
          console.error('Error creating messaging_configurations table:', error1);
        } else {
          console.log('messaging_configurations table created successfully');
        }
      } catch (e) {
        console.error('Error creating messaging_configurations table:', e);
      }

      // Set up RLS policies for messaging_configurations
      try {
        const { error: error2 } = await supabase.rpc('exec_sql', {
          sql_query: `
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
          `
        });

        if (error2) {
          console.error('Error setting up RLS policies:', error2);
        } else {
          console.log('RLS policies set up successfully');
        }
      } catch (e) {
        console.error('Error setting up RLS policies:', e);
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

          // Try a different approach - direct SQL insertion
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

            const { error: sqlError } = await supabase.rpc('exec_sql', {
              sql_query: insertSQL
            });

            if (sqlError) {
              console.error('Error with direct SQL insertion:', sqlError);
              return NextResponse.json(
                { error: 'Failed to create messaging configuration', details: sqlError.message },
                { status: 500 }
              );
            }

            // If we get here, the insertion was successful
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
          } catch (sqlError) {
            console.error('Error with direct SQL insertion:', sqlError);
            return NextResponse.json(
              { error: 'Failed to create messaging configuration', details: sqlError instanceof Error ? sqlError.message : 'Unknown error' },
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
    console.error('Error in POST /api/messaging/config/create-with-tables:', error);
    return NextResponse.json(
      {
        error: 'Failed to create messaging configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
