/**
 * SMS Service
 *
 * This service provides functionality for sending SMS messages through the Wigal SMS provider.
 * It includes:
 * - Robust error handling
 * - Support for bulk messaging
 * - Dynamic provider configuration from database
 * - Automatic configuration validation and repair
 */

import { supabase } from '@/lib/supabase';
import { executeDbOperation } from '@/lib/db-optimized';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';

// Types
export interface SMSDestinationResult {
  destination: string;
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface SMSBulkDetails {
  totalSent: number;
  totalFailed?: number;
  destinations: SMSDestinationResult[];
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  message?: string;
  bulkDetails?: SMSBulkDetails;
}

export interface SMSProvider {
  name: string;
  sendSMS: (to: string, message: string, senderId?: string) => Promise<SMSResult>;
}

export interface SMSConfig {
  provider_name: 'wigal'; // Only allow 'wigal' as the provider name
  api_key: string;
  api_secret?: string;
  base_url?: string;
  auth_type?: 'api_key';
  sender_id?: string;
  is_default?: boolean;
}

/**
 * Get the default SMS configuration from the database
 * @returns Promise with the default SMS configuration and success status
 */
export async function getDefaultSMSConfig(): Promise<{ success: boolean; config?: SMSConfig; error?: string }> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    console.log(`[${requestId}] Fetching default SMS configuration`);

