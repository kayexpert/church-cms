import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/messaging/check-default-provider
 * Check if a default SMS provider is configured and return detailed information
 */
export async function GET() {
  try {
    console.log('Checking default SMS provider configuration');

    // First, check if the messaging_configurations table exists
    const { error: tableError } = await supabase
      .from('messaging_configurations')
      .select('count(*)', { count: 'exact', head: true });

    if (tableError) {
      console.error('Error checking messaging_configurations table:', tableError);

      // Instead of returning an error, return a more helpful response
      return NextResponse.json({
        success: false,
        error: 'No SMS provider configured',
        details: 'The messaging_configurations table does not exist or cannot be accessed',
        needsSetup: true
      });
    }

    // Get all SMS configurations
    const { data: allConfigs, error: allConfigsError } = await supabase
      .from('messaging_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (allConfigsError) {
      console.error('Error fetching all SMS configurations:', allConfigsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch SMS configurations',
        details: allConfigsError.message
      }, { status: 500 });
    }

    // Get the default SMS configuration
    const { data: defaultConfig, error: defaultConfigError } = await supabase
      .from('messaging_configurations')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (defaultConfigError) {
      console.error('Error fetching default SMS configuration:', defaultConfigError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch default SMS configuration',
        details: defaultConfigError.message
      }, { status: 500 });
    }

    // Check if there are any configurations but none is set as default
    if (allConfigs && allConfigs.length > 0 && !defaultConfig) {
      console.log('Found configurations but none is set as default');

      // Get the first configuration
      const firstConfig = allConfigs[0];

      return NextResponse.json({
        success: false,
        error: 'No default SMS provider configured',
        details: 'There are SMS configurations but none is set as default',
        availableConfigs: allConfigs.length,
        firstConfig: {
          id: firstConfig.id,
          provider_name: firstConfig.provider_name,
          is_default: firstConfig.is_default
        },
        allConfigs: allConfigs.map(c => ({
          id: c.id,
          provider_name: c.provider_name,
          is_default: c.is_default
        }))
      });
    }

    // If there are no configurations
    if (!allConfigs || allConfigs.length === 0) {
      console.log('No SMS configurations found');
      return NextResponse.json({
        success: false,
        error: 'No SMS configurations found',
        details: 'Please create an SMS configuration first'
      });
    }

    // If there is a default configuration
    if (defaultConfig) {
      console.log('Found default SMS configuration:', defaultConfig.provider_name);

      // Sanitize the configuration to remove sensitive data
      const sanitizedConfig = {
        id: defaultConfig.id,
        provider_name: defaultConfig.provider_name,
        base_url: defaultConfig.base_url,
        auth_type: defaultConfig.auth_type,
        sender_id: defaultConfig.sender_id,
        has_api_key: !!defaultConfig.api_key,
        has_api_secret: !!defaultConfig.api_secret,
        is_default: defaultConfig.is_default,
        created_at: defaultConfig.created_at,
        updated_at: defaultConfig.updated_at
      };

      return NextResponse.json({
        success: true,
        message: 'Default SMS provider configured',
        config: sanitizedConfig,
        totalConfigs: allConfigs.length
      });
    }

    // This should not happen, but just in case
    return NextResponse.json({
      success: false,
      error: 'Unexpected state',
      details: 'Could not determine SMS configuration status'
    });
  } catch (error) {
    console.error('Error checking default SMS provider:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check default SMS provider',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
