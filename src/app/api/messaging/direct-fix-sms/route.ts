import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/direct-fix-sms
 * Direct approach to fix SMS configuration issues by executing SQL directly
 */
export async function POST() {
  try {
    console.log('Direct fix SMS endpoint called');

    // Create a Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Execute the SQL script directly
    const sql = `
    -- Create the messaging_configurations table if it doesn't exist
    CREATE TABLE IF NOT EXISTS messaging_configurations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_name TEXT NOT NULL,
      api_key TEXT,
      api_secret TEXT,
      base_url TEXT,
      auth_type TEXT,
      sender_id TEXT,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Disable RLS temporarily to allow setup
    ALTER TABLE messaging_configurations DISABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow authenticated users to read messaging_configurations" ON messaging_configurations;
    DROP POLICY IF EXISTS "Allow authenticated users to insert messaging_configurations" ON messaging_configurations;
    DROP POLICY IF EXISTS "Allow authenticated users to update messaging_configurations" ON messaging_configurations;
    DROP POLICY IF EXISTS "Allow authenticated users to delete messaging_configurations" ON messaging_configurations;
    DROP POLICY IF EXISTS "Allow service role full access to messaging_configurations" ON messaging_configurations;

    -- Create RLS policies for messaging_configurations
    CREATE POLICY "Allow authenticated users to read messaging_configurations"
      ON messaging_configurations
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "Allow authenticated users to insert messaging_configurations"
      ON messaging_configurations
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY "Allow authenticated users to update messaging_configurations"
      ON messaging_configurations
      FOR UPDATE
      TO authenticated
      USING (true);

    CREATE POLICY "Allow authenticated users to delete messaging_configurations"
      ON messaging_configurations
      FOR DELETE
      TO authenticated
      USING (true);

    CREATE POLICY "Allow service role full access to messaging_configurations"
      ON messaging_configurations
      USING (auth.role() = 'service_role');

    -- Re-enable RLS
    ALTER TABLE messaging_configurations ENABLE ROW LEVEL SECURITY;
    `;

    // Execute the SQL script
    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
      query: sql
    });

    if (sqlError) {
      console.error('Error executing SQL script:', sqlError);

      // Try a different approach - direct SQL execution
      try {
        console.log('Trying direct SQL execution...');

        // Execute the SQL script in smaller chunks
        const sqlCommands = sql.split(';').filter(cmd => cmd.trim().length > 0);

        for (const cmd of sqlCommands) {
          const { error } = await supabaseAdmin.rpc('exec_sql', {
            query: cmd + ';'
          });

          if (error) {
            console.error('Error executing SQL command:', error);
            console.error('Command:', cmd);
          }
        }
      } catch (directError) {
        console.error('Error with direct SQL execution:', directError);
        return NextResponse.json({
          success: false,
          error: 'Failed to execute SQL script',
          details: directError instanceof Error ? directError.message : String(directError)
        }, { status: 500 });
      }
    }

    // Check if there's an existing default SMS provider
    const { data: existingDefault, error: defaultError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (defaultError) {
      console.error('Error checking for default SMS provider:', defaultError);
    }

    // If there's already a default provider, return it
    if (existingDefault) {
      console.log('Found existing default SMS provider:', existingDefault);
      return NextResponse.json({
        success: true,
        message: 'SMS provider already configured',
        config: {
          id: existingDefault.id,
          provider_name: existingDefault.provider_name,
          is_default: existingDefault.is_default
        }
      });
    }

    // Check if there are any SMS providers
    const { data: existingConfigs, error: configsError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (configsError) {
      console.error('Error checking for SMS providers:', configsError);
    }

    // If there are providers but none is default, set the first one as default
    if (existingConfigs && existingConfigs.length > 0) {
      console.log('Found SMS providers but none is default, setting the first one as default');

      const { error: updateError } = await supabaseAdmin
        .from('messaging_configurations')
        .update({ is_default: true })
        .eq('id', existingConfigs[0].id);

      if (updateError) {
        console.error('Error setting default SMS provider:', updateError);
      } else {
        return NextResponse.json({
          success: true,
          message: `Set existing ${existingConfigs[0].provider_name} provider as default`,
          config: {
            id: existingConfigs[0].id,
            provider_name: existingConfigs[0].provider_name,
            is_default: true
          }
        });
      }
    }

    // If no providers exist, return an error
    console.log('No SMS providers found');

    return NextResponse.json({
      success: false,
      error: 'No SMS provider configured',
      errorType: 'no_provider',
      message: 'No SMS provider has been configured. Please set up an SMS provider in the messaging settings.'
    }, { status: 404 });
  } catch (error) {
    console.error('Unexpected error in direct-fix-sms:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
