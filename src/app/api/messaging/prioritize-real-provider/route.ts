import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/prioritize-real-provider
 * Prioritize Wigal SMS provider over any other providers
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Prioritize real provider endpoint called');

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Step 1: Check if the messaging_configurations table exists
    const { count, error: tableError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*', { count: 'exact', head: true });

    if (tableError) {
      console.error('Error checking messaging_configurations table:', tableError);
      return NextResponse.json({
        success: false,
        error: 'messaging_configurations table does not exist',
        details: tableError.message
      }, { status: 500 });
    }

    // Step 2: Get all SMS configurations
    const { data: allConfigs, error: allConfigsError } = await supabaseAdmin
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

    if (!allConfigs || allConfigs.length === 0) {
      console.log('No SMS configurations found, nothing to prioritize');
      return NextResponse.json({
        success: false,
        error: 'No SMS configurations found',
        message: 'No SMS configurations found to prioritize'
      }, { status: 404 });
    }

    console.log('All SMS configurations:', allConfigs.map(c => ({
      id: c.id,
      provider: c.provider_name,
      isDefault: c.is_default
    })));

    // Step 3: Find the current default provider
    const defaultConfig = allConfigs.find(c => c.is_default);
    console.log('Current default provider:', defaultConfig ? {
      id: defaultConfig.id,
      provider: defaultConfig.provider_name,
      isDefault: defaultConfig.is_default
    } : 'None');

    // Step 4: Find Wigal providers with API keys
    const wigalProviders = allConfigs.filter(c =>
      c.provider_name &&
      c.provider_name.toLowerCase() === 'wigal' &&
      c.api_key // Must have an API key to be considered a valid provider
    );

    console.log('Wigal providers found:', wigalProviders.length);
    console.log('Wigal providers:', wigalProviders.map(c => ({
      id: c.id,
      provider: c.provider_name,
      isDefault: c.is_default
    })));

    // Step 5: If there are Wigal providers and the current default is not Wigal or not set, update it
    if (wigalProviders.length > 0 &&
        (!defaultConfig || defaultConfig.provider_name.toLowerCase() !== 'wigal')) {

      // First, unset any existing default
      if (defaultConfig) {
        console.log(`Unsetting current default provider: ${defaultConfig.provider_name}`);
        const { error: unsetError } = await supabaseAdmin
          .from('messaging_configurations')
          .update({ is_default: false })
          .eq('id', defaultConfig.id);

        if (unsetError) {
          console.error('Error unsetting default provider:', unsetError);
          // Continue anyway, we'll try to set the new default
        }
      }

      // Set the first Wigal provider as default
      const newDefault = wigalProviders[0];
      console.log(`Setting Wigal as default provider: ${newDefault.provider_name}`);

      const { error: setError } = await supabaseAdmin
        .from('messaging_configurations')
        .update({ is_default: true })
        .eq('id', newDefault.id);

      if (setError) {
        console.error('Error setting Wigal as default provider:', setError);
        return NextResponse.json({
          success: false,
          error: 'Failed to set Wigal as default provider',
          details: setError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully set Wigal SMS as the default SMS provider`,
        oldDefault: defaultConfig ? {
          id: defaultConfig.id,
          provider: defaultConfig.provider_name
        } : null,
        newDefault: {
          id: newDefault.id,
          provider: newDefault.provider_name
        }
      });
    }

    // If the current default is already Wigal, no change needed
    if (defaultConfig && defaultConfig.provider_name.toLowerCase() === 'wigal') {
      return NextResponse.json({
        success: true,
        message: `No change needed. Wigal SMS is already the default provider.`,
        currentDefault: {
          id: defaultConfig.id,
          provider: defaultConfig.provider_name
        }
      });
    }

    // If there are no Wigal providers, return a message
    return NextResponse.json({
      success: false,
      error: 'No Wigal SMS provider found',
      message: 'No Wigal SMS provider found to set as default. Please configure Wigal SMS in the settings.',
      currentDefault: defaultConfig ? {
        id: defaultConfig.id,
        provider: defaultConfig.provider_name
      } : null
    }, { status: 404 });
  } catch (error) {
    console.error('Error in prioritize real provider endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
