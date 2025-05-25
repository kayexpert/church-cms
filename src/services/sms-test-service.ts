/**
 * SMS Test Service
 *
 * This service provides functionality for testing Wigal SMS provider configurations.
 */

import { MessagingConfigFormValues } from '@/types/messaging';
import { ServiceResponse } from '@/types/common';

/**
 * Enhanced logging function for SMS testing service
 * @param level Log level (info, warn, error)
 * @param message Message to log
 * @param data Additional data to log
 */
function logSmsService(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[SMS-SERVICE ${timestamp}] [${level.toUpperCase()}]`;

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

/**
 * Test an SMS provider configuration by attempting to send a test message
 *
 * @param config The SMS provider configuration to test
 * @param phoneNumber The phone number to send the test message to
 * @returns A response indicating success or failure
 */
export async function testSMSProvider(
  config: MessagingConfigFormValues,
  phoneNumber: string
): Promise<ServiceResponse<{ success: boolean; message: string }>> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    logSmsService('info', `Testing SMS provider [${testId}]: ${config.provider_name}`);
    logSmsService('info', `Provider details:`, {
      provider: config.provider_name,
      phoneNumber,
      hasSenderId: !!config.sender_id,
      hasApiKey: !!config.api_key,
      hasApiSecret: !!config.api_secret,
      hasBaseUrl: !!config.base_url,
      authType: config.auth_type
    });

    // Validate basic requirements
    if (!config.provider_name) {
      logSmsService('error', `Provider name is missing [${testId}]`);
      return {
        data: {
          success: false,
          message: 'SMS provider name is required'
        },
        error: null
      };
    }

    if (!phoneNumber) {
      logSmsService('error', `Phone number is missing [${testId}]`);
      return {
        data: {
          success: false,
          message: 'Phone number is required for testing'
        },
        error: null
      };
    }

    // Only support Wigal provider
    if (config.provider_name !== 'wigal') {
      const errorMsg = `Only Wigal SMS provider is supported`;
      logSmsService('error', `${errorMsg} [${testId}]`);
      return {
        data: {
          success: false,
          message: errorMsg
        },
        error: null
      };
    }

    // Send test message with Wigal
    return sendWigalSMS(config, phoneNumber, testId);
  } catch (error) {
    logSmsService('error', `Unexpected error in SMS test service [${testId}]`, error);
    return {
      data: null,
      error: error instanceof Error
        ? error
        : new Error(`Unknown error testing SMS provider: ${String(error)}`)
    };
  }
}



/**
 * Test the Wigal SMS provider by actually sending an SMS
 */
async function sendWigalSMS(
  config: MessagingConfigFormValues,
  phoneNumber: string,
  testId: string
): Promise<ServiceResponse<{ success: boolean; message: string }>> {
  try {
    logSmsService('info', `Wigal SMS test started [${testId}]`);
    logSmsService('info', `Wigal provider details:`, {
      provider: 'wigal',
      phoneNumber,
      hasSenderId: !!config.sender_id,
      hasApiKey: !!config.api_key,
      hasApiSecret: !!config.api_secret,
      hasBaseUrl: !!config.base_url
    });

    // Validate required configuration
    if (!config.api_key || !config.api_secret) {
      logSmsService('error', `Wigal configuration incomplete [${testId}]`, {
        hasApiKey: !!config.api_key,
        hasApiSecret: !!config.api_secret
      });
      return {
        data: {
          success: false,
          message: 'Wigal configuration is incomplete. API Key and Username (API Secret) are required.'
        },
        error: null
      };
    }

    if (!config.base_url) {
      logSmsService('info', `Using default Wigal base URL [${testId}]`);
      config.base_url = 'https://frogapi.wigal.com.gh'; // Default Wigal API URL
    }

    // Format the phone number if needed (remove + if present)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    logSmsService('info', `Formatted phone number [${testId}]: ${formattedPhone}`);

    // Construct the Wigal API URL
    // Wigal's API endpoint might vary based on the version
    let apiUrl = '';
    if (config.base_url.endsWith('/')) {
      apiUrl = `${config.base_url}api/v2/sms/send`;
    } else {
      apiUrl = `${config.base_url}/api/v2/sms/send`;
    }

    // Check if we're using the Wigal Frog API
    if (config.base_url.includes('frogapi.wigal.com.gh')) {
      // For Wigal Frog API - use the correct v3 endpoint based on documentation
      apiUrl = `${config.base_url.replace(/\/+$/, '')}/api/v3/sms/send`;
    }

    logSmsService('info', `Wigal API URL [${testId}]: ${apiUrl}`);

    // Use the provided sender ID or default to 'ChurchCMS'
    const senderId = config.sender_id || 'ChurchCMS';
    logSmsService('info', `Using sender ID [${testId}]: "${senderId}" (from config: "${config.sender_id}")`);

    // Validate sender ID (Wigal requires 3-11 characters)
    if (senderId.length < 3 || senderId.length > 11) {
      logSmsService('error', `Invalid sender ID length [${testId}]: ${senderId.length}`);
      return {
        data: {
          success: false,
          message: 'Sender ID must be between 3 and 11 characters for Wigal SMS'
        },
        error: null
      };
    }

    // Prepare the request body according to Wigal's API documentation
    const clientReference = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let requestBody;

    // Check if we're using the Wigal Frog API
    if (config.base_url.includes('frogapi.wigal.com.gh')) {
      // For Wigal Frog API - updated format based on current documentation
      if (apiUrl.includes('/api/v3/sms/send')) {
        // For the v3 API endpoint based on documentation
        requestBody = {
          senderid: senderId,
          destinations: [
            {
              destination: formattedPhone,
              msgid: `test-${Date.now()}`
            }
          ],
          message: 'This is a test message from your Church Management System.',
          smstype: "text"
        };
      } else {
        // Fallback to older format
        requestBody = {
          mobile: formattedPhone,
          message: 'This is a test message from your Church Management System.',
          sender: senderId
        };
      }
    } else {
      // Generic format for other Wigal APIs or custom implementations
      requestBody = {
        clientReference,
        phone: formattedPhone,
        phoneNumber: formattedPhone,
        message: 'This is a test message from your Church Management System.',
        senderId: senderId,
        from: senderId,
        to: formattedPhone,
        content: 'This is a test message from your Church Management System.'
      };
    }

    logSmsService('info', `Sending request to Wigal [${testId}]`);
    logSmsService('info', `Request details:`, {
      url: apiUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic **REDACTED**'
      },
      body: requestBody
    });

    // Prepare headers based on API version
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // For Wigal Frog API v3
    if (apiUrl.includes('/api/v3/sms/send')) {
      // For the v3 API endpoint, use the API-KEY and USERNAME headers
      headers['API-KEY'] = config.api_key || '';
      headers['USERNAME'] = config.api_secret || '';
      logSmsService('info', `Using API-KEY and USERNAME headers for Wigal API v3 [${testId}]`);
    } else if (apiUrl.includes('/v1/sms')) {
      // For older Wigal API, use the API key as a query parameter
      apiUrl = `${apiUrl}?username=${encodeURIComponent(config.api_secret || '')}&password=${encodeURIComponent(config.api_key || '')}`;
      logSmsService('info', `Updated Wigal API URL with auth [${testId}]: ${apiUrl.replace(/password=([^&]*)/, 'password=***REDACTED***')}`);
    } else {
      // For other Wigal API versions or custom implementations, use Basic Auth
      headers['Authorization'] = `Basic ${Buffer.from(`${config.api_key}:${config.api_secret || ''}`).toString('base64')}`;
    }

    logSmsService('info', `Using headers for Wigal [${testId}]:`, Object.keys(headers));

    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    // Get the response text
    const responseText = await response.text();
    logSmsService('info', `Wigal API response status [${testId}]: ${response.status}`);
    logSmsService('info', `Wigal API response [${testId}]: ${responseText}`);

    // Try to parse the response as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      logSmsService('info', `Parsed Wigal response [${testId}]`, responseData);
    } catch (e) {
      logSmsService('error', `Error parsing Wigal response as JSON [${testId}]`, e);
      responseData = { responseText };
    }

    // Check if the request was successful
    if (!response.ok) {
      const errorMessage = `Failed to send test message: ${response.status} ${response.statusText}. ${responseData?.message || responseText}`;
      logSmsService('error', `Wigal API request failed [${testId}]`, {
        status: response.status,
        statusText: response.statusText,
        responseData
      });
      return {
        data: {
          success: false,
          message: errorMessage
        },
        error: null
      };
    }

    // Check for success in the response data
    // For different Wigal API versions, success response might be different
    if (apiUrl.includes('/api/v3/sms/send')) {
      // For the v3 API endpoint based on documentation
      if (response.ok || responseData?.status === 'ACCEPTD' ||
          responseData?.message?.includes('Accepted For Processing')) {
        const successMessage = `Test message sent successfully to ${phoneNumber} using Wigal SMS API`;
        logSmsService('info', `Wigal SMS test succeeded [${testId}]`, {
          status: responseData?.status,
          code: responseData?.code,
          data: responseData?.data
        });
        return {
          data: {
            success: true,
            message: successMessage
          },
          error: null
        };
      }
    } else if (apiUrl.includes('/v1/sms')) {
      // For older Wigal API
      if (response.ok || responseData?.status === 'OK' || responseData?.status === 'SUCCESS' ||
          responseData?.status === 'success' || responseData?.responseCode === '000' ||
          responseData?.code === '1000') {
        const successMessage = `Test message sent successfully to ${phoneNumber} using Wigal SMS API`;
        logSmsService('info', `Wigal SMS test succeeded [${testId}]`, {
          status: responseData?.status,
          responseCode: responseData?.responseCode,
          code: responseData?.code
        });
        return {
          data: {
            success: true,
            message: successMessage
          },
          error: null
        };
      }
    } else if (responseData?.status === 'success' || responseData?.responseCode === '000') {
      const successMessage = `Test message sent successfully to ${phoneNumber} using Wigal SMS API`;
      logSmsService('info', `Wigal SMS test succeeded [${testId}]`, {
        status: responseData?.status,
        responseCode: responseData?.responseCode
      });
      return {
        data: {
          success: true,
          message: successMessage
        },
        error: null
      };
    }

    // If we get here, it's an error
    const errorMessage = `Failed to send test message: ${responseData?.message || responseData?.error || 'Unknown error'}`;
    logSmsService('error', `Wigal SMS test failed [${testId}]`, {
      responseData
    });
    return {
      data: {
        success: false,
        message: errorMessage
      },
      error: null
    };
  } catch (error) {
    logSmsService('error', `Exception in Wigal SMS test [${testId}]`, error);
    return {
      data: {
        success: false,
        message: `Error sending SMS via Wigal: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      error: null
    };
  }
}
