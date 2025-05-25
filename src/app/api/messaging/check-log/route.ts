import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/messaging/check-log
 * Check if a message log exists for a specific message and recipient
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const messageId = url.searchParams.get('message_id');
    const recipientId = url.searchParams.get('recipient_id');

    // Validate required parameters
    if (!messageId) {
      return NextResponse.json({
        success: false,
        error: 'message_id is required'
      }, { status: 400 });
    }

    if (!recipientId) {
      return NextResponse.json({
        success: false,
        error: 'recipient_id is required'
      }, { status: 400 });
    }

    // Check if a log already exists for this message and recipient
    const { data, error, count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact' })
      .eq('message_id', messageId)
      .eq('recipient_id', recipientId);

    if (error) {
      console.error('Error checking message log:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to check message log',
        details: error.message
      }, { status: 500 });
    }

    const exists = count !== null && count > 0;

    return NextResponse.json({
      success: true,
      exists,
      count: count || 0
    });
  } catch (error) {
    console.error('Error in check-log endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check message log',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
