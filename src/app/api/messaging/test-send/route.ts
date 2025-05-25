import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { sendSMSWithConfig, getDefaultSMSConfig } from '@/services/sms-service';
import { createMessageLog } from '@/services/messaging-service';

/**
 * Enhanced logging function for SMS testing
 * @param level Log level (info, warn, error)
 * @param message Message to log
 * @param data Additional data to log
 */
function logSmsTest(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[SMS-TEST ${timestamp}] [${level.toUpperCase()}]`;

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

// Schema for test send request
const testSendRequestSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  message: z.string().min(1, "Message content is required").default("This is a test message from the SMS Diagnostic Tool"),
  senderId: z.string().optional(),
  debug: z.boolean().optional(),
});

/**
 * POST /api/messaging/test-send
 * Send a test message directly without creating a message record
 */
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    logSmsTest('info', `Test message request received [${requestId}]`);
    console.log(`[SMS-TEST] Test message request received [${requestId}]`);

    // Parse request body
    let body;
    try {
      // Get the request text first for debugging
      const requestText = await request.text();
      console.log(`[SMS-TEST] Request body text [${requestId}]:`, requestText);

      // Try to parse the JSON
      try {
        body = JSON.parse(requestText);
        console.log(`[SMS-TEST] Request body parsed [${requestId}]:`, body);
        logSmsTest('info', `Request body parsed [${requestId}]`, body);
      } catch (jsonError) {
        console.error(`[SMS-TEST] Error parsing JSON [${requestId}]:`, jsonError);
        logSmsTest('error', `Error parsing JSON [${requestId}]`, { text: requestText, error: jsonError });
        return NextResponse.json(
          {
            error: 'Invalid JSON in request body',
            details: `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
            requestId,
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error(`[SMS-TEST] Error reading request body [${requestId}]:`, parseError);
      logSmsTest('error', `Error reading request body [${requestId}]`, parseError);
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
    console.log(`[SMS-TEST] Validating request body [${requestId}]:`, body);
    const validationResult = testSendRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();
      console.error(`[SMS-TEST] Validation error [${requestId}]:`, formattedErrors);
      logSmsTest('error', `Validation error [${requestId}]`, formattedErrors);

      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: formattedErrors,
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`[SMS-TEST] Validation successful [${requestId}]`);

    const { phoneNumber, message, senderId, debug } = validationResult.data;

    // Log if debug mode is enabled
    if (debug) {
      logSmsTest('info', `Debug mode enabled for test message [${requestId}]`);
    }

    // Get the default SMS configuration
    const smsConfig = await getDefaultSMSConfig();
    if (!smsConfig) {
      logSmsTest('error', `No default SMS provider configured [${requestId}]`);
      return NextResponse.json(
        {
          error: 'No SMS provider configured',
          message: 'Please configure an SMS provider in the settings',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    logSmsTest('info', `Using SMS provider: ${(smsConfig as any).provider_name} [${requestId}]`);

    // Send the SMS
    logSmsTest('info', `Sending test SMS to ${phoneNumber} with provider ${(smsConfig as any).provider_name} [${requestId}]`);
    const result = await sendSMSWithConfig(
      smsConfig as any,
      phoneNumber,
      message,
      senderId || (smsConfig as any).sender_id
    );

    // Log the result
    logSmsTest('info', `SMS send result [${requestId}]:`, result);

    // Create a message log entry for debugging purposes
    try {
      await createMessageLog({
        message_id: 'test-message', // No message ID for test messages
        recipient_id: phoneNumber,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || undefined
      });
      logSmsTest('info', `Created message log entry [${requestId}]`);

      // If debug is enabled and there was an error, also log to error_logs table
      if (debug && !result.success) {
        try {
          await supabase.from('error_logs').insert({
            error_type: 'messaging_error',
            error_message: result.error || 'Unknown error',
            endpoint: '/api/messaging/test-send',
            request_data: {
              phoneNumber,
              message,
              senderId,
              debug,
            },
            response_data: result,
            provider: (smsConfig as any).provider_name,
          });
          logSmsTest('info', `Created error log entry [${requestId}]`);
        } catch (errorLogError) {
          logSmsTest('error', `Error creating error log [${requestId}]`, errorLogError);
        }
      }
    } catch (logError) {
      logSmsTest('error', `Error creating message log [${requestId}]`, logError);
      // Don't fail the request if logging fails
    }

    if (result.success) {
      logSmsTest('info', `Test message sent successfully [${requestId}]`);
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully',
        messageId: result.messageId,
        details: {
          provider: (smsConfig as any).provider_name,
          phoneNumber,
          senderId: senderId || (smsConfig as any).sender_id || 'default',
          bulkDetails: result.bulkDetails
        },
        debug: debug ? {
          requestId,
          timestamp: new Date().toISOString(),
          fullResult: result
        } : undefined,
        requestId,
        timestamp: new Date().toISOString()
      });
    } else {
      logSmsTest('error', `Failed to send test message [${requestId}]`, { error: result.error });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test message',
          message: result.error || 'Unknown error',
          details: debug ? {
            provider: (smsConfig as any).provider_name,
            phoneNumber,
            senderId: senderId || (smsConfig as any).sender_id || 'default',
            fullResult: result
          } : undefined,
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logSmsTest('error', `Unexpected error in test send endpoint [${requestId}]`, error);
    return NextResponse.json(
      {
        error: 'Failed to send test message',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
