import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDefaultSMSConfig } from '@/services/sms-service';

/**
 * POST /api/messaging/fix-sms-config
 * Fix SMS provider configuration issues
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Fix SMS config endpoint called');

    // Check if the messaging_configurations table exists
    const { error: tableError } = await supabase
      .from('messaging_configurations')
      .select('count(*)', { count: 'exact', head: true });

    if (tableError) {
      console.error('Error checking messaging_configurations table:', tableError);

      // Create the messaging_configurations table
      try {
        const { error: createTableError } = await supabase.rpc('exec_sql', {
          sql_query: `
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
          `
        });

        if (createTableError) {
          console.error('Error creating messaging_configurations table:', createTableError);
          return NextResponse.json({
            success: false,
            error: 'Failed to create messaging_configurations table',
            details: createTableError.message
          }, { status: 500 });
        }

        console.log('messaging_configurations table created successfully');
      } catch (createError) {
        console.error('Error creating messaging_configurations table:', createError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create messaging_configurations table',
          details: createError instanceof Error ? createError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Check if there's a default SMS provider configuration
    const smsConfig = await getDefaultSMSConfig();

    if (!smsConfig) {
      console.log('No default SMS provider configured, creating one');

      // Check if there are any SMS configurations
      const { data: configs, error: configsError } = await supabase
        .from('messaging_configurations')
        .select('id, provider_name, is_default')
        .order('created_at', { ascending: false });

      if (configsError) {
        console.error('Error checking for SMS configurations:', configsError);
        return NextResponse.json({
          success: false,
          error: 'Failed to check for SMS configurations',
          details: configsError.message
        }, { status: 500 });
      }

      // If there are existing configurations, set the first one as default
      if (configs && configs.length > 0) {
        console.log(`Found ${configs.length} SMS configurations, setting the first one as default`);

        const { error: updateError } = await supabase
          .from('messaging_configurations')
          .update({ is_default: true })
          .eq('id', configs[0].id);

        if (updateError) {
          console.error('Error setting default SMS configuration:', updateError);
          return NextResponse.json({
            success: false,
            error: 'Failed to set default SMS configuration',
            details: updateError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Set existing ${configs[0].provider_name} configuration as default`,
          configId: configs[0].id
        });
      }

      // If no configurations exist, return an error
      console.log('No SMS configurations found');

      return NextResponse.json({
        success: false,
        error: 'No SMS provider configured',
        errorType: 'no_provider',
        message: 'No SMS provider has been configured. Please set up an SMS provider in the messaging settings.'
      }, { status: 404 });
    }

    // If there is a default SMS provider but it's missing required fields
    if (smsConfig && (!(smsConfig as any).api_key || !(smsConfig as any).sender_id)) {
      console.log('Default SMS provider is missing required fields, updating it');

      const updates: any = {};

      if (!(smsConfig as any).api_key) {
        updates.api_key = `${(smsConfig as any).provider_name}-api-key`;
      }

      if (!(smsConfig as any).sender_id) {
        updates.sender_id = 'ChurchCMS';
      }

      const { error: updateError } = await supabase
        .from('messaging_configurations')
        .update(updates)
        .eq('id', (smsConfig as any).id);

      if (updateError) {
        console.error('Error updating SMS configuration:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update SMS configuration',
          details: updateError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Updated SMS provider configuration with required fields',
        updates
      });
    }

    // If everything is already configured correctly
    return NextResponse.json({
      success: true,
      message: 'SMS provider is already properly configured',
      config: {
        provider_name: (smsConfig as any).provider_name,
        sender_id: (smsConfig as any).sender_id,
        has_api_key: !!(smsConfig as any).api_key,
        is_default: (smsConfig as any).is_default
      }
    });
  } catch (error) {
    console.error('Error in fix SMS config endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix SMS configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
