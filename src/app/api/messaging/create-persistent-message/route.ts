import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/**
 * POST /api/messaging/create-persistent-message
 * Create a test message with transaction support to ensure persistence
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Create persistent message endpoint called');

    // Parse request body
    const body = await request.json();
    const {
      content = 'Persistent test message',
      name = 'Persistent Test',
      recipientId: providedRecipientId
    } = body;

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Step 1: Check if the messages table exists and create it if needed
    console.log('Checking if messages table exists');
    try {
      const { data: messagesCheck, error: messagesCheckError } = await supabaseAdmin
        .from('messages')
        .select('id')
        .limit(1);

      if (messagesCheckError) {
        console.error('Error checking messages table:', messagesCheckError);

        // Create the messages table
        console.log('Creating messages table');
        const createMessagesTable = `
          CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('quick', 'group', 'birthday')),
            frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'daily', 'weekly', 'monthly')),
            schedule_time TIMESTAMP WITH TIME ZONE NOT NULL,
            end_date TIMESTAMP WITH TIME ZONE,
            status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'scheduled', 'pending', 'processing')) DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;

        await supabaseAdmin.rpc('exec_sql', { sql_query: createMessagesTable });
        console.log('Messages table created successfully');
      }
    } catch (tableError) {
      console.error('Error checking/creating messages table:', tableError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check/create messages table',
        details: tableError instanceof Error ? tableError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Step 2: Check if the message_recipients table exists and create it if needed
    console.log('Checking if message_recipients table exists');
    try {
      const { data: recipientsCheck, error: recipientsCheckError } = await supabaseAdmin
        .from('message_recipients')
        .select('id')
        .limit(1);

      if (recipientsCheckError) {
        console.error('Error checking message_recipients table:', recipientsCheckError);

        // Create the message_recipients table
        console.log('Creating message_recipients table');
        const createRecipientsTable = `
          CREATE TABLE IF NOT EXISTS message_recipients (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'group')),
            recipient_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;

        await supabaseAdmin.rpc('exec_sql', { sql_query: createRecipientsTable });
        console.log('Message_recipients table created successfully');
      }
    } catch (tableError) {
      console.error('Error checking/creating message_recipients table:', tableError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check/create message_recipients table',
        details: tableError instanceof Error ? tableError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Step 3: Find or create a recipient ID
    let testRecipientId = providedRecipientId;

    if (!testRecipientId) {
      console.log('No recipient ID provided, looking for a member');
      const { data: members, error: membersError } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('status', 'active')
        .limit(1);

      if (membersError || !members || members.length === 0) {
        console.error('Error finding a member:', membersError);

        // Create a placeholder recipient ID
        testRecipientId = '00000000-0000-0000-0000-000000000000';
        console.log('Using placeholder recipient ID:', testRecipientId);
      } else {
        testRecipientId = members[0].id;
        console.log('Found member to use as recipient:', testRecipientId);
      }
    }

    // Step 4: Create the message with direct database operations
    console.log('Creating message with direct database operations');
    const messageId = randomUUID();
    const scheduleTime = new Date();
    scheduleTime.setDate(scheduleTime.getDate() + 1); // Schedule for tomorrow to avoid immediate processing

    // Use 'scheduled' status since this is a future-dated message
    console.log(`Creating message with status: scheduled, schedule time: ${scheduleTime.toISOString()}`);

    try {
      // Create the message using the insert method
      const { data: message, error: insertError } = await supabaseAdmin
        .from('messages')
        .insert({
          id: messageId,
          name: name,
          content: content,
          type: 'quick',
          frequency: 'one-time',
          schedule_time: scheduleTime.toISOString(),
          status: 'scheduled' // Use scheduled status for future-dated messages
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting message:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create message',
          details: insertError.message
        }, { status: 500 });
      }

      console.log(`Message created with ID: ${messageId}`, message);
    } catch (insertError) {
      console.error('Error creating message:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create message',
        details: insertError instanceof Error ? insertError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Step 5: Verify the message was created
    console.log('Verifying message was created');
    const { data: messageCheck, error: messageCheckError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageCheckError || !messageCheck) {
      console.error('Error verifying message creation:', messageCheckError);
      return NextResponse.json({
        success: false,
        error: 'Message creation verification failed',
        details: messageCheckError?.message || 'Message not found after creation'
      }, { status: 500 });
    }

    console.log('Message verified:', messageCheck);

    // Step 6: Create the recipient with direct database operations
    console.log('Creating message recipient with direct database operations');
    const messageRecipientId = randomUUID();

    try {
      // Create the recipient using the insert method
      const { data: recipient, error: insertError } = await supabaseAdmin
        .from('message_recipients')
        .insert({
          id: messageRecipientId,
          message_id: messageId,
          recipient_type: 'individual',
          recipient_id: testRecipientId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting recipient:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create recipient',
          details: insertError.message,
          message: messageCheck
        }, { status: 500 });
      }

      console.log(`Recipient created with ID: ${messageRecipientId}`, recipient);
    } catch (insertError) {
      console.error('Error creating recipient:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create recipient',
        details: insertError instanceof Error ? insertError.message : 'Unknown error',
        message: messageCheck
      }, { status: 500 });
    }

    // Step 7: Verify the recipient was created
    console.log('Verifying recipient was created');
    const { data: recipientCheck, error: recipientCheckError } = await supabaseAdmin
      .from('message_recipients')
      .select('*')
      .eq('id', messageRecipientId)
      .single();

    if (recipientCheckError || !recipientCheck) {
      console.error('Error verifying recipient creation:', recipientCheckError);
      return NextResponse.json({
        success: false,
        error: 'Recipient creation verification failed',
        details: recipientCheckError?.message || 'Recipient not found after creation',
        message: messageCheck
      }, { status: 500 });
    }

    console.log('Recipient verified:', recipientCheck);

    // Return the created message and recipient
    return NextResponse.json({
      success: true,
      message: messageCheck,
      recipient: recipientCheck,
      instructions: 'Use this message ID with the /api/messaging/send endpoint to test sending'
    });
  } catch (error) {
    console.error('Error in create persistent message endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create persistent message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
