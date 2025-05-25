import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { sendSMSWithConfig, getDefaultSMSConfig } from '@/services/sms-service';
import { createMessageLog } from '@/services/messaging-service';
import { getMembersByIds, getMembersByGroupId } from '@/services/messaging-service';
import { personalizeMessage } from '@/utils/message-utils';

/**
 * Enhanced logging function for SMS sending
 * @param level Log level (info, warn, error)
 * @param message Message to log
 * @param data Additional data to log
 */
function logSmsSend(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[SMS-SEND ${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    // Safely stringify data, handling circular references
    let dataStr;
    try {
      dataStr = JSON.stringify(data, (key, value) => {
        if (key === 'password' || key === 'api_secret' || key === 'authToken' || key === 'api_key') {
          return '***REDACTED***';
        }
        return value;
      }, 2);
    } catch (e) {
      dataStr = '[Circular or complex object]';
    }

    console[level](`${logPrefix} ${message}`, dataStr);
  } else {
    console[level](`${logPrefix} ${message}`);
  }
}

// Schema for send request
const sendRequestSchema = z.object({
  messageId: z.string().uuid("Invalid message ID format"),
  sendNow: z.boolean().default(true),
});

/**
 * POST /api/messaging/send
 * Send a message immediately
 */
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    logSmsSend('info', `Message send request received [${requestId}]`);
    console.log(`[SMS-SEND] Message send request received [${requestId}]`);

    // Parse request body
    let body;
    try {
      // Get the request text first for debugging
      const requestText = await request.text();
      console.log(`[SMS-SEND] Request body text [${requestId}]:`, requestText);

      // Try to parse the JSON
      try {
        body = JSON.parse(requestText);
        console.log(`[SMS-SEND] Request body parsed [${requestId}]:`, body);
        logSmsSend('info', `Request body parsed [${requestId}]`, body);
      } catch (jsonError) {
        console.error(`[SMS-SEND] Error parsing JSON [${requestId}]:`, jsonError);
        logSmsSend('error', `Error parsing JSON [${requestId}]`, { text: requestText, error: jsonError });
        return NextResponse.json(
          {
            error: 'Invalid JSON in request body',
            details: `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
            requestText: requestText.substring(0, 100) + (requestText.length > 100 ? '...' : ''),
            requestId,
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error(`[SMS-SEND] Error reading request body [${requestId}]:`, parseError);
      logSmsSend('error', `Error reading request body [${requestId}]`, parseError);
      return NextResponse.json(
        {
          error: 'Error reading request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate request body
    console.log(`[SMS-SEND] Validating request body [${requestId}]:`, body);
    const validationResult = sendRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();
      console.error(`[SMS-SEND] Validation error [${requestId}]:`, formattedErrors);
      logSmsSend('error', `Validation error [${requestId}]`, formattedErrors);

      // Extract error messages for easier debugging
      const errorMessages = [];
      if (formattedErrors.messageId?._errors) {
        errorMessages.push(...formattedErrors.messageId._errors);
      }
      if (formattedErrors.sendNow?._errors) {
        errorMessages.push(...formattedErrors.sendNow._errors);
      }

      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: formattedErrors,
          messages: errorMessages.length > 0 ? errorMessages : ['Validation failed. Please check the request format.'],
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`[SMS-SEND] Validation successful [${requestId}]`);
    logSmsSend('info', `Request validation successful [${requestId}]`, {
      messageId: validationResult.data.messageId,
      sendNow: validationResult.data.sendNow
    });

    const { messageId, sendNow } = validationResult.data;

    // Get the message
    logSmsSend('info', `Fetching message with ID: ${messageId} [${requestId}]`);

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      logSmsSend('error', `Message not found [${requestId}]`, {
        messageId,
        error: messageError,
        query: `SELECT * FROM messages WHERE id = '${messageId}'`
      });

      // Try to get all messages to see if there are any
      const { data: allMessages, error: allMessagesError } = await supabase
        .from('messages')
        .select('id')
        .limit(5);

      let additionalInfo = '';
      if (!allMessagesError && allMessages && allMessages.length > 0) {
        additionalInfo = `Available message IDs include: ${allMessages.map(m => m.id).join(', ')}`;
        logSmsSend('info', `Found ${allMessages.length} messages [${requestId}]`, { messageIds: allMessages.map(m => m.id) });
      } else {
        additionalInfo = 'No messages found in the database.';
        logSmsSend('info', `No messages found in the database [${requestId}]`);
      }

      return NextResponse.json(
        {
          error: 'Message not found',
          details: messageError?.message || 'The specified message does not exist',
          additionalInfo,
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Get the recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('message_recipients')
      .select('*')
      .eq('message_id', messageId);

    if (recipientsError) {
      logSmsSend('error', `Error fetching recipients [${requestId}]`, { messageId, error: recipientsError });
      return NextResponse.json(
        {
          error: 'Failed to fetch recipients',
          details: recipientsError.message,
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    if (!recipients || recipients.length === 0) {
      logSmsSend('warn', `No recipients found for message [${requestId}]`, { messageId });
      return NextResponse.json(
        {
          error: 'No recipients',
          message: 'The message has no recipients',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Get the default SMS configuration
    const smsConfig = await getDefaultSMSConfig();

    if (!smsConfig) {
      logSmsSend('error', `No SMS provider configured [${requestId}]`);
      return NextResponse.json(
        {
          error: 'No SMS provider configured',
          message: 'Please configure an SMS provider before sending messages',
          details: 'Go to Settings > Messages > SMS Provider Configuration to set up an SMS provider',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate the SMS configuration
    if (!smsConfig.api_key) {
      logSmsSend('error', `SMS provider missing API key [${requestId}]`, { provider: smsConfig.provider_name });
      return NextResponse.json(
        {
          error: 'Invalid SMS provider configuration',
          message: `The ${smsConfig.provider_name} provider is missing an API key`,
          details: 'Go to Settings > Messages > SMS Provider Configuration to update your SMS provider settings',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate sender ID
    if (!smsConfig.sender_id) {
      logSmsSend('warn', `SMS provider missing sender ID [${requestId}]`, { provider: smsConfig.provider_name });
      console.warn(`SMS provider ${smsConfig.provider_name} is missing a sender ID. Using default 'ChurchCMS' sender ID.`);
    }

    // Process each recipient
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of recipients) {
      try {
        let phoneNumbers = [];

        if (recipient.recipient_type === 'individual') {
          // Get the member
          const { data: members } = await getMembersByIds([recipient.recipient_id]);

          if (!members || members.length === 0) {
            logSmsSend('error', `Member not found [${requestId}]`, { memberId: recipient.recipient_id });
            failureCount++;
            results.push({
              recipientId: recipient.recipient_id,
              success: false,
              error: 'Member not found'
            });
            continue;
          }

          const member = members[0];

          // Check if the member has a phone number
          if (!member.primary_phone_number) {
            logSmsSend('error', `Member has no phone number [${requestId}]`, { memberId: member.id });
            failureCount++;
            results.push({
              recipientId: member.id,
              success: false,
              error: 'Member has no phone number'
            });
            continue;
          }

          phoneNumbers.push({
            memberId: member.id,
            phoneNumber: member.primary_phone_number
          });
        } else if (recipient.recipient_type === 'group') {
          // Get all members in the group
          const { data: members } = await getMembersByGroupId(recipient.recipient_id);

          if (!members || members.length === 0) {
            logSmsSend('error', `No members found in group [${requestId}]`, { groupId: recipient.recipient_id });
            failureCount++;
            results.push({
              recipientId: recipient.recipient_id,
              success: false,
              error: 'No members found in group'
            });
            continue;
          }

          // Collect phone numbers
          for (const member of members) {
            if (member.primary_phone_number) {
              phoneNumbers.push({
                memberId: member.id,
                phoneNumber: member.primary_phone_number
              });
            }
          }
        }

        // Send the message to each phone number
        for (const { memberId, phoneNumber } of phoneNumbers) {
          try {
            // Log the SMS sending attempt
            logSmsSend('info', `Sending SMS to ${phoneNumber} [${requestId}]`, {
              memberId,
              messageId,
              provider: smsConfig.provider_name,
              senderId: smsConfig.sender_id
            });

            // Get the member data for personalization
            const { data: memberData } = await supabase
              .from('members')
              .select('*')
              .eq('id', memberId)
              .single();

            // Personalize the message content
            const personalizedContent = memberData
              ? personalizeMessage(message.content, memberData)
              : message.content;

            // Log personalization
            logSmsSend('info', `Personalized message for ${phoneNumber} [${requestId}]`, {
              memberId,
              originalContent: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
              hasPersonalization: personalizedContent !== message.content
            });

            // Send the SMS with personalized content
            const result = await sendSMSWithConfig(
              smsConfig,
              phoneNumber,
              personalizedContent,
              smsConfig.sender_id
            );

            // Log the result
            await createMessageLog({
              message_id: messageId,
              recipient_id: memberId,
              status: result.success ? 'sent' : 'failed',
              error_message: result.error
            });

            if (result.success) {
              successCount++;
              results.push({
                recipientId: memberId,
                success: true,
                messageId: result.messageId
              });
            } else {
              failureCount++;
              results.push({
                recipientId: memberId,
                success: false,
                error: result.error
              });
            }
          } catch (sendError) {
            logSmsSend('error', `Error sending SMS [${requestId}]`, {
              memberId,
              phoneNumber,
              error: sendError
            });

            // Log the error
            await createMessageLog({
              message_id: messageId,
              recipient_id: memberId,
              status: 'failed',
              error_message: sendError instanceof Error ? sendError.message : 'Unknown error'
            });

            failureCount++;
            results.push({
              recipientId: memberId,
              success: false,
              error: sendError instanceof Error ? sendError.message : 'Unknown error'
            });
          }
        }
      } catch (recipientError) {
        logSmsSend('error', `Error processing recipient [${requestId}]`, {
          recipientId: recipient.recipient_id,
          error: recipientError
        });

        failureCount++;
        results.push({
          recipientId: recipient.recipient_id,
          success: false,
          error: recipientError instanceof Error ? recipientError.message : 'Unknown error'
        });
      }
    }

    // Return the results
    logSmsSend('info', `Message sending completed [${requestId}]`, {
      messageId,
      successCount,
      failureCount
    });

    return NextResponse.json({
      success: true,
      messageId,
      results: {
        total: successCount + failureCount,
        success: successCount,
        failure: failureCount,
        details: results
      },
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logSmsSend('error', `Unexpected error in SMS send endpoint [${requestId}]`, error);
    return NextResponse.json(
      {
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
