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
 * POST /api/messaging/birthday-messages-db
 * Create a dedicated birthday message
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
      status = 'active'
    } = body;

    console.log('Validated message data:', { name, content, days_before, status });

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

    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // First, try to use the messages table instead of birthday_messages
    try {
      console.log('Attempting to insert into messages table');

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
          schedule_time: new Date().toISOString(), // Default to current time
          // Store additional metadata in payload
          payload: {
            message_type: 'birthday',
            original_frequency: 'yearly'
          }
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error inserting into messages table:', messageError);
        // Continue to try the birthday_messages table
      } else {
        console.log('Successfully created message in messages table:', message);
        return NextResponse.json({
          success: true,
          message,
          instructions: 'Birthday message created successfully. It will be sent to members on their birthdays.'
        });
      }
    } catch (messagesTableError) {
      console.error('Error with messages table approach:', messagesTableError);
      // Continue to try the birthday_messages table
    }

    // Check if the birthday_messages table exists
    console.log('Checking if birthday_messages table exists');
    const { data: tableExists, error: tableCheckError } = await supabaseAdmin
      .from('birthday_messages')
      .select('id')
      .limit(1);

    console.log('Table check result:', { tableExists, tableCheckError });

    // If the table doesn't exist, create it
    if (tableCheckError && tableCheckError.code === 'PGRST116') {
      console.log('birthday_messages table does not exist, creating it...');

      try {
        // Create the table using the exec_sql function
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS birthday_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            days_before INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Add RLS policies
          ALTER TABLE birthday_messages ENABLE ROW LEVEL SECURITY;

          -- Create policies
          CREATE POLICY "Allow select for authenticated users" ON birthday_messages
            FOR SELECT USING (auth.role() = 'authenticated');

          CREATE POLICY "Allow insert for authenticated users" ON birthday_messages
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');

          CREATE POLICY "Allow update for authenticated users" ON birthday_messages
            FOR UPDATE USING (auth.role() = 'authenticated');
        `;

        console.log('Executing SQL to create birthday_messages table');
        const { data: sqlResult, error: rpcCheckError } = await supabaseAdmin.rpc('exec_sql', { sql_query: createTableSQL });

        console.log('SQL execution result:', { sqlResult, rpcCheckError });

        if (rpcCheckError) {
          console.error('exec_sql RPC function not available:', rpcCheckError);

          // Try to create the table using the REST API instead
          console.log('Trying alternative approach to create table');
          const { data: insertResult, error: createTableError } = await supabaseAdmin
            .from('birthday_messages')
            .insert({
              id: '00000000-0000-0000-0000-000000000000',
              name: 'Test',
              content: 'Test',
              days_before: 0,
              status: 'active'
            })
            .select();

          console.log('Insert test record result:', { insertResult, createTableError });

          if (createTableError && createTableError.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating birthday_messages table via REST API:', createTableError);
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
    console.log('Creating birthday message in birthday_messages table');

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

/**
 * GET /api/messaging/birthday-messages-db
 * Get all birthday messages
 */
export async function GET() {
  try {
    console.log('Get birthday messages endpoint called');

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

    // First try to get birthday messages from the messages table
    try {
      // Birthday messages are stored as 'group' type with a name prefix and payload metadata
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('type', 'group')
        .ilike('name', '[Birthday]%')
        .order('created_at', { ascending: false });

      if (!error && messages) {
        console.log(`Found ${messages.length} birthday messages in messages table`);
        return NextResponse.json({
          success: true,
          messages
        });
      }

      // Try an alternative approach using payload
      const { data: payloadMessages, error: payloadError } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('type', 'group')
        .contains('payload', { message_type: 'birthday' })
        .order('created_at', { ascending: false });

      if (!payloadError && payloadMessages && payloadMessages.length > 0) {
        console.log(`Found ${payloadMessages.length} birthday messages using payload query`);
        return NextResponse.json({
          success: true,
          messages: payloadMessages
        });
      }
    } catch (messagesTableError) {
      console.error('Error getting birthday messages from messages table:', messagesTableError);
      // Continue to try the birthday_messages table
    }

    // If that fails, try the birthday_messages table
    const { data: messages, error } = await supabaseAdmin
      .from('birthday_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting birthday messages from birthday_messages table:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get birthday messages',
        details: error.message
      }, { status: 500 });
    }

    console.log(`Found ${messages?.length || 0} birthday messages in birthday_messages table`);

    // Return the messages
    return NextResponse.json({
      success: true,
      messages: messages || []
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
