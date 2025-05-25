import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMSWithConfig, getDefaultSMSConfig } from '@/services/sms-service';
import { personalizeMessage } from '@/utils/message-utils';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';

/**
 * POST /api/messaging/create-and-send
 * Create a message and send it in one operation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Create and send message endpoint called');

    // Parse request body
    const body = await request.json();
    const {
      content = 'Test message',
      name = 'Test Message',
      recipientId: providedRecipientId,
      recipientType = 'individual',
      type, // Accept message type from the request
      sendNow = true
    } = body;

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Step 1: Find or create a recipient ID
    let recipientId = providedRecipientId;

    if (!recipientId) {
      console.log('No recipient ID provided, looking for a member');
      const { data: members, error: membersError } = await supabaseAdmin
        .from('members')
        .select('id, primary_phone_number')
        .eq('status', 'active')
        .not('primary_phone_number', 'is', null)
        .limit(1);

      if (membersError || !members || members.length === 0) {
        console.error('Error finding a member:', membersError);
        return NextResponse.json({
          success: false,
          error: 'No members found with phone numbers',
          details: membersError?.message || 'No active members with phone numbers found'
        }, { status: 400 });
      }

      recipientId = members[0].id;
      console.log('Found member to use as recipient:', recipientId, 'with phone:', members[0].primary_phone_number);
    }

    // Step 2: Check if SMS configuration exists
    console.log('Checking SMS configuration');
    const { data: smsConfig, error: smsConfigError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .eq('is_default', true)
      .single();

    if (smsConfigError) {
      console.error('Error fetching SMS configuration:', smsConfigError);

      // Try to create a default configuration
      console.log('Creating default SMS configuration');
      const { data: newConfig, error: createConfigError } = await supabaseAdmin
        .from('messaging_configurations')
        .insert({
          provider_name: 'mock',
          sender_id: 'ChurchCMS',
          is_default: true
        })
        .select()
        .single();

      if (createConfigError) {
        console.error('Error creating SMS configuration:', createConfigError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create SMS configuration',
          details: createConfigError.message
        }, { status: 500 });
      }

      console.log('Created default SMS configuration:', newConfig);
    } else {
      console.log('Found SMS configuration:', smsConfig);
    }

    // Step 3: Create the message
    console.log('Creating message');
    // Determine the message type based on provided type or recipient type
    const messageType = type || (recipientType === 'group' ? 'group' : 'quick');

    // Determine the appropriate status based on schedule time and sendNow flag
    const now = new Date();
    const scheduleTime = new Date(body.schedule_time || now);
    const isFutureSchedule = scheduleTime > now;

    // Determine the appropriate status:
    // - 'inactive' if sending now (will be processed immediately)
    // - 'scheduled' if scheduled for the future
    // - 'active' if not sending now (will be picked up by the scheduler)
    let messageStatus = 'active';
    if (sendNow) {
      messageStatus = 'inactive'; // Will be processed immediately
    } else if (isFutureSchedule) {
      messageStatus = 'scheduled'; // Scheduled for future delivery
    }

    console.log(`Creating message with status: ${messageStatus}, schedule time: ${scheduleTime.toISOString()}`);

    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        name,
        content,
        type: messageType, // Use the correct message type based on recipient type
        frequency: 'one-time',
        schedule_time: scheduleTime.toISOString(),
        status: messageStatus
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create message',
        details: messageError.message
      }, { status: 500 });
    }

    console.log('Message created:', message);

    // Step 4: Create the recipient
    console.log(`Creating message recipient with type: ${recipientType}`);
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('message_recipients')
      .insert({
        message_id: message.id,
        recipient_type: recipientType,
        recipient_id: recipientId
      })
      .select()
      .single();

    if (recipientError) {
      console.error('Error creating message recipient:', recipientError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create message recipient',
        details: recipientError.message,
        message
      }, { status: 500 });
    }

    console.log('Message recipient created:', recipient);

    // Step 5: Get the member's phone number (only for individual recipients)
    let member = null;

    if (recipientType === 'individual') {
      console.log('Getting member phone number');

      // First, check if the member exists and is active
      const { data: memberExists, error: memberExistsError } = await supabaseAdmin
        .from('members')
        .select('id, status')
        .eq('id', recipientId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no rows are returned

      if (memberExistsError) {
        console.error('Error checking if member exists:', memberExistsError);
        return NextResponse.json({
          success: false,
          error: 'Failed to check if member exists',
          details: memberExistsError.message,
          message,
          recipient
        }, { status: 400 });
      }

      // If the member doesn't exist, return a specific error
      if (!memberExists) {
        console.error(`Member ${recipientId} not found in the database`);
        return NextResponse.json({
          success: false,
          error: 'Member not found',
          details: `Member with ID ${recipientId} does not exist in the database`,
          message,
          recipient,
          errorType: 'member_not_found'
        }, { status: 404 });
      }

      // If the member is not active, return a specific error
      if (memberExists.status !== 'active') {
        console.error(`Member ${recipientId} is not active (status: ${memberExists.status})`);
        return NextResponse.json({
          success: false,
          error: 'Member is not active',
          details: `Member with ID ${recipientId} has status '${memberExists.status}' and cannot receive messages`,
          message,
          recipient,
          errorType: 'member_inactive'
        }, { status: 400 });
      }

      // Now get the member's phone number
      const { data: memberData, error: memberError } = await supabaseAdmin
        .from('members')
        .select('primary_phone_number, first_name, last_name')
        .eq('id', recipientId)
        .single();

      if (memberError) {
        console.error('Error getting member phone number:', memberError);
        return NextResponse.json({
          success: false,
          error: 'Failed to get member phone number',
          details: memberError.message,
          message,
          recipient
        }, { status: 400 });
      }

      // Check if the member has a phone number
      if (!memberData.primary_phone_number) {
        console.error(`Member ${recipientId} (${memberData.first_name} ${memberData.last_name}) does not have a phone number`);
        return NextResponse.json({
          success: false,
          error: 'Member has no phone number',
          details: `Member ${memberData.first_name} ${memberData.last_name} does not have a phone number and cannot receive SMS messages`,
          message,
          recipient,
          errorType: 'no_phone_number'
        }, { status: 400 });
      }

      // Validate the phone number format
      try {
        if (!isValidPhoneNumber(memberData.primary_phone_number)) {
          console.error(`Member ${recipientId} (${memberData.first_name} ${memberData.last_name}) has an invalid phone number format: ${memberData.primary_phone_number}`);
          return NextResponse.json({
            success: false,
            error: 'Invalid phone number format',
            details: `Member ${memberData.first_name} ${memberData.last_name} has an invalid phone number format (${memberData.primary_phone_number}) and cannot receive SMS messages`,
            message,
            recipient,
            errorType: 'invalid_phone_number'
          }, { status: 400 });
        }

        // Update the phone number to the normalized version
        memberData.primary_phone_number = normalizePhoneNumber(memberData.primary_phone_number);
      } catch (phoneError) {
        console.error(`Error validating phone number for member ${recipientId}:`, phoneError);
        return NextResponse.json({
          success: false,
          error: 'Invalid phone number',
          details: `Error validating phone number for member ${memberData.first_name} ${memberData.last_name}: ${phoneError instanceof Error ? phoneError.message : String(phoneError)}`,
          message,
          recipient,
          errorType: 'invalid_phone_number'
        }, { status: 400 });
      }

      console.log('Member phone number (normalized):', memberData.primary_phone_number);
      member = memberData;
    } else if (recipientType === 'group') {
      console.log(`Skipping member phone number check for group recipient: ${recipientId}`);

      // For group recipients, we'll check if the group exists
      const { data: groupExists, error: groupError } = await supabaseAdmin
        .from('covenant_families')
        .select('id, name')
        .eq('id', recipientId)
        .maybeSingle();

      if (groupError) {
        console.error('Error checking if group exists:', groupError);
        return NextResponse.json({
          success: false,
          error: 'Failed to check if group exists',
          details: groupError.message,
          message,
          recipient
        }, { status: 400 });
      }

      if (!groupExists) {
        console.error(`Group ${recipientId} not found in the database`);
        return NextResponse.json({
          success: false,
          error: 'Group not found',
          details: `Group with ID ${recipientId} does not exist in the database`,
          message,
          recipient,
          errorType: 'group_not_found'
        }, { status: 404 });
      }

      console.log(`Group found: ${groupExists.name} (${groupExists.id})`);
    } else {
      console.log(`Unknown recipient type: ${recipientType}`);
      return NextResponse.json({
        success: false,
        error: 'Invalid recipient type',
        details: `Recipient type '${recipientType}' is not supported. Supported types are 'individual' and 'group'.`,
        message,
        recipient
      }, { status: 400 });
    }

    // Step 6: Get SMS configuration and send the message if needed
    console.log('Getting default SMS configuration');

    // First, try to prioritize real providers
    try {
      console.log('Prioritizing real SMS providers');
      const prioritizeResponse = await fetch(new URL('/api/messaging/prioritize-real-provider', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const prioritizeData = await prioritizeResponse.json();

      if (prioritizeResponse.ok && prioritizeData.success) {
        console.log('Successfully prioritized real SMS provider:', prioritizeData.message);
      } else {
        console.warn('Could not prioritize real SMS provider:', prioritizeData.error || prioritizeData.message || 'Unknown error');
      }
    } catch (prioritizeError) {
      console.error('Error prioritizing real SMS provider:', prioritizeError);
      // Continue anyway, we'll try to get the default config
    }

    const smsConfigResponse = await getDefaultSMSConfig();

    // If no provider is configured, return an error
    if (!smsConfigResponse.success && (smsConfigResponse as any).errorType === 'no_provider') {
      console.warn('No SMS provider configured:', (smsConfigResponse as any).message);

      // If we're not sending now, we can continue without the SMS config
      if (!sendNow) {
        console.log('Not sending now, continuing without SMS config');
      } else {
        return NextResponse.json({
          success: false,
          error: 'No SMS provider configured',
          errorType: 'no_provider',
          message: 'No SMS provider has been configured. Please set up an SMS provider in the messaging settings.',
          details: (smsConfigResponse as any).message,
          messageData: message,
          recipient
        }, { status: 404 });
      }
    }

    if (!smsConfigResponse.success) {
      console.error('Error getting SMS configuration:', smsConfigResponse.error);

      // If we're not sending now, we can continue without the SMS config
      if (!sendNow) {
        console.log('Not sending now, continuing without SMS config');
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to get SMS configuration',
          details: smsConfigResponse.error,
          message,
          recipient
        }, { status: 500 });
      }
    }

    // Only send if sendNow is true and it's an individual recipient
    // Group recipients are handled by the enhanced messaging service
    if (sendNow && smsConfigResponse.success && recipientType === 'individual') {
      console.log('Sending message directly to individual recipient');

      try {
        const smsConfig = smsConfigResponse.config!;
        console.log('Using SMS configuration:', {
          provider: smsConfig.provider_name,
          senderId: smsConfig.sender_id,
          hasApiKey: !!smsConfig.api_key
        });

        // Check if we're using the mock provider and show a warning
        if (smsConfig.provider_name?.toLowerCase() === 'mock') {
          console.warn('⚠️ USING MOCK SMS PROVIDER - NO ACTUAL SMS WILL BE SENT ⚠️');
          console.warn('Configure a real SMS provider in the messaging settings to send actual SMS messages.');
        }

        // Personalize the message content
        const personalizedContent = personalizeMessage(content, member! as any);

        console.log(`Sending personalized message to ${member!.first_name} ${member!.last_name}:`, {
          originalContent: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          personalizedContent: personalizedContent.substring(0, 50) + (personalizedContent.length > 50 ? '...' : ''),
          hasPersonalization: personalizedContent !== content
        });

        // Send the SMS using the configured provider with personalized content
        console.log(`Sending SMS to ${member!.primary_phone_number} using provider ${smsConfig.provider_name}`);
        const smsResult = await sendSMSWithConfig(
          smsConfig,
          member!.primary_phone_number,
          personalizedContent,
          smsConfig.sender_id
        );

        // Create a message log entry with the result
        const { data: log, error: logError } = await supabaseAdmin
          .from('message_logs')
          .insert({
            message_id: message.id,
            recipient_id: recipientId,
            status: smsResult.success ? 'sent' : 'failed',
            error_message: smsResult.success ? null : smsResult.error,
            sent_at: new Date().toISOString()
          })
          .select()
          .single();

        if (logError) {
          console.error('Error creating message log:', logError);
          // Continue anyway, this is not critical
        }

        // If the SMS failed to send, return an error
        if (!smsResult.success) {
          console.error('Failed to send SMS:', smsResult.error);
          return NextResponse.json({
            success: false,
            error: 'Failed to send SMS',
            details: smsResult.error,
            message,
            recipient
          }, { status: 500 });
        }

        console.log('SMS sent successfully:', smsResult);
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
        return NextResponse.json({
          success: false,
          error: 'Error sending SMS',
          details: smsError instanceof Error ? smsError.message : 'Unknown error',
          message,
          recipient
        }, { status: 500 });
      }
    } else if (sendNow && recipientType === 'group') {
      // For group recipients, we just create the message and let the enhanced messaging service handle the sending
      console.log('Group message created successfully. Bulk sending will be handled by the enhanced messaging service.');
    }

    // Check if we're using the mock provider
    const isMockProvider = smsConfigResponse?.config?.provider_name?.toLowerCase() === 'mock';

    // Return the created message and recipient
    return NextResponse.json({
      success: true,
      message,
      recipient,
      phoneNumber: recipientType === 'individual' ? member?.primary_phone_number : undefined,
      recipientType,
      sent: sendNow && recipientType === 'individual',
      smsProvider: (sendNow && recipientType === 'individual') ? {
        provider: smsConfigResponse?.config?.provider_name || 'unknown',
        senderId: smsConfigResponse?.config?.sender_id || 'default',
        isMock: isMockProvider
      } : null,
      mockWarning: isMockProvider && sendNow && recipientType === 'individual'
        ? 'WARNING: Using mock SMS provider. No actual SMS was sent. Configure a real SMS provider in settings.'
        : undefined,
      instructions: recipientType === 'group'
        ? sendNow
          ? 'Group message created successfully. Bulk sending will be handled separately.'
          : 'Group message created successfully.'
        : sendNow
          ? isMockProvider
            ? 'Message created and SIMULATED sending (no actual SMS sent)'
            : 'Message created and sent successfully through the configured SMS provider'
          : 'Message created successfully'
    });
  } catch (error) {
    console.error('Error in create and send message endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create and send message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
