import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/check-stuck-messages
 * Check for messages that are stuck in 'processing' state and fix them
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Check stuck messages endpoint called');

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time
    const now = new Date();

    // Calculate a time threshold (10 minutes ago)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Find messages that are stuck in 'processing' state
    const { data: stuckMessages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo.toISOString())
      .limit(10);

    if (error) {
      console.error('Error fetching stuck messages:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stuck messages',
        details: error.message
      }, { status: 500 });
    }

    if (!stuckMessages || stuckMessages.length === 0) {
      console.log('No stuck messages found');
      return NextResponse.json({
        success: true,
        message: 'No stuck messages found',
        fixed: 0
      });
    }

    console.log(`Found ${stuckMessages.length} stuck messages`);

    // Fix each stuck message
    const results = [];
    let fixedCount = 0;

    for (const message of stuckMessages) {
      try {
        console.log(`Fixing stuck message: ${message.name} (${message.id})`);

        // Determine the appropriate status based on message frequency
        let newStatus = 'scheduled';

        if (message.frequency === 'one-time') {
          // For one-time messages, check if they've been sent
          const { data: logs, error: logsError } = await supabaseAdmin
            .from('message_logs')
            .select('*')
            .eq('message_id', message.id)
            .eq('status', 'sent')
            .limit(1);

          if (logsError) {
            console.error(`Error checking logs for message ${message.id}:`, logsError);
          }

          // If the message has been sent, mark it as completed
          if (logs && logs.length > 0) {
            newStatus = 'completed';
          }
        }

        // Update the message status
        const { error: updateError } = await supabaseAdmin
          .from('messages')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error(`Error fixing message ${message.id}:`, updateError);
          results.push({
            messageId: message.id,
            status: 'failed',
            error: updateError.message
          });
        } else {
          console.log(`Successfully fixed message ${message.id}`);
          results.push({
            messageId: message.id,
            status: 'fixed',
            newStatus
          });
          fixedCount++;
        }
      } catch (error) {
        console.error(`Error fixing message ${message.id}:`, error);
        results.push({
          messageId: message.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      fixed: fixedCount,
      total: stuckMessages.length,
      results
    });
  } catch (error) {
    console.error('Error in check stuck messages endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check stuck messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
