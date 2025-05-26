import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/messaging/messages
 * Get all messages for status monitoring
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching messages for status monitoring...');

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing Supabase configuration' 
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get query parameters for filtering
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Build query
    let query = supabaseAdmin
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters if provided
    if (type) {
      if (type === 'birthday') {
        // Handle birthday messages (stored as group type with special name)
        query = query.or('type.eq.birthday,and(type.eq.group,name.ilike.[Birthday]%)');
      } else {
        query = query.eq('type', type);
      }
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch messages',
        details: error.message
      }, { status: 500 });
    }

    // Process messages to normalize birthday message types
    const processedMessages = messages?.map(message => ({
      ...message,
      // Normalize birthday messages
      type: message.name?.startsWith('[Birthday]') ? 'birthday' : message.type,
      // Add computed fields
      is_birthday: message.name?.startsWith('[Birthday]') || message.type === 'birthday',
      is_scheduled: message.status === 'scheduled' || (message.status === 'active' && new Date(message.schedule_time) > new Date()),
      is_overdue: message.status === 'active' && new Date(message.schedule_time) < new Date()
    })) || [];

    console.log(`Found ${processedMessages.length} messages`);

    return NextResponse.json({
      success: true,
      messages: processedMessages,
      count: processedMessages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in messages endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/messaging/messages
 * Create a new message (for testing purposes)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new message...');

    const body = await request.json();
    
    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing Supabase configuration' 
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate required fields
    if (!body.name || !body.content || !body.type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, content, type'
      }, { status: 400 });
    }

    // Set defaults
    const messageData = {
      name: body.name,
      content: body.content,
      type: body.type,
      frequency: body.frequency || 'one-time',
      schedule_time: body.schedule_time || new Date().toISOString(),
      status: body.status || 'active',
      days_before: body.days_before || 0,
      end_date: body.end_date || null
    };

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create message',
        details: error.message
      }, { status: 500 });
    }

    console.log('Message created successfully:', message.id);

    return NextResponse.json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in create message endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
