import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Schema for creating a message
 */
const messageSchema = z.object({
  name: z.string().min(1, "Message name is required"),
  content: z.string().min(1, "Message content is required"),
  type: z.enum(['quick', 'group']).default('quick'), // Only 'quick' and 'group' are allowed in the database
  days_before: z.number().int().min(0).max(30).optional(),
  status: z.enum(['active', 'inactive', 'scheduled', 'pending', 'processing']).default('active'),
  frequency: z.enum(['one-time', 'daily', 'weekly', 'monthly']).default('one-time'), // Only these frequencies are allowed
  schedule_time: z.string().optional(),
  end_date: z.string().optional(),
  recipient_id: z.string().optional(),
  recipient_type: z.enum(['individual', 'group']).optional(),
  group_ids: z.array(z.string()).optional(),
  is_birthday_message: z.boolean().optional(), // Flag to indicate if this is a birthday message
});

/**
 * POST /api/messaging/create-message
 * Create a message directly in the messages table
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Create message endpoint called');

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    // Validate the request body
    try {
      messageSchema.parse(body);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: validationError
      }, { status: 400 });
    }

    // Extract message data
    const {
      name,
      content,
      type = 'quick',
      days_before,
      status = 'active',
      frequency = 'one-time',
      schedule_time = new Date().toISOString(),
      end_date,
      recipient_id,
      recipient_type,
      group_ids
    } = body;

    console.log('Validated message data:', {
      name, content, type, days_before, status,
      frequency, schedule_time, end_date, recipient_id, recipient_type, group_ids
    });

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error',
        details: 'Missing Supabase environment variables'
      }, { status: 500 });
    }

    // Create the message
    console.log('Creating message in messages table');

    const messageData: any = {
      name: body.is_birthday_message ? `[Birthday] ${name}` : name,
      content,
      type, // This will be 'quick' or 'group' based on schema validation
      status,
      frequency,
      schedule_time
    };

    // Add optional fields if they exist
    if (days_before !== undefined) messageData.days_before = days_before;
    if (end_date) messageData.end_date = end_date;
    if (recipient_id) messageData.recipient_id = recipient_id;
    if (recipient_type) messageData.recipient_type = recipient_type;
    if (group_ids && group_ids.length > 0) messageData.group_ids = group_ids;

    // If this is a birthday message, add metadata to payload
    if (body.is_birthday_message) {
      messageData.payload = {
        message_type: 'birthday',
        original_frequency: 'yearly'
      };
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    console.log('Insert result:', { message, messageError });

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create message',
        details: messageError.message
      }, { status: 500 });
    }

    console.log('Message created successfully:', message);

    // Return the created message
    return NextResponse.json({
      success: true,
      message,
      instructions: `${type.charAt(0).toUpperCase() + type.slice(1)} message created successfully.`
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
