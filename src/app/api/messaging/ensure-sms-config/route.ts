import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/ensure-sms-config
 * Ensure a default SMS configuration exists
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Ensure SMS config endpoint called');

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Step 1: Check if a default Wigal configuration already exists
    console.log('Checking for existing default Wigal SMS configuration');
    const { data: existingConfig, error: configError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .eq('provider_name', 'wigal')
      .eq('is_default', true)
      .single();

    if (!configError && existingConfig) {
      console.log('Default SMS configuration already exists:', existingConfig.id);
      return NextResponse.json({
        success: true,
        message: 'Default SMS configuration already exists',
        config: {
          id: existingConfig.id,
          provider_name: existingConfig.provider_name,
          sender_id: existingConfig.sender_id,
          is_default: existingConfig.is_default
        }
      });
    }

    // Step 2: Check if any Wigal configuration exists
    console.log('No default Wigal configuration found, checking for any Wigal configuration');
    const { data: configs, error: allConfigsError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .eq('provider_name', 'wigal')
      .order('created_at', { ascending: false });

    if (!allConfigsError && configs && configs.length > 0) {
      // Set the most recent configuration as default
      const mostRecentConfig = configs[0];
      console.log('Setting most recent configuration as default:', mostRecentConfig.id);

      const { data: updatedConfig, error: updateError } = await supabaseAdmin
        .from('messaging_configurations')
        .update({ is_default: true })
        .eq('id', mostRecentConfig.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating configuration:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update configuration',
          details: updateError.message
        }, { status: 500 });
      }

      console.log('Configuration updated successfully:', updatedConfig);
      return NextResponse.json({
        success: true,
        message: 'Existing configuration set as default',
        config: {
          id: updatedConfig.id,
          provider_name: updatedConfig.provider_name,
          sender_id: updatedConfig.sender_id,
          is_default: updatedConfig.is_default
        }
      });
    }

    // Step 3: No configurations found, return an error
    console.log('No SMS configurations found');

    // Check if the messaging_configurations table exists
    try {
      const { count, error: countError } = await supabaseAdmin
        .from('messaging_configurations')
        .select('*', { count: 'exact', head: true });

      if (countError && countError.message.includes('does not exist')) {
        console.log('messaging_configurations table does not exist, creating it');

        // Create the table
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS messaging_configurations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
        `;

        // Execute the SQL
        const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
          query: createTableSQL
        });

        if (createError) {
          console.error('Error creating table:', createError);

          // Try with sql_query parameter
          const { error: retryError } = await supabaseAdmin.rpc('exec_sql', {
            sql_query: createTableSQL
          });

          if (retryError) {
            console.error('Error creating table (retry):', retryError);
            return NextResponse.json({
              success: false,
              error: 'Failed to create messaging_configurations table',
              details: retryError.message
            }, { status: 500 });
          }
        }
      }
    } catch (tableError) {
      console.error('Error checking/creating table:', tableError);
      // Continue anyway, the table might exist
    }

    // Return an error indicating no Wigal SMS provider is configured
    return NextResponse.json({
      success: false,
      error: 'No Wigal SMS provider configured',
      errorType: 'no_provider',
      message: 'No Wigal SMS provider has been configured. Please set up Wigal SMS in the messaging settings.'
    }, { status: 404 });
  } catch (error) {
    console.error('Error in ensure SMS config endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to ensure SMS configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
