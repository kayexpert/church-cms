import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/update-wigal-url
 * Update the Wigal SMS provider URL to the correct one
 */
export async function POST() {
  try {
    console.log('Update Wigal URL endpoint called');

    // Create a Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find all Wigal SMS providers
    const { data: wigalProviders, error: findError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .or('provider_name.ilike.%wigal%,base_url.ilike.%wigal.com.gh%');

    if (findError) {
      console.error('Error finding Wigal providers:', findError);
      return NextResponse.json({
        success: false,
        error: 'Failed to find Wigal providers',
        details: findError.message
      }, { status: 500 });
    }

    if (!wigalProviders || wigalProviders.length === 0) {
      console.log('No Wigal providers found');
      return NextResponse.json({
        success: true,
        message: 'No Wigal providers found to update'
      });
    }

    console.log(`Found ${wigalProviders.length} Wigal providers to update`);

    // Update each Wigal provider with the correct URL
    const updateResults = [];
    for (const provider of wigalProviders) {
      console.log(`Updating provider ${provider.id} (${provider.provider_name})`);

      // Log the current provider details
      console.log(`Current provider details for ${provider.id}:`, {
        provider_name: provider.provider_name,
        base_url: provider.base_url,
        is_default: provider.is_default
      });

      // Prepare the update data
      const updateData: any = {
        base_url: 'https://frogapi.wigal.com.gh'
      };

      // If the auth_type is not set, set it to api_key
      if (!provider.auth_type) {
        updateData.auth_type = 'api_key';
      }

      // Update the provider
      const { data: updatedProvider, error: updateError } = await supabaseAdmin
        .from('messaging_configurations')
        .update(updateData)
        .eq('id', provider.id)
        .select()
        .single();

      if (updateError) {
        console.error(`Error updating provider ${provider.id}:`, updateError);
        updateResults.push({
          id: provider.id,
          success: false,
          error: updateError.message
        });
      } else {
        console.log(`Successfully updated provider ${provider.id}`);
        updateResults.push({
          id: provider.id,
          success: true,
          provider: updatedProvider
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updateResults.filter(r => r.success).length} of ${wigalProviders.length} Wigal providers`,
      results: updateResults
    });
  } catch (error) {
    console.error('Error in update-wigal-url endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update Wigal URL',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
