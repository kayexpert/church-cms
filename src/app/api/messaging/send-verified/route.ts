import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
// Import only what we need
import { createClient } from '@supabase/supabase-js';

/**
 * Enhanced logging function for SMS sending
 * @param level Log level (info, warn, error)
 * @param message Message to log
 * @param data Additional data to log
 */
function logSmsSend(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[SMS-VERIFIED ${timestamp}] [${level.toUpperCase()}]`;

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
 * POST /api/messaging/send-verified
 * Send a message with verification that it exists
 */
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    logSmsSend('info', `Verified send request received [${requestId}]`);
    console.log(`[SMS-VERIFIED] Send request received [${requestId}]`);

    // Parse request body
    let body;
    try {
      // Get the request text first for debugging
      const requestText = await request.text();
      console.log(`[SMS-VERIFIED] Request body text [${requestId}]:`, requestText);

      // Try to parse the JSON
      try {
        body = JSON.parse(requestText);
        console.log(`[SMS-VERIFIED] Request body parsed [${requestId}]:`, body);
        logSmsSend('info', `Request body parsed [${requestId}]`, body);
      } catch (jsonError) {
        console.error(`[SMS-VERIFIED] Error parsing JSON [${requestId}]:`, jsonError);
        logSmsSend('error', `Error parsing JSON [${requestId}]`, { text: requestText, error: jsonError });
        return NextResponse.json(
          {
            success: false,
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
      console.error(`[SMS-VERIFIED] Error reading request body [${requestId}]:`, parseError);
      logSmsSend('error', `Error reading request body [${requestId}]`, parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error reading request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate request body
    console.log(`[SMS-VERIFIED] Validating request body [${requestId}]:`, body);
    const validationResult = sendRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();
      console.error(`[SMS-VERIFIED] Validation error [${requestId}]:`, formattedErrors);
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
          success: false,
          error: 'Invalid request body',
          details: formattedErrors,
          messages: errorMessages.length > 0 ? errorMessages : ['Validation failed. Please check the request format.'],
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`[SMS-VERIFIED] Validation successful [${requestId}]`);
    logSmsSend('info', `Request validation successful [${requestId}]`, {
      messageId: validationResult.data.messageId,
      sendNow: validationResult.data.sendNow
    });

    const { messageId, sendNow } = validationResult.data;

    // Get the message with retry logic
    logSmsSend('info', `Fetching message with ID: ${messageId} [${requestId}]`);

    let message = null;
    let messageError = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries && !message) {
      if (retryCount > 0) {
        console.log(`[SMS-VERIFIED] Retry ${retryCount} fetching message [${requestId}]`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }

      const result = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (result.error) {
        messageError = result.error;
        console.error(`[SMS-VERIFIED] Error fetching message (attempt ${retryCount + 1}) [${requestId}]:`, messageError);
      } else if (result.data) {
        message = result.data;
        console.log(`[SMS-VERIFIED] Message found on attempt ${retryCount + 1} [${requestId}]:`, message);
        break;
      }

      retryCount++;
    }

    if (!message) {
      logSmsSend('error', `Message not found after ${maxRetries} attempts [${requestId}]`, {
        messageId,
        error: messageError,
        query: `SELECT * FROM messages WHERE id = '${messageId}'`
      });

      // Try to get all messages to see if there are any
      const { data: allMessages, error: allMessagesError } = await supabase
        .from('messages')
        .select('id, name')
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
          success: false,
          error: 'Message not found',
          details: messageError?.message || 'The specified message does not exist',
          additionalInfo,
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Get the recipients with retry logic
    logSmsSend('info', `Fetching recipients for message: ${messageId} [${requestId}]`);

    let recipients = null;
    let recipientsError = null;
    retryCount = 0;

    while (retryCount < maxRetries && !recipients) {
      if (retryCount > 0) {
        console.log(`[SMS-VERIFIED] Retry ${retryCount} fetching recipients [${requestId}]`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }

      const result = await supabase
        .from('message_recipients')
        .select('*')
        .eq('message_id', messageId);

      if (result.error) {
        recipientsError = result.error;
        console.error(`[SMS-VERIFIED] Error fetching recipients (attempt ${retryCount + 1}) [${requestId}]:`, recipientsError);
      } else if (result.data) {
        recipients = result.data;
        console.log(`[SMS-VERIFIED] Recipients found on attempt ${retryCount + 1} [${requestId}]:`, recipients);
        break;
      }

      retryCount++;
    }

    if (recipientsError) {
      logSmsSend('error', `Error fetching recipients [${requestId}]`, { messageId, error: recipientsError });
      return NextResponse.json(
        {
          success: false,
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
          success: false,
          error: 'No recipients',
          message: 'The message has no recipients',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Forward to the main send endpoint
    try {
      logSmsSend('info', `Forwarding to main send endpoint [${requestId}]`);

      // Create the request URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const url = `${baseUrl}/api/messaging/send`;

      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          sendNow
        }),
      });

      // Get the response
      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[SMS-VERIFIED] Error parsing response [${requestId}]:`, parseError);
        return NextResponse.json({
          success: false,
          error: 'Error parsing response from send endpoint',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
          responseText: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''),
          requestId,
          timestamp: new Date().toISOString(),
        }, { status: 500 });
      }

      // Return the response
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      logSmsSend('error', `Error forwarding to send endpoint [${requestId}]`, error);
      return NextResponse.json({
        success: false,
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  } catch (error) {
    logSmsSend('error', `Unexpected error in verified send endpoint [${requestId}]`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
