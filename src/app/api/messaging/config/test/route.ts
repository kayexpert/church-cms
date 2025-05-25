import { NextRequest, NextResponse } from 'next/server';
import { testSMSProvider } from '@/services/sms-test-service';
import { z } from 'zod';

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
        if (key === 'password' || key === 'api_secret' || key === 'authToken') {
          return '***REDACTED***';
        }
        return value;
      }, 2);

      // Log as separate calls to avoid rendering issues
      console[level](`${logPrefix} ${message}`);
      console[level](dataStr);
    } catch (e) {
      console[level](`${logPrefix} ${message}`);
      console[level]('[Circular or complex object]');
    }
  } else {
    console[level](`${logPrefix} ${message}`);
  }
}

// Schema for test request with enhanced validation
const testRequestSchema = z.object({
  config: z.object({
    provider_name: z.enum(['wigal', 'arkesel', 'custom', 'mock'], {
      required_error: "SMS provider name is required",
      invalid_type_error: "SMS provider must be one of: wigal, arkesel, custom, mock"
    }),
    api_key: z.string().min(1, "API key is required"),
    api_secret: z.string().optional(),
    base_url: z.string().optional(),
    auth_type: z.enum(['basic_auth', 'token_auth', 'api_key'], {
      invalid_type_error: "Authentication type must be one of: basic_auth, token_auth, api_key"
    }).optional(),
    sender_id: z.string().optional(),
  }).refine(data => {
    // Provider-specific validation
    if (data.provider_name === 'wigal' && !data.api_secret) {
      return false;
    }
    return true;
  }, {
    message: "Wigal provider requires an API Secret (Username)",
    path: ['config', 'api_secret']
  }),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Use international format (e.g., +233XXXXXXXXX)"),
  senderId: z.string().min(3).max(11).optional().refine(val => {
    if (val && (val.length < 3 || val.length > 11)) {
      return false;
    }
    return true;
  }, {
    message: "Sender ID must be between 3 and 11 characters"
  }),
});

/**
 * POST /api/messaging/config/test
 * Test an SMS provider configuration by sending a test message
 */
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    logSmsTest('info', `SMS test request received [${requestId}]`);

    // Parse request body
    let body;
    try {
      body = await request.json();
      // Log the request body with sensitive data redacted
      logSmsTest('info', `Request body parsed [${requestId}]`);
      if (body && body.config) {
        const redactedBody = {
          ...body,
          config: {
            ...body.config,
            api_key: body.config.api_key ? '***REDACTED***' : undefined,
            api_secret: body.config.api_secret ? '***REDACTED***' : undefined
          }
        };
        console.info(JSON.stringify(redactedBody, null, 2));
      }
    } catch (parseError) {
      logSmsTest('error', `Error parsing request body [${requestId}]`, parseError);
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
          requestId,
          timestamp: new Date().toISOString(),
          help: "Please ensure you're sending a valid JSON object with the required fields"
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validationResult = testRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();
      logSmsTest('error', `Validation error in request [${requestId}]`);
      console.error('Validation errors:', JSON.stringify(formattedErrors, null, 2));

      // Extract specific validation errors for better user feedback
      const errorMessages = [];

      // Check for config errors
      if (formattedErrors.config?._errors) {
        errorMessages.push(...formattedErrors.config._errors);
      }

      // Check for specific config field errors
      if (formattedErrors.config) {
        for (const [field, error] of Object.entries(formattedErrors.config)) {
          if (field !== '_errors' && typeof error === 'object' && '_errors' in error) {
            const fieldErrors = (error as any)._errors;
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              errorMessages.push(`${field}: ${fieldErrors.join(', ')}`);
            }
          }
        }
      }

      // Check for phone number errors
      if (formattedErrors.phoneNumber?._errors) {
        errorMessages.push(...formattedErrors.phoneNumber._errors);
      }

      // Check for sender ID errors
      if (formattedErrors.senderId?._errors) {
        errorMessages.push(...formattedErrors.senderId._errors);
      }

      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: formattedErrors,
          messages: errorMessages.length > 0 ? errorMessages : ['Validation failed. Please check the request format.'],
          requestId,
          timestamp: new Date().toISOString(),
          help: "Please correct the validation errors and try again"
        },
        { status: 400 }
      );
    }

    const { config, phoneNumber, senderId } = validationResult.data;
    logSmsTest('info', `Testing SMS provider: ${config.provider_name} with phone: ${phoneNumber} and sender ID: ${senderId || 'ChurchCMS'} [${requestId}]`);

    // Prepare the configuration with sender ID
    const testConfig = {
      ...config,
      sender_id: senderId || config.sender_id || 'ChurchCMS',
    };

    // Test the SMS provider
    logSmsTest('info', `Calling SMS provider test service [${requestId}]`);
    const { data, error } = await testSMSProvider(testConfig, phoneNumber);

    if (error) {
      logSmsTest('error', `Error from SMS provider test service [${requestId}]`);
      if (error) {
        console.error('Error details:', error.message || JSON.stringify(error));
      }
      return NextResponse.json(
        {
          error: 'Failed to test SMS provider',
          details: error.message,
          provider: config.provider_name,
          requestId,
          timestamp: new Date().toISOString(),
          help: "Please check your SMS provider credentials and try again"
        },
        { status: 500 }
      );
    }

    if (!data || !data.success) {
      logSmsTest('error', `SMS test failed [${requestId}]`);
      if (data?.message) {
        console.error('Error message:', data.message);
      }

      // Create a more helpful error message based on the provider
      let helpMessage = "The SMS provider rejected the request. Please check your credentials and try again.";

      if (config.provider_name === 'wigal') {
        helpMessage = "Wigal SMS API rejected the request. Please verify your API key, username, and sender ID. Make sure your sender ID is registered with Wigal.";
      } else if (config.provider_name === 'arkesel') {
        helpMessage = "Arkesel SMS API rejected the request. Please verify your API key and sender ID. Make sure your sender ID is registered with Arkesel.";
      }

      // Check for specific error patterns
      if (data?.message?.includes('404') || data?.message?.includes('NOT_FOUND')) {
        helpMessage = "The SMS provider API endpoint could not be found. This could be due to an incorrect API URL or authentication issue.";
      }

      return NextResponse.json(
        {
          error: 'SMS test failed',
          message: data?.message || 'Unknown error',
          provider: config.provider_name,
          requestId,
          timestamp: new Date().toISOString(),
          help: helpMessage
        },
        { status: 400 }
      );
    }

    logSmsTest('info', `SMS test successful [${requestId}]`);
    if (data?.message) {
      console.info('Success message:', data.message);
    }
    return NextResponse.json({
      success: true,
      message: data.message,
      provider: config.provider_name,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logSmsTest('error', `Unexpected error in SMS test endpoint [${requestId}]`);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    return NextResponse.json(
      {
        error: 'Failed to test SMS provider',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
        help: "An unexpected error occurred. Please try again or contact support."
      },
      { status: 500 }
    );
  }
}
