import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/messaging/normalize-sms-config
 * Normalize SMS provider configuration to ensure compatibility
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Normalize SMS config endpoint called');

    // Check if the messaging_configurations table exists
    const { error: tableError } = await supabase
      .from('messaging_configurations')
      .select('count(*)', { count: 'exact', head: true });

    if (tableError) {
      console.error('Error checking messaging_configurations table:', tableError);
      return NextResponse.json({
        success: false,
        error: 'messaging_configurations table does not exist',
        details: tableError.message
      }, { status: 500 });
    }

    // Get all SMS configurations
    const { data: configs, error: configsError } = await supabase
      .from('messaging_configurations')
      .select('*');

    if (configsError) {
      console.error('Error fetching SMS configurations:', configsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch SMS configurations',
        details: configsError.message
      }, { status: 500 });
    }

    if (!configs || configs.length === 0) {
      console.log('No SMS configurations found');
      return NextResponse.json({
        success: false,
        error: 'No SMS configurations found',
        message: 'Please create an SMS configuration first'
      });
    }

    console.log(`Found ${configs.length} SMS configurations`);

    // Track changes made
    const changes = [];

    // Process each configuration
    for (const config of configs) {
      const updates: Record<string, any> = {};
      let needsUpdate = false;

      // Normalize provider_name to lowercase
      if (config.provider_name) {
        const normalizedName = config.provider_name.toLowerCase();
        if (normalizedName !== config.provider_name) {
          updates.provider_name = normalizedName;
          needsUpdate = true;
          changes.push(`Normalized provider_name for ${config.id}: ${config.provider_name} -> ${normalizedName}`);
        }
      }

      // Ensure there's a sender_id
      if (!config.sender_id) {
        updates.sender_id = 'ChurchCMS';
        needsUpdate = true;
        changes.push(`Added default sender_id for ${config.id}`);
      }

      // Ensure there's an API key (if missing)
      if (!config.api_key) {
        updates.api_key = `${config.provider_name || 'default'}-api-key`;
        needsUpdate = true;
        changes.push(`Added placeholder API key for ${config.id}`);
      }

      // Update the configuration if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('messaging_configurations')
          .update(updates)
          .eq('id', config.id);

        if (updateError) {
          console.error(`Error updating configuration ${config.id}:`, updateError);
          changes.push(`Failed to update ${config.id}: ${updateError.message}`);
        } else {
          console.log(`Updated configuration ${config.id}`);
        }
      }
    }

    // Ensure there's a default configuration
    const { data: defaultConfig, error: defaultConfigError } = await supabase
      .from('messaging_configurations')
      .select('id')
      .eq('is_default', true)
      .single();

    if (defaultConfigError || !defaultConfig) {
      console.log('No default SMS configuration found, setting the first one as default');
      
      const { error: setDefaultError } = await supabase
        .from('messaging_configurations')
        .update({ is_default: true })
        .eq('id', configs[0].id);

      if (setDefaultError) {
        console.error('Error setting default configuration:', setDefaultError);
        changes.push(`Failed to set default configuration: ${setDefaultError.message}`);
      } else {
        console.log(`Set ${configs[0].id} as the default configuration`);
        changes.push(`Set ${configs[0].id} as the default configuration`);
      }
    }

    // Get the updated configurations
    const { data: updatedConfigs, error: updatedConfigsError } = await supabase
      .from('messaging_configurations')
      .select('id, provider_name, sender_id, is_default, api_key')
      .order('is_default', { ascending: false });

    if (updatedConfigsError) {
      console.error('Error fetching updated configurations:', updatedConfigsError);
    }

    return NextResponse.json({
      success: true,
      message: 'SMS configurations normalized',
      changes,
      configurations: updatedConfigs?.map(c => ({
        id: c.id,
        provider_name: c.provider_name,
        sender_id: c.sender_id,
        is_default: c.is_default,
        has_api_key: !!c.api_key
      }))
    });
  } catch (error) {
    console.error('Error in normalize SMS config endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to normalize SMS configurations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
