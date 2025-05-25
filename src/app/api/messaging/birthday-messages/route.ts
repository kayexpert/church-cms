import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Schema for creating a birthday message
 */
const birthdayMessageSchema = z.object({
  name: z.string().min(1, "Message name is required"),
  content: z.string().min(1, "Message content is required"),
  days_before: z.number().int().min(0).max(30).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
});

/**
 * POST /api/messaging/birthday-messages
 * Create a dedicated birthday message
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Create birthday message endpoint called');

    // Parse request body
    const body = await request.json();

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
      status = 'active'
    } = body;

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Check if the birthday_messages table exists, create it if not
    const { error: checkTableError } = await supabaseAdmin
      .from('birthday_messages')
      .select('id')
      .limit(1)
      .catch(() => ({ error: { message: 'Table does not exist' } }));

    if (checkTableError) {
      console.log('Creating birthday_messages table');

      // Create the birthday_messages table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS birthday_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          days_before INTEGER DEFAULT 0,
          status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // Try to create the table directly using SQL
      try {
        // Check if the exec_sql RPC function exists
        const { error: rpcCheckError } = await supabaseAdmin
          .rpc('exec_sql', { sql_query: 'SELECT 1' })
          .catch(err => {
            console.error('Error checking exec_sql RPC function:', err);
            return { error: err };
          });

        if (rpcCheckError) {
          console.error('exec_sql RPC function not available:', rpcCheckError);

          // Try to create the table using the REST API instead
          const { error: createTableError } = await supabaseAdmin
            .from('birthday_messages')
            .insert({
              id: '00000000-0000-0000-0000-000000000000',
              name: 'Test',
              content: 'Test',
              days_before: 0,
              status: 'active'
            })
            .select();

          if (createTableError && createTableError.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating birthday_messages table via REST API:', createTableError);
            return NextResponse.json({
              success: false,
              error: 'Failed to create birthday_messages table',
              details: createTableError
            }, { status: 500 });
          }
        } else {
          // Use the RPC function to create the table
          const { error: createTableError } = await supabaseAdmin
            .rpc('exec_sql', { sql_query: createTableQuery })
            .catch(err => {
              console.error('Error executing SQL to create table:', err);
              return { error: err };
            });

          if (createTableError) {
            console.error('Error creating birthday_messages table via RPC:', createTableError);
            return NextResponse.json({
              success: false,
              error: 'Failed to create birthday_messages table',
              details: createTableError
            }, { status: 500 });
          }
        }
      } catch (error) {
        console.error('Unexpected error creating birthday_messages table:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to create birthday_messages table',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }

    }

    // Create the birthday message
    console.log('Creating birthday message');

    const { data: message, error: messageError } = await supabaseAdmin
      .from('birthday_messages')
      .insert({
        name,
        content,
        days_before,
        status
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating birthday message:', messageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create birthday message',
        details: messageError.message
      }, { status: 500 });
    }

    console.log('Birthday message created:', message);

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

/**
 * GET /api/messaging/birthday-messages
 * Get all birthday messages
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Get birthday messages endpoint called');

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get all birthday messages
    const { data: messages, error } = await supabaseAdmin
      .from('birthday_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting birthday messages:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get birthday messages',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error in get birthday messages endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get birthday messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
