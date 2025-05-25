import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Schema for creating a birthday message
 */
const birthdayMessageSchema = z.object({
  name: z.string().min(1, "Message name is required"),
  content: z.string().min(1, "Message content is required"),
  type: z.literal('birthday'),
  days_before: z.number().int().min(0).max(30).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  frequency: z.enum(['yearly', 'monthly', 'one-time']).default('yearly'),
  schedule_time: z.string().optional(),
});

/**
 * POST /api/messaging/create-birthday-message
 * Create a birthday message in the messages table
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Create birthday message endpoint called');

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
      birthdayMessageSchema.parse(body);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: validationError
      }, { status: 400 });
    }

    const {
      name,
      content,
      days_before = 0,
      status = 'active',
      frequency = 'yearly',
      schedule_time = new Date().toISOString()
    } = body;

    console.log('Validated message data:', { name, content, days_before, status, frequency, schedule_time });

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

    // Create the birthday message in the messages table
    console.log('Creating birthday message in messages table');

    // Note: We need to adapt to the table constraints
    // - type must be 'group' (not 'birthday')
    // - frequency must be one of: 'one-time', 'daily', 'weekly', 'monthly' (not 'yearly')
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        name: `[Birthday] ${name}`, // Add prefix to identify as birthday message
        content,
        type: 'group', // Use 'group' instead of 'birthday' due to constraint
        days_before,
        status,
        frequency: 'monthly', // Use 'monthly' instead of 'yearly' due to constraint
        schedule_time,
        // Store additional metadata in payload
        payload: {
          message_type: 'birthday',
          original_frequency: frequency
        }
      })
      .select()
      .single();

    console.log('Insert result:', { message, messageError });

    if (messageError) {
      console.error('Error creating birthday message:', messageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create birthday message',
        details: messageError.message
      }, { status: 500 });
    }

    console.log('Birthday message created successfully:', message);

    // Return the created message
    return NextResponse.json({
      success: true,
      message,
      instructions: 'Birthday message created successfully. It will be sent to members on their birthdays.'
    });
  } catch (error) {
    console.error('Error in create birthday message endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create birthday message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
