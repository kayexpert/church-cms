import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/cron/cleanup-stuck-messages
 * Clean up messages that are stuck in processing state
 * This endpoint is protected by a secret key to prevent unauthorized access
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Cleanup stuck messages endpoint called');

    // Verify the request is authorized
    // For Vercel cron jobs, check for authorization header first, then fall back to query parameter
    let token = '';

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fall back to query parameter for Vercel cron jobs
      const url = new URL(request.url);
      token = url.searchParams.get('token') || '';
    }

    if (!token || token !== process.env.CRON_SECRET_KEY) {
      console.error('Invalid or missing token for cleanup-stuck-messages');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and calculate 1 hour ago
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    console.log(`Cleaning up stuck messages at ${now.toISOString()}`);
    console.log(`Looking for messages stuck since ${oneHourAgo.toISOString()}`);

    // Find messages that have been in 'processing' state for more than 1 hour
    const { data: stuckMessages, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('status', 'processing')
      .lt('updated_at', oneHourAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching stuck messages:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stuck messages',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!stuckMessages || stuckMessages.length === 0) {
      console.log('No stuck messages found');
      return NextResponse.json({
        success: true,
        message: 'No stuck messages found',
        cleaned: 0
      });
    }

    console.log(`Found ${stuckMessages.length} stuck messages to clean up`);

    // Update stuck messages to error status
    const { data: updatedMessages, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        status: 'error',
        error_message: 'Message processing timed out - automatically reset by cleanup job',
        updated_at: now.toISOString()
      })
      .eq('status', 'processing')
      .lt('updated_at', oneHourAgo.toISOString())
      .select();

    if (updateError) {
      console.error('Error updating stuck messages:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update stuck messages',
        details: updateError.message
      }, { status: 500 });
    }

    const cleanedCount = updatedMessages?.length || 0;
    console.log(`Successfully cleaned up ${cleanedCount} stuck messages`);

    // Also clean up any message logs that might be stuck in processing
    const { data: stuckLogs, error: logsUpdateError } = await supabaseAdmin
      .from('message_logs')
      .update({
        status: 'failed',
        error_message: 'Message log processing timed out - automatically reset by cleanup job',
        updated_at: now.toISOString()
      })
      .eq('status', 'processing')
      .lt('updated_at', oneHourAgo.toISOString())
      .select();

    const cleanedLogsCount = stuckLogs?.length || 0;
    if (cleanedLogsCount > 0) {
      console.log(`Also cleaned up ${cleanedLogsCount} stuck message logs`);
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      cleaned: cleanedCount,
      cleanedLogs: cleanedLogsCount,
      details: {
        stuckMessages: stuckMessages.map(msg => ({
          id: msg.id,
          name: msg.name,
          type: msg.type,
          stuckSince: msg.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('Error in cleanup stuck messages endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup stuck messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/cleanup-stuck-messages
 * Get information about stuck messages without cleaning them up
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || '';

    if (!token || token !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and calculate 1 hour ago
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find messages that have been in 'processing' state for more than 1 hour
    const { data: stuckMessages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('status', 'processing')
      .lt('updated_at', oneHourAgo.toISOString());

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stuck messages',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stuckCount: stuckMessages?.length || 0,
      stuckMessages: stuckMessages?.map(msg => ({
        id: msg.id,
        name: msg.name,
        type: msg.type,
        status: msg.status,
        stuckSince: msg.updated_at,
        scheduleTime: msg.schedule_time
      })) || []
    });
  } catch (error) {
    console.error('Error in get stuck messages endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get stuck messages info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
