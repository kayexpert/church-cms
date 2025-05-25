import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/messaging/fix-default-provider
 * Fix the default SMS provider configuration
 */
export async function POST() {
  try {
    console.log('Fixing default SMS provider configuration');

    // First, check if the messaging_configurations table exists
    const { error: tableError } = await supabase
      .from('messaging_configurations')
      .select('count(*)', { count: 'exact', head: true });

    if (tableError) {
      console.error('Error checking messaging_configurations table:', tableError);

      // Table doesn't exist, return an error
      console.log('The messaging_configurations table does not exist');

      return NextResponse.json({
        success: false,
        error: 'Table does not exist',
        details: 'The messaging_configurations table does not exist. Please create the table first.',
        needsTableCreation: true
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

    // If there are no configurations, return an error
    if (!allConfigs || allConfigs.length === 0) {
      console.log('No SMS configurations found');

      return NextResponse.json({
        success: false,
        error: 'No SMS provider configured',
        errorType: 'no_provider',
        message: 'No SMS provider has been configured. Please set up an SMS provider in the messaging settings.'
      }, { status: 404 });
    }

    // If there are configurations but none is set as default, set the first one as default
    if (allConfigs.length > 0 && !defaultConfig) {
      console.log('Found configurations but none is set as default, setting the first one as default');

      const firstConfig = allConfigs[0];

      const { error: updateError } = await supabase
        .from('messaging_configurations')
        .update({ is_default: true })
        .eq('id', firstConfig.id);

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
        message: `Set existing ${firstConfig.provider_name} configuration as default`,
        config: {
          id: firstConfig.id,
          provider_name: firstConfig.provider_name,
          is_default: true
        }
      });
    }

    // If there is already a default configuration, return it
    if (defaultConfig) {
      console.log('Default SMS configuration already exists:', defaultConfig.provider_name);

      return NextResponse.json({
        success: true,
        message: 'Default SMS provider already configured',
        config: {
          id: defaultConfig.id,
          provider_name: defaultConfig.provider_name,
          is_default: defaultConfig.is_default
        },
        noChangesNeeded: true
      });
    }

    // This should not happen, but just in case
    return NextResponse.json({
      success: false,
      error: 'Unexpected state',
      details: 'Could not determine SMS configuration status'
    });
  } catch (error) {
    console.error('Error fixing default SMS provider:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix default SMS provider',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
