import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/messaging/get-default-sms-config-admin
 * Get the default SMS configuration using admin privileges to bypass RLS
 * This endpoint is used by the getDefaultSMSConfig function in sms-service.ts
 */
export async function GET() {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    console.log(`[${requestId}] Admin endpoint for getting default SMS configuration called`);

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

    // First, check if the messaging_configurations table exists
    const { count, error: tableError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*', { count: 'exact', head: true });

    if (tableError) {
      console.error(`[${requestId}] Error checking messaging_configurations table:`, tableError);

      // Check if the error is related to missing tables
      if (tableError.message.includes('relation') || tableError.message.includes('does not exist')) {
        console.error(`[${requestId}] The messaging_configurations table does not exist.`);

        return NextResponse.json({
          success: false,
          error: 'The messaging_configurations table does not exist',
          details: tableError.message,
          requestId
        }, { status: 404 });
      }

      return NextResponse.json({
        success: false,
        error: 'Error checking messaging_configurations table',
        details: tableError.message,
        requestId
      }, { status: 500 });
    }

    console.log(`[${requestId}] Found ${count} SMS configurations in total`);

    // Get all configurations to check if any exist but none is default
    const { data: allConfigs, error: allConfigsError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('id, provider_name, is_default')
      .order('created_at', { ascending: false });

    if (allConfigsError) {
      console.error(`[${requestId}] Error fetching all SMS configurations:`, allConfigsError);
      return NextResponse.json({
        success: false,
        error: 'Error fetching all SMS configurations',
        details: allConfigsError.message,
        requestId
      }, { status: 500 });
    }

    // Now get the default configuration
    const { data, error } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      console.error(`[${requestId}] Error getting default SMS configuration:`, error);
      return NextResponse.json({
        success: false,
        error: 'Error getting default SMS configuration',
        details: error.message,
        requestId
      }, { status: 500 });
    }

    if (!data) {
      console.warn(`[${requestId}] No default SMS configuration found`);

      // If there are configurations but none is default, set the first one as default
      if (allConfigs && allConfigs.length > 0) {
        console.log(`[${requestId}] Found ${allConfigs.length} SMS configurations but none is default, setting the first one as default`);

        const { error: updateError } = await supabaseAdmin
          .from('messaging_configurations')
          .update({ is_default: true })
          .eq('id', allConfigs[0].id);

        if (updateError) {
          console.error(`[${requestId}] Error setting default SMS configuration:`, updateError);
          return NextResponse.json({
            success: false,
            error: 'Error setting default SMS configuration',
            details: updateError.message,
            requestId
          }, { status: 500 });
        }

        // Get the updated configuration
        const { data: updatedConfig, error: fetchError } = await supabaseAdmin
          .from('messaging_configurations')
          .select('*')
          .eq('id', allConfigs[0].id)
          .single();

        if (fetchError) {
          console.error(`[${requestId}] Error fetching updated SMS configuration:`, fetchError);
          return NextResponse.json({
            success: false,
            error: 'Error fetching updated SMS configuration',
            details: fetchError.message,
            requestId
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Set existing configuration as default',
          config: updatedConfig,
          requestId
        });
      }

      return NextResponse.json({
        success: false,
        error: 'No SMS configurations found',
        requestId
      }, { status: 404 });
    }

    // Return the default configuration
    return NextResponse.json({
      success: true,
      config: data,
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in get-default-sms-config-admin:`, error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error),
      requestId
    }, { status: 500 });
  }
}
