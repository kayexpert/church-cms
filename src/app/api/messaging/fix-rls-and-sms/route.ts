import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/fix-rls-and-sms
 * Fix RLS policies and SMS provider configuration
 * This is a comprehensive fix that addresses both RLS policy issues and SMS provider configuration
 */
export async function POST() {
  try {
    console.log('Fixing RLS policies and SMS provider configuration');

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

    // Step 1: Check if the messaging_configurations table exists
    console.log('Step 1: Checking if messaging_configurations table exists');

    const { error: tableCheckError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('count(*)', { count: 'exact', head: true });

    // If the table doesn't exist, create it
    if (tableCheckError) {
      console.log('Table does not exist, creating it');

      const { error: createTableError } = await supabaseAdmin.rpc('exec_sql', {
        query: `CREATE TABLE IF NOT EXISTS messaging_configurations (
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
);`
      });

      if (createTableError) {
        console.error('Error creating messaging_configurations table:', createTableError);

        // Try direct SQL execution as a fallback
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
              },
              body: JSON.stringify({
                query: `CREATE TABLE IF NOT EXISTS messaging_configurations (
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
);`
              })
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error creating table with direct SQL:', errorData);
            return NextResponse.json({
              success: false,
              error: 'Failed to create messaging_configurations table',
              details: errorData
            }, { status: 500 });
          }
        } catch (directSqlError) {
          console.error('Error with direct SQL execution:', directSqlError);
          return NextResponse.json({
            success: false,
            error: 'Failed to create messaging_configurations table',
            details: directSqlError instanceof Error ? directSqlError.message : String(directSqlError)
          }, { status: 500 });
        }
      }
    }

    // Step 2: Fix RLS policies
    console.log('Step 2: Fixing RLS policies');

    // Execute each RLS command separately to avoid syntax errors
    console.log('Disabling RLS temporarily');
    const { error: disableRlsError } = await supabaseAdmin.rpc('exec_sql', {
      query: `ALTER TABLE messaging_configurations DISABLE ROW LEVEL SECURITY;`
    });

    if (disableRlsError) {
      console.error('Error disabling RLS:', disableRlsError);
    }

    console.log('Dropping existing policies');
    const { error: dropPoliciesError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        DROP POLICY IF EXISTS "Allow authenticated users to read messaging_configurations" ON messaging_configurations;
        DROP POLICY IF EXISTS "Allow authenticated users to insert messaging_configurations" ON messaging_configurations;
        DROP POLICY IF EXISTS "Allow authenticated users to update messaging_configurations" ON messaging_configurations;
        DROP POLICY IF EXISTS "Allow authenticated users to delete messaging_configurations" ON messaging_configurations;
        DROP POLICY IF EXISTS "Allow service role full access to messaging_configurations" ON messaging_configurations;
      `
    });

    if (dropPoliciesError) {
      console.error('Error dropping policies:', dropPoliciesError);
    }

    console.log('Creating read policy');
    const { error: readPolicyError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE POLICY "Allow authenticated users to read messaging_configurations"
          ON messaging_configurations
          FOR SELECT
          TO authenticated
          USING (true);
      `
    });

    if (readPolicyError) {
      console.error('Error creating read policy:', readPolicyError);
    }

    console.log('Creating insert policy');
    const { error: insertPolicyError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE POLICY "Allow authenticated users to insert messaging_configurations"
          ON messaging_configurations
          FOR INSERT
          TO authenticated
          WITH CHECK (true);
      `
    });

    if (insertPolicyError) {
      console.error('Error creating insert policy:', insertPolicyError);
    }

    console.log('Creating update policy');
    const { error: updatePolicyError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE POLICY "Allow authenticated users to update messaging_configurations"
          ON messaging_configurations
          FOR UPDATE
          TO authenticated
          USING (true);
      `
    });

    if (updatePolicyError) {
      console.error('Error creating update policy:', updatePolicyError);
    }

    console.log('Creating delete policy');
    const { error: deletePolicyError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE POLICY "Allow authenticated users to delete messaging_configurations"
          ON messaging_configurations
          FOR DELETE
          TO authenticated
          USING (true);
      `
    });

    if (deletePolicyError) {
      console.error('Error creating delete policy:', deletePolicyError);
    }

    console.log('Creating service role policy');
    const { error: serviceRolePolicyError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE POLICY "Allow service role full access to messaging_configurations"
          ON messaging_configurations
          USING (auth.role() = 'service_role');
      `
    });

    if (serviceRolePolicyError) {
      console.error('Error creating service role policy:', serviceRolePolicyError);
    }

    console.log('Re-enabling RLS');
    const { error: enableRlsError } = await supabaseAdmin.rpc('exec_sql', {
      query: `ALTER TABLE messaging_configurations ENABLE ROW LEVEL SECURITY;`
    });

    if (enableRlsError) {
      console.error('Error enabling RLS:', enableRlsError);
    }

    // Check if any of the RLS operations failed
    const rlsError = disableRlsError || dropPoliciesError || readPolicyError ||
                    insertPolicyError || updatePolicyError || deletePolicyError ||
                    serviceRolePolicyError || enableRlsError;

    if (rlsError) {
      console.error('Error fixing RLS policies:', rlsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fix RLS policies',
        details: rlsError.message
      }, { status: 500 });
    }

    // Step 3: Check if there's an existing SMS provider configuration
    console.log('Step 3: Checking for existing SMS provider configuration');

    const { data: existingConfigs, error: configsError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (configsError) {
      console.error('Error fetching existing configurations:', configsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch existing configurations',
        details: configsError.message
      }, { status: 500 });
    }

    // Step 4: Create or update SMS provider configuration
    console.log('Step 4: Creating or updating SMS provider configuration');

    // Check if there's a default configuration
    const defaultConfig = existingConfigs?.find(config => config.is_default);

    if (existingConfigs && existingConfigs.length > 0) {
      // If there are configurations but none is default, set the first one as default
      if (!defaultConfig) {
        console.log('Found configurations but none is default, setting the first one as default');

        const { error: updateError } = await supabaseAdmin
          .from('messaging_configurations')
          .update({ is_default: true })
          .eq('id', existingConfigs[0].id);

        if (updateError) {
          console.error('Error setting default configuration:', updateError);
          return NextResponse.json({
            success: false,
            error: 'Failed to set default configuration',
            details: updateError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Set existing ${existingConfigs[0].provider_name} configuration as default`,
          config: {
            id: existingConfigs[0].id,
            provider_name: existingConfigs[0].provider_name,
            is_default: true
          }
        });
      }

      // If there's already a default configuration, return it
      return NextResponse.json({
        success: true,
        message: 'SMS provider already configured',
        config: {
          id: defaultConfig.id,
          provider_name: defaultConfig.provider_name,
          is_default: defaultConfig.is_default
        }
      });
    }

    // If no configurations exist, create a default one
    console.log('No configurations found, creating a default one');

    const { data: newConfig, error: insertError } = await supabaseAdmin
      .from('messaging_configurations')
      .insert({
        provider_name: 'mock',
        api_key: 'mock-api-key',
        sender_id: 'ChurchCMS',
        is_default: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating default configuration:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create default configuration',
        details: insertError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Created default mock SMS provider configuration',
      config: {
        id: newConfig.id,
        provider_name: newConfig.provider_name,
        is_default: newConfig.is_default
      }
    });
  } catch (error) {
    console.error('Unexpected error fixing RLS and SMS configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
