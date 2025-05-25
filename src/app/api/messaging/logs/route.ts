import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/messaging/logs
 * Create a message log entry
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Create message log endpoint called');

    // Parse request body
    const body = await request.json();
    const {
      message_id,
      recipient_id,
      status = 'sent',
      error_message = null,
      message_id_from_provider = null,
      cost = null,
      segments = null,
      message_type = null,
      delivery_status = null,
      delivery_status_details = null,
      delivered_at = null
    } = body;

    // Validate required fields
    if (!message_id) {
      return NextResponse.json({
        success: false,
        error: 'Message ID is required'
      }, { status: 400 });
    }

    if (!recipient_id) {
      return NextResponse.json({
        success: false,
        error: 'Recipient ID is required'
      }, { status: 400 });
    }

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Try to create the message log with all possible fields
    try {
      const { data: log, error: logError } = await supabaseAdmin
        .from('message_logs')
        .insert({
          message_id,
          recipient_id,
          status,
          error_message,
          message_id_from_provider,
          sent_at: new Date().toISOString(),
          // Add additional fields with null values to prevent column not found errors
          cost: body.cost || null,
          segments: body.segments || null,
          message_type: body.message_type || null,
          delivery_status: body.delivery_status || null,
          delivery_status_details: body.delivery_status_details || null,
          delivered_at: body.delivered_at || null,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (logError) {
        throw logError;
      }

      console.log('Message log created with all fields:', log);
      return NextResponse.json({
        success: true,
        log
      });
    } catch (fullInsertError) {
      console.error('Error creating message log with all fields:', fullInsertError);
      console.log('Trying with minimal fields...');

      // Fall back to minimal fields
      try {
        const { data: minimalLog, error: minimalError } = await supabaseAdmin
          .from('message_logs')
          .insert({
            message_id,
            recipient_id,
            status,
            error_message,
            sent_at: new Date().toISOString()
          })
          .select()
          .single();

        if (minimalError) {
          console.error('Error creating message log with minimal fields:', minimalError);
          return NextResponse.json({
            success: false,
            error: 'Failed to create message log',
            details: minimalError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          log: minimalLog,
          warning: 'Created with minimal fields due to schema limitations'
        });
      } catch (minimalError) {
        console.error('Error creating message log with minimal fields:', minimalError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create message log',
          details: minimalError instanceof Error ? minimalError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // This code is unreachable due to the try/catch block above
    // Keeping it commented for reference
    /*
    if (logError) {
      console.error('Error creating message log:', logError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create message log',
        details: logError.message
      }, { status: 500 });
    }

    console.log('Message log created:', log);

    return NextResponse.json({
      success: true,
      log
    });
    */
  } catch (error) {
    console.error('Error in create message log endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create message log',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/messaging/logs
 * Get message logs with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const messageId = url.searchParams.get('message_id');
    const recipientId = url.searchParams.get('recipient_id');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Build the query
    let query = supabaseAdmin
      .from('message_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (messageId) {
      query = query.eq('message_id', messageId);
    }

    if (recipientId) {
      query = query.eq('recipient_id', recipientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Execute the query
    const { data, error, count } = await query
      .order('sent_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching message logs:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch message logs',
        details: error.message
      }, { status: 500 });
    }

    console.log(`Found ${count || 0} message logs`);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0
      }
    });
  } catch (error) {
    console.error('Error in get message logs endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch message logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