    // Skip the API endpoint approach in server-side code
    // This approach only works in browser environments, not in Node.js
    if (typeof window !== 'undefined') {
      try {
        console.log(`[${requestId}] Trying to fetch SMS configuration via API endpoint`);
        const response = await fetch('/api/messaging/get-default-sms-config-admin');

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            console.log(`[${requestId}] Successfully fetched SMS configuration via API endpoint`);
            return { success: true, config: data.config as SMSConfig };
          }
        }
      } catch (apiError) {
        console.error(`[${requestId}] Error fetching SMS configuration via API endpoint:`, apiError);
        // Continue with the regular approach
      }
    } else {
      console.log(`[${requestId}] Skipping API endpoint approach in server environment`);
    }

    // If the API approach fails, try using the createClient approach
    try {
      console.log(`[${requestId}] Trying to fetch SMS configuration using service role`);

      // Import createClient dynamically to avoid issues with SSR
      const { createClient } = await import('@supabase/supabase-js');

      // Create a Supabase client with service role to bypass RLS
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // First, check if the messaging_configurations table exists
      const { count, error: tableError } = await supabaseAdmin
        .from('messaging_configurations')
        .select('*', { count: 'exact', head: true });

      if (tableError) {
        console.error(`[${requestId}] Error checking messaging_configurations table:`, tableError);

        // Check if the error is related to missing tables
        if (tableError.message.includes('relation') || tableError.message.includes('does not exist')) {
          console.error(`[${requestId}] The messaging_configurations table does not exist. Please initialize the messaging tables first.`);
        }

        return {
          success: false,
          error: 'The messaging_configurations table does not exist. Please initialize the messaging tables first.'
        };
      }

      console.log(`[${requestId}] Found ${count} SMS configurations in total`);

      // Get all Wigal configurations
      const { data: allConfigs, error: allConfigsError } = await supabaseAdmin
        .from('messaging_configurations')
        .select('id, provider_name, is_default')
        .eq('provider_name', 'wigal')
        .order('created_at', { ascending: false });

      if (allConfigsError) {
        console.error(`[${requestId}] Error fetching Wigal SMS configurations:`, allConfigsError);
      } else if (allConfigs && allConfigs.length > 0) {
        console.log(`[${requestId}] All Wigal SMS configurations:`, allConfigs.map(c => ({
          id: c.id,
          provider: c.provider_name,
          isDefault: c.is_default
        })));
      }

      // Now get the default Wigal configuration
      const { data, error } = await supabaseAdmin
        .from('messaging_configurations')
        .select('*')
        .eq('provider_name', 'wigal')
        .eq('is_default', true)
        .maybeSingle();


      if (error) {
        console.error(`[${requestId}] Error getting default SMS configuration:`, error);

        // Check if the error is related to missing tables
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.error(`[${requestId}] The messaging_configurations table does not exist. Please initialize the messaging tables first.`);
        }

        return {
          success: false,
          error: 'Error getting default SMS configuration'
        };
      }

      if (!data) {
        console.warn(`[${requestId}] No default SMS configuration found. Please set a default SMS provider in the settings.`);

        // Check if there are configurations but none is default
        if (allConfigs && allConfigs.length > 0) {
          console.warn(`[${requestId}] Found ${allConfigs.length} SMS configurations but none is set as default. Consider setting one as default.`);

          // Try to set the first one as default
          try {
            console.log(`[${requestId}] Attempting to set the first configuration as default`);
            const { error: updateError } = await supabaseAdmin
              .from('messaging_configurations')
              .update({ is_default: true })
              .eq('id', allConfigs[0].id);

            if (!updateError) {
              console.log(`[${requestId}] Successfully set the first configuration as default`);

              // Fetch the updated configuration
              const { data: updatedConfig, error: fetchError } = await supabaseAdmin
                .from('messaging_configurations')
                .select('*')
                .eq('id', allConfigs[0].id)
                .single();

              if (!fetchError && updatedConfig) {
                console.log(`[${requestId}] Returning the newly set default configuration`);
                return { success: true, config: updatedConfig as SMSConfig };
              }
            } else {
              console.error(`[${requestId}] Error setting default configuration:`, updateError);
            }
          } catch (updateError) {
            console.error(`[${requestId}] Error setting default configuration:`, updateError);
          }
        }

        return {
          success: false,
          error: 'No SMS provider configured',
          errorType: 'no_provider',
          message: 'No SMS provider has been configured. Please set up an SMS provider in the messaging settings.'
        };
      }

      // Validate the configuration
      if (!data.provider_name) {
        console.error(`[${requestId}] Invalid SMS configuration: Missing provider_name`);
        return {
          success: false,
          error: 'Invalid SMS configuration: Missing provider_name'
        };
      }

      if (!data.api_key) {
        console.warn(`[${requestId}] SMS configuration for ${data.provider_name} is missing API key`);
      }

      // Log the configuration (without sensitive data)
      console.log(`[${requestId}] Found default SMS configuration:`, {
        id: data.id,
        provider: data.provider_name,
        hasApiKey: !!data.api_key,
        hasApiSecret: !!data.api_secret,
        hasBaseUrl: !!data.base_url,
        hasSenderId: !!data.sender_id,
        authType: data.auth_type,
        isDefault: data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });

      return { success: true, config: data as SMSConfig };
    } catch (createClientError) {
      console.error(`[${requestId}] Error using createClient approach:`, createClientError);
      // Continue with the regular approach as a last resort
    }

    // Last resort: try using the regular client
    console.log(`[${requestId}] Trying to fetch SMS configuration using regular client`);

    // First, check if the messaging_configurations table exists
    const { count, error: tableError } = await executeDbOperation(() =>
      supabase
        .from('messaging_configurations')
        .select('*', { count: 'exact', head: true })
    );

    if (tableError) {
      console.error(`[${requestId}] Error checking messaging_configurations table:`, tableError);
      return {
        success: false,
        error: 'Error checking messaging_configurations table'
      };
    }

    // Get all Wigal configurations
    const { data: allConfigs, error: allConfigsError } = await executeDbOperation(() =>
      supabase
        .from('messaging_configurations')
        .select('id, provider_name, is_default')
        .eq('provider_name', 'wigal')
        .order('created_at', { ascending: false })
    );

    // Now get the default Wigal configuration
    const { data, error } = await executeDbOperation(() =>
      supabase
        .from('messaging_configurations')
        .select('*')
        .eq('provider_name', 'wigal')
        .eq('is_default', true)
        .maybeSingle()
    );

    if (error) {
      console.error(`[${requestId}] Error getting default SMS configuration:`, error);
      return {
        success: false,
        error: 'Error getting default SMS configuration'
      };
    }

    if (!data) {
      console.warn(`[${requestId}] No default SMS configuration found with regular client.`);
      return {
        success: false,
        error: 'No default SMS configuration found with regular client'
      };
    }

    // Log the configuration (without sensitive data)
    console.log(`[${requestId}] Found default SMS configuration with regular client:`, {
      id: data.id,
      provider: data.provider_name,
      hasApiKey: !!data.api_key,
      isDefault: data.is_default
    });

    return { success: true, config: data as SMSConfig };
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in getDefaultSMSConfig:`, error);
    return {
      success: false,
      error: 'Unexpected error in getDefaultSMSConfig'
    };
  }
}

/**
 * Get all Wigal SMS configurations from the database
 * @returns Promise with all Wigal SMS configurations
 */
export async function getAllSMSConfigs(): Promise<SMSConfig[]> {
  const { data, error } = await executeDbOperation(() =>
    supabase
      .from('messaging_configurations')
      .select('*')
      .eq('provider_name', 'wigal')
      .order('is_default', { ascending: false })
  );

  if (error || !data) {
    console.error('Error getting Wigal SMS configurations:', error);
    return [];
  }

  return data as SMSConfig[];
}

/**
 * Send an SMS using the default provider
 * @param to Phone number or array of phone numbers to send to
 * @param message Message content
 * @param senderId Optional sender ID
 * @returns Promise with the result of the SMS send operation
 */
export async function sendSMS(
  to: string | string[],
  message: string,
  senderId?: string
): Promise<SMSResult> {
  try {
    // Check if we're sending to multiple recipients
    const isMultipleRecipients = Array.isArray(to);

    if (isMultipleRecipients) {
      console.log(`Sending bulk SMS to ${to.length} recipients with${senderId ? ' sender ID: ' + senderId : 'out sender ID'}`);

      // Log a sample of recipients for debugging
      if (to.length > 0) {
        const sampleSize = Math.min(3, to.length);
        const sample = to.slice(0, sampleSize);
        console.log(`Sample recipients: ${sample.join(', ')}${to.length > sampleSize ? ` (and ${to.length - sampleSize} more)` : ''}`);
      }
    } else {
      console.log(`Sending SMS to ${to} with${senderId ? ' sender ID: ' + senderId : 'out sender ID'}`);
    }

    // Validate inputs
    if (!to || (isMultipleRecipients && to.length === 0)) {
      console.error('No recipient phone number(s) provided');
      return {
        success: false,
        error: 'Recipient phone number(s) required'
      };
    }

    if (!message) {
      console.error('No message content provided');
      return {
        success: false,
        error: 'Message content is required'
      };
    }

    // Get the default SMS configuration
    let smsConfigResponse = await getDefaultSMSConfig();

    if (!smsConfigResponse.success || !smsConfigResponse.config) {
      console.error('No default SMS provider configured, attempting to fix...', smsConfigResponse.error);

      // Try to fix the configuration
      try {
        // Try using the direct-fix-sms endpoint
        if (typeof window !== 'undefined') {
          const response = await fetch('/api/messaging/ensure-sms-config', {
            method: 'POST'
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Fixed SMS configuration:', data);

            // Try to get the configuration again
            const fixedConfigResponse = await getDefaultSMSConfig();

            if (fixedConfigResponse.success && fixedConfigResponse.config) {
              console.log('Successfully retrieved fixed SMS configuration');
              smsConfigResponse = fixedConfigResponse;
            }
          }
        } else {
          console.log('Skipping ensure-sms-config in server environment');
        }
      } catch (fixError) {
        console.error('Error fixing SMS configuration:', fixError);
      }

      // If we still don't have a config, return an error
      if (!smsConfigResponse.success || !smsConfigResponse.config) {
        return {
          success: false,
          error: smsConfigResponse.error || 'No default SMS provider configured. Please configure an SMS provider in the settings.'
        };
      }
    }

    // Extract the config from the response
    let config = smsConfigResponse.config;

    // Fix the Wigal URL if needed
    if (config.provider_name?.toLowerCase() === 'wigal') {
      console.log('Fixing Wigal URL in configuration before sending');
      config = {
        ...config,
        base_url: 'https://frogapi.wigal.com.gh'
      };
    }

    // Log the message details (without the full content for privacy)
    console.log('Sending message with:', {
      to,
      messageLength: message.length,
      provider: config.provider_name,
      senderId: senderId || config.sender_id || 'default'
    });

    return sendSMSWithConfig(config, to, message, senderId);
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Send an SMS using a specific provider configuration
 * @param config SMS provider configuration
 * @param to Phone number or array of phone numbers to send to
 * @param message Message content
 * @param senderId Optional sender ID
 * @returns Promise with the result of the SMS send operation
 */
export async function sendSMSWithConfig(
  config: SMSConfig,
  to: string | string[],
  message: string,
  senderId?: string
): Promise<SMSResult> {
  try {
    // Check if we're sending to multiple recipients
    const isMultipleRecipients = Array.isArray(to);

    // Normalize the phone number(s)
    const normalizedPhone = isMultipleRecipients
      ? to.map(phone => normalizePhoneNumber(phone))
      : normalizePhoneNumber(to as string);

    // Use the sender ID from the config if not provided
    // Make sure we're not using undefined or null values
    const configSenderId = config.sender_id || '';
    const providedSenderId = senderId || '';
    const effectiveSenderId = providedSenderId || configSenderId || 'ChurchCMS';

    // Log the sender ID being used
    console.log(`Sending SMS with sender ID: "${effectiveSenderId}" (from config: "${configSenderId}", provided: "${providedSenderId}")`);

    // Validate the sender ID
    if (!effectiveSenderId || effectiveSenderId.length < 3 || effectiveSenderId.length > 11) {
      console.warn(`Sender ID "${effectiveSenderId}" may be invalid. Sender IDs should be 3-11 characters.`);
    }

    // Log the provider being used
    console.log(`Using Wigal SMS provider`);

    // Log bulk messaging details if applicable
    if (isMultipleRecipients) {
      const recipients = normalizedPhone as string[];
      console.log(`Bulk SMS: Sending to ${recipients.length} recipients`);

      // Log a sample of recipients for debugging
      if (recipients.length > 0) {
        const sampleSize = Math.min(3, recipients.length);
        const sample = recipients.slice(0, sampleSize);
        console.log(`Sample recipients: ${sample.join(', ')}${recipients.length > sampleSize ? ` (and ${recipients.length - sampleSize} more)` : ''}`);
      }
    }

    // Always use Wigal SMS provider
    return sendWigalSMS(config, normalizedPhone, effectiveSenderId, message);
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Send an SMS using Wigal
 * @param config Wigal configuration
 * @param to Phone number to send to
 * @param senderId Sender ID
 * @param message Message content
 * @returns Promise with the result of the SMS send operation
 */
async function sendWigalSMS(
  config: SMSConfig,
  to: string | string[],
  senderId: string,
  message: string
): Promise<SMSResult> {
  try {
    // Check if we're sending to multiple recipients
    const isMultipleRecipients = Array.isArray(to);

    // Validate sender ID (Wigal requires 3-11 characters)
    if (!senderId || senderId.length < 3 || senderId.length > 11) {
      console.error(`Invalid sender ID for Wigal: "${senderId}". Must be 3-11 characters.`);
      return {
        success: false,
        error: `Invalid sender ID: "${senderId}". Wigal requires sender IDs to be 3-11 characters.`
      };
    }

    // Construct the API URL
    // Updated to use the correct Wigal API endpoint based on documentation
    let baseUrl = config.base_url || 'https://frogapi.wigal.com.gh';

    // Ensure we're using the correct API endpoint
    if (!baseUrl.includes('frogapi.wigal.com.gh')) {
      console.log('Using default Wigal API endpoint');
      baseUrl = 'https://frogapi.wigal.com.gh';
    }

    const url = `${baseUrl}/api/v3/sms/send`;

    // Convert single recipient to array for consistent handling
    const recipients = isMultipleRecipients ? to : [to];

    // Log the request details
    console.log('Sending Wigal SMS with:', {
      url,
      recipientCount: recipients.length,
      sampleRecipient: recipients[0],
      senderId,
      messageLength: message.length,
      apiKeyPresent: !!config.api_key,
      apiSecretPresent: !!config.api_secret,
      bulkSend: isMultipleRecipients
    });

    // Prepare destinations array for the API request
    // For bulk SMS, we need to format according to Wigal's API documentation
    const destinations = recipients.map(recipient => {
      // Remove + prefix as Wigal doesn't need it
      const formattedNumber = (typeof recipient === 'string' ? recipient : '').replace(/\+/g, '');

      // Generate a unique message ID with timestamp and random string
      const uniqueId = `MSG${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      return {
        destination: formattedNumber,
        msgid: uniqueId
      };
    });

    // Prepare the request body according to Wigal API documentation
    const body = {
      senderid: senderId,
      destinations: destinations,
      message: message,
      smstype: 'text'
    };

    // Make the API request
    // Updated authentication method according to Wigal API documentation
    let response;
    try {
      console.log('Sending request to Wigal API:', {
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': 'PRESENT',
          'USERNAME': config.api_secret ? 'PRESENT' : 'default',
          'Cache-Control': 'no-cache',
        },
        bodyLength: JSON.stringify(body).length
      });

      // Use a server-side API endpoint to proxy the request to avoid CORS issues
      // This is especially important for client-side calls
      if (typeof window !== 'undefined') {
        console.log('Using proxy endpoint for Wigal API request');

        // Use our own API endpoint as a proxy
        response = await fetch('/api/messaging/wigal-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: config.api_key,
            apiSecret: config.api_secret,
            body: body
          }),
        });

        if (!response.ok) {
          throw new Error(`Proxy request failed with status: ${response.status}`);
        }
      } else {
        // Server-side code can make the request directly
        // Log the actual API key being used (first few characters only for security)
        const apiKeyPreview = config.api_key ?
          `${config.api_key.substring(0, 4)}...${config.api_key.substring(config.api_key.length - 4)}` :
          'MISSING';

        console.log(`Using Wigal API credentials - API Key: ${apiKeyPreview}, Username: ${config.api_secret ? 'PRESENT' : 'default'}`);

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'API-KEY': config.api_key,
            'USERNAME': config.api_secret || 'default', // Use api_secret as username or default
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(body),
        });
      }
    } catch (fetchError) {
      console.error('Fetch error in Wigal API request:', fetchError);
      throw new Error(`Network error when contacting Wigal API: ${fetchError.message}`);
    }

    // Get the response text first for debugging
    const responseText = await response.text();
    console.log('Wigal API response text:', responseText);

    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing Wigal API response:', parseError);
      return {
        success: false,
        error: `Failed to parse Wigal API response: ${responseText}`
      };
    }

    // Check for API-specific error responses
    if (data.status !== 'ACCEPTD' || !response.ok) {
      console.error('Wigal API error response:', data);
      return {
        success: false,
        error: data.message || data.error || `Wigal API error: ${response.status} ${response.statusText}`
      };
    }

    // Handle successful response
    console.log('Wigal API success response:', data);

    // Check if the response indicates success according to Wigal's documentation
    if (data.status !== 'ACCEPTD') {
      console.error('Wigal API returned non-success status:', data.status);
      return {
        success: false,
        error: data.message || `Unexpected status: ${data.status}`,
        messageId: isMultipleRecipients ? `BULK_ERROR_${Date.now()}` : destinations[0].msgid
      };
    }

    // Return different response formats based on single or bulk send
    if (isMultipleRecipients) {
      return {
        success: true,
        messageId: `BULK_${Date.now()}`,
        message: data.message || "Messages sent successfully",
        bulkDetails: {
          totalSent: destinations.length,
          totalFailed: 0, // Wigal doesn't provide per-message status in the response
          destinations: destinations.map(d => ({
            destination: d.destination,
            messageId: d.msgid,
            status: 'sent' // Assuming all messages were sent successfully
          }))
        }
      };
    } else {
      return {
        success: true,
        messageId: destinations[0].msgid,
        message: data.message || "Message sent successfully"
      };
    }
  } catch (error) {
    console.error('Error sending Wigal SMS:', error);

    // Create a more detailed error message
    let errorMessage = error instanceof Error ? error.message : String(error);

    // Check for network-related errors
    if (errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Network error') ||
        errorMessage.includes('network request failed')) {
      errorMessage = `Network error when contacting Wigal SMS API. Please check your internet connection and try again. Details: ${errorMessage}`;

      // Log additional debugging information
      console.error('Network error details:', {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        originalError: error
      });
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send a message to a recipient and log the result
 * @param messageId ID of the message being sent
 * @param recipientId ID of the recipient
 * @param phoneNumber Phone number to send to
 * @param content Message content
 */
export async function sendAndLogMessage(
  messageId: string,
  recipientId: string,
  phoneNumber: string,
  content: string
): Promise<void> {
  try {
    // Import the createMessageLog function dynamically to avoid circular dependencies
    const { createMessageLog } = await import('./messaging-service');

    // Send the SMS
    const result = await sendSMS(phoneNumber, content);

    // Log the result
    await createMessageLog({
      message_id: messageId,
      recipient_id: recipientId,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error
    });
  } catch (error) {
    console.error('Error sending and logging message:', error);

    // Import the createMessageLog function dynamically to avoid circular dependencies
    try {
      const { createMessageLog } = await import('./messaging-service');

      // Log the error
      await createMessageLog({
        message_id: messageId,
        recipient_id: recipientId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (logError) {
      console.error('Failed to log message error:', logError);
    }
  }
}