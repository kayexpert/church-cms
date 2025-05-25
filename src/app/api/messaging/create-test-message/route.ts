import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * Schema for creating a test message
 */
const createTestMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  name: z.string().min(1, "Message name is required").default("Test Message"),
  phoneNumber: z.string().optional(),
  recipientId: z.string().uuid("Invalid recipient ID format").optional(),
});

/**
 * POST /api/messaging/create-test-message
 * Create a test message in the database and return its ID
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Create test message endpoint called');

    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);

    // Validate request body
    const validationResult = createTestMessageSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.format());
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { content, name, phoneNumber, recipientId } = validationResult.data;
    console.log('Validated data:', { content, name, phoneNumber, recipientId });

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // First, check if the messages table exists
    try {
      const { count, error } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error checking messages table:', error);

        // Try to create the table
        try {
          const createTableResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/db/verify-messaging-tables`, {
            method: 'POST',
          });

          const createTableData = await createTableResult.json();
          console.log('Table verification result:', createTableData);
        } catch (createError) {
          console.error('Error creating tables:', createError);
        }
      } else {
        console.log(`Messages table exists with ${count} rows`);
      }
    } catch (checkError) {
      console.error('Error checking messages table:', checkError);
    }

    // Create a test message
    console.log('Creating test message with admin client');
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        name: name,
        content: content,
        type: 'quick',
        frequency: 'one-time',
        schedule_time: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating test message:', messageError);

      // Try with direct SQL
      try {
        console.log('Attempting to insert message with direct SQL');
        const sql = `
          INSERT INTO messages (
            name,
            content,
            type,
            frequency,
            schedule_time,
            status
          ) VALUES (
            '${name.replace(/'/g, "''")}',
            '${content.replace(/'/g, "''")}',
            'quick',
            'one-time',
            '${new Date().toISOString()}',
            'active'
          ) RETURNING id;
        `;

        const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: sql
        });

        if (sqlError) {
          console.error('Error inserting message with direct SQL:', sqlError);
          return NextResponse.json(
            { error: 'Failed to create test message', details: sqlError.message },
            { status: 500 }
          );
        } else {
          console.log('Message inserted with direct SQL:', sqlData);
          // Since we can't easily get the ID from the SQL result, we'll try to get the latest message
          const { data: latestMessage, error: latestError } = await supabaseAdmin
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latestError) {
            console.error('Error getting latest message:', latestError);
            return NextResponse.json(
              { error: 'Message created but could not retrieve it', details: latestError.message },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            message: latestMessage,
            messageId: latestMessage.id,
            content: latestMessage.content
          });
        }
      } catch (sqlError) {
        console.error('Exception inserting message with direct SQL:', sqlError);
        return NextResponse.json(
          { error: 'Failed to create test message', details: sqlError instanceof Error ? sqlError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Failed to create test message: No message data returned' },
        { status: 500 }
      );
    }

    console.log('Message created successfully:', message);

    // Create a test member if a phone number was provided
    let testMemberId = recipientId || '00000000-0000-0000-0000-000000000000';

    if (phoneNumber) {
      try {
        console.log('Creating test member with phone number:', phoneNumber);

        // First check if a test member already exists
        const { data: existingMembers, error: existingError } = await supabaseAdmin
          .from('members')
          .select('*')
          .eq('primary_phone_number', phoneNumber)
          .eq('first_name', 'Test')
          .eq('last_name', 'Member');

        if (existingError) {
          console.error('Error checking for existing test member:', existingError);
        } else if (existingMembers && existingMembers.length > 0) {
          console.log('Found existing test member:', existingMembers[0]);
          testMemberId = existingMembers[0].id;
        } else {
          // Create a test member
          const { data: memberData, error: memberError } = await supabaseAdmin
            .from('members')
            .insert({
              first_name: 'Test',
              last_name: 'Member',
              primary_phone_number: phoneNumber,
              status: 'active'
            })
            .select()
            .single();

          if (memberError) {
            console.error('Error creating test member:', memberError);
          } else {
            console.log('Test member created successfully:', memberData);
            testMemberId = memberData.id;
          }
        }
      } catch (memberError) {
        console.error('Exception creating test member:', memberError);
      }
    }

    // Create a recipient for the message
    console.log('Creating message recipient with ID:', testMemberId);
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('message_recipients')
      .insert({
        message_id: message.id,
        recipient_type: 'individual',
        recipient_id: testMemberId
      })
      .select()
      .single();

    if (recipientError) {
      console.error('Error creating message recipient:', recipientError);

      // Try with direct SQL
      try {
        console.log('Attempting to insert recipient with direct SQL');
        const sql = `
          INSERT INTO message_recipients (
            message_id,
            recipient_type,
            recipient_id
          ) VALUES (
            '${message.id}',
            'individual',
            '${recipientId || '00000000-0000-0000-0000-000000000000'}'
          ) RETURNING id;
        `;

        const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: sql
        });

        if (sqlError) {
          console.error('Error inserting recipient with direct SQL:', sqlError);
        } else {
          console.log('Recipient inserted with direct SQL');
        }
      } catch (sqlError) {
        console.error('Exception inserting recipient with direct SQL:', sqlError);
      }
    } else {
      console.log('Message recipient created successfully:', recipient);
    }

    return NextResponse.json({
      success: true,
      message: message,
      messageId: message.id,
      content: message.content,
      recipient: recipient,
      testMember: phoneNumber ? { id: testMemberId, phoneNumber } : null
    });
  } catch (error) {
    console.error('Error in create-test-message:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test message',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
