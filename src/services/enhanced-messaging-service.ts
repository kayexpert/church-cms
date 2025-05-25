/**
 * Enhanced Messaging Service
 *
 * This service provides improved reliability for message creation and sending
 * by using the create-and-send endpoint.
 */

import { Message, MessageRecipient, MessageFormValues } from '@/types/messaging';
import { ServiceResponse } from '@/types/service';
import { getDefaultSMSConfig as getSMSConfig, sendSMSWithConfig } from './sms-service';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';
import { personalizeMessage } from '@/utils/message-utils';

/**
 * Create a new message with recipients and optionally send it immediately
 */
// Track messages that are currently being sent to prevent duplicates
const pendingMessages = new Set<string>();

export async function createAndSendMessage(
  message: Omit<Message, 'id' | 'created_at' | 'updated_at'>,
  recipients: Omit<MessageRecipient, 'id' | 'message_id' | 'created_at'>[],
  sendNow: boolean = false
): Promise<ServiceResponse<Message>> {
  try {
    console.log('Creating message with enhanced service:', message);
    console.log('Recipients:', recipients);

    // Create a unique key for this message to prevent duplicates
    const messageKey = `${message.name}-${message.content}-${JSON.stringify(recipients.map(r => r.recipient_id))}`;

    // Check if this message is already being sent
    if (pendingMessages.has(messageKey)) {
      console.log('This message is already being processed. Preventing duplicate send.');
      return {
        data: null,
        error: new Error('This message is already being processed. Please wait for it to complete.')
      };
    }

    // Mark this message as pending
    pendingMessages.add(messageKey);

    // Set a timeout to remove the message from pending after 30 seconds
    // This is a safety mechanism in case the finally block doesn't execute
    setTimeout(() => {
      pendingMessages.delete(messageKey);
    }, 30000);

    // If we're going to send the message, check if an SMS configuration exists
    if (sendNow) {
      const configCheck = await checkSMSConfig();

      if (!configCheck.success) {
        console.warn('SMS configuration check failed:', configCheck.error);

        // If no provider is configured, return an error
        if (configCheck.errorType === 'no_provider') {
          return {
            data: null,
            error: new Error(configCheck.error || 'No SMS provider configured. Please set up an SMS provider in the messaging settings.'),
            noProviderConfigured: true
          };
        }

        // For other errors, we'll try to send anyway
        console.warn('Will try to send anyway despite configuration check failure');
      }
    }

    // Check if we have group recipients
    const groupRecipients = recipients.filter(r => r.recipient_type === 'group');
    const individualRecipients = recipients.filter(r => r.recipient_type === 'individual');

    // Track results for all recipients
    const results: { success: boolean; message?: Message; error?: Error }[] = [];

    // Process group recipients first if sending now (for bulk messaging)
    if (sendNow && groupRecipients.length > 0) {
      console.log(`Processing ${groupRecipients.length} group recipients with bulk messaging`);

      // Flag to track if we've already processed group recipients
      const processedGroupIds = new Set<string>();

      for (const groupRecipient of groupRecipients) {
        // Skip if we've already processed this group
        if (processedGroupIds.has(groupRecipient.recipient_id)) {
          console.log(`Skipping duplicate processing of group ${groupRecipient.recipient_id}`);
          continue;
        }

        // Mark this group as processed
        processedGroupIds.add(groupRecipient.recipient_id);

        try {
          // Create the message first
          const createResponse = await fetch('/api/messaging/create-and-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: message.name,
              content: message.content,
              recipientId: groupRecipient.recipient_id,
              recipientType: 'group',
              type: message.type || 'group', // Ensure we pass the message type
              schedule_time: message.schedule_time,
              sendNow: false // Create the message but don't send it yet
            }),
          });

          const createData = await createResponse.json();

          if (!createResponse.ok || !createData.success) {
            console.error('Error creating group message:', createData.error || 'Unknown error');
            results.push({
              success: false,
              error: new Error(createData.error || 'Failed to create group message')
            });
            continue;
          }

          // Message created successfully, now get all members in the group
          console.log(`Getting members for group ${groupRecipient.recipient_id}`);

          try {
            const groupMembersResponse = await fetch(`/api/groups/${groupRecipient.recipient_id}/members`);

            // Log the response status
            console.log(`Group members API response status: ${groupMembersResponse.status}`);

            // If the response is not OK, try to get the error details
            if (!groupMembersResponse.ok) {
              let errorMessage = `HTTP error ${groupMembersResponse.status}`;

              try {
                const errorData = await groupMembersResponse.json();
                console.error(`Error getting members for group ${groupRecipient.recipient_id}:`, errorData);
                errorMessage = errorData.error || errorData.details || errorMessage;
              } catch (parseError) {
                console.error('Error parsing error response:', parseError);
              }

              results.push({
                success: false,
                error: new Error(`Failed to get members for group ${groupRecipient.recipient_id}: ${errorMessage}`)
              });
              continue;
            }

            // Parse the response
            const groupMembersData = await groupMembersResponse.json();

            // Log the response data
            console.log(`Group members API response:`, {
              success: groupMembersData.success,
              memberCount: groupMembersData.data?.length || 0,
              stats: groupMembersData.stats
            });

            // Check if the response is valid
            if (!groupMembersData.success || !groupMembersData.data || groupMembersData.data.length === 0) {
              console.error(`No members found in group ${groupRecipient.recipient_id}`);
              results.push({
                success: false,
                error: new Error(`No members found in group ${groupRecipient.recipient_id}`)
              });
              continue;
            }

            // The API already filters for active members, but we'll double-check
            const validMembers = groupMembersData.data.filter(
              (m: any) => m && m.status === 'active' && m.primary_phone_number
            );

            // Log the valid members count
            console.log(`Found ${validMembers.length} valid members with phone numbers in group ${groupRecipient.recipient_id}`);

            if (validMembers.length === 0) {
              console.error(`No active members with phone numbers found in group ${groupRecipient.recipient_id}`);
              results.push({
                success: false,
                error: new Error(`No active members with phone numbers found in group ${groupRecipient.recipient_id}`)
              });
              continue;
            }

            console.log(`Found ${validMembers.length} valid members in group ${groupRecipient.recipient_id}`);

            // Extract phone numbers for bulk sending and validate them
            const phoneNumbers: string[] = [];
            const memberIds: string[] = [];
            const invalidPhoneNumbers: {memberId: string, phoneNumber: string, reason: string}[] = [];

            // Validate each phone number before adding it to the list
            validMembers.forEach((m: any) => {
              try {
                if (!m.primary_phone_number) {
                  console.warn(`Member ${m.id} (${m.first_name} ${m.last_name}) has no phone number`);
                  invalidPhoneNumbers.push({
                    memberId: m.id,
                    phoneNumber: '',
                    reason: 'No phone number'
                  });
                  return; // Skip this member
                }

                // Validate the phone number
                if (isValidPhoneNumber(m.primary_phone_number)) {
                  // Normalize the phone number
                  const normalizedPhone = normalizePhoneNumber(m.primary_phone_number);
                  phoneNumbers.push(normalizedPhone);
                  memberIds.push(m.id);
                } else {
                  console.warn(`Invalid phone number format for member ${m.id}: ${m.primary_phone_number}`);
                  invalidPhoneNumbers.push({
                    memberId: m.id,
                    phoneNumber: m.primary_phone_number,
                    reason: 'Invalid format'
                  });
                }
              } catch (error) {
                console.error(`Error normalizing phone number for member ${m.id}:`, error);
                invalidPhoneNumbers.push({
                  memberId: m.id,
                  phoneNumber: m.primary_phone_number || '',
                  reason: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            });

            // Log any invalid phone numbers
            if (invalidPhoneNumbers.length > 0) {
              console.warn(`Found ${invalidPhoneNumbers.length} invalid phone numbers in group ${groupRecipient.recipient_id}`);

              // Group by reason for better reporting
              const byReason = invalidPhoneNumbers.reduce((acc, curr) => {
                acc[curr.reason] = (acc[curr.reason] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              console.warn('Invalid phone numbers by reason:', byReason);
              console.warn('First 5 invalid phone numbers:', invalidPhoneNumbers.slice(0, 5));
            }

            // Check if we have any valid phone numbers after validation
            if (phoneNumbers.length === 0) {
              console.error(`No valid phone numbers found in group ${groupRecipient.recipient_id} after validation`);
              results.push({
                success: false,
                error: new Error(`No valid phone numbers found in group ${groupRecipient.recipient_id} after validation`)
              });
              continue;
            }

            console.log(`Found ${phoneNumbers.length} valid phone numbers in group ${groupRecipient.recipient_id} after validation`);

            // Get the SMS configuration
            const { success: configSuccess, config } = await getSMSConfig();

            if (!configSuccess || !config) {
              console.error('Failed to get SMS configuration for bulk send');
              results.push({
                success: false,
                error: new Error('Failed to get SMS configuration for bulk send')
              });
              continue;
            }

            // Send the message in bulk
            console.time(`bulk-send-group-${groupRecipient.recipient_id}`);
            console.log(`Sending bulk message to ${phoneNumbers.length} members in group ${groupRecipient.recipient_id}`);

            // Create a unique message ID for this bulk send to prevent duplicates
            const bulkMessageId = `BULK_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            console.log(`Generated unique bulk message ID: ${bulkMessageId}`);

            let bulkSendResult;
            try {
              // Check if we already have logs for this message and these recipients
              // This helps prevent duplicate sends
              const existingLogsPromises = memberIds.map(async (memberId) => {
                try {
                  const response = await fetch(`/api/messaging/check-log?message_id=${createData.message.id}&recipient_id=${memberId}`);
                  if (response.ok) {
                    const data = await response.json();
                    return data.exists;
                  }
                  return false;
                } catch (error) {
                  console.error(`Error checking log for member ${memberId}:`, error);
                  return false;
                }
              });

              const existingLogs = await Promise.all(existingLogsPromises);
              const hasExistingLogs = existingLogs.some(exists => exists);

              if (hasExistingLogs) {
                console.warn(`Found existing logs for message ${createData.message.id}. Skipping bulk send to prevent duplicates.`);
                bulkSendResult = {
                  success: true,
                  messageId: bulkMessageId,
                  message: "Skipped sending to prevent duplicates",
                  bulkDetails: {
                    totalSent: phoneNumbers.length,
                    totalFailed: 0,
                    destinations: phoneNumbers.map((phone, i) => ({
                      destination: phone,
                      messageId: `SKIP_${bulkMessageId}_${i}`,
                      status: 'sent',
                      skipped: true
                    }))
                  }
                };
              } else {
                // No existing logs found, proceed with the send

                // IMPORTANT: We need to disable the bulk send and instead send messages individually
                // with proper personalization to prevent the duplicate message issue
                console.log(`Sending personalized messages to ${validMembers.length} members individually instead of bulk send`);

                // Prepare personalized messages for each member
                const personalizedMessages: string[] = [];

                // Create personalized messages for each member
                for (let i = 0; i < validMembers.length; i++) {
                  const member = validMembers[i];
                  // Personalize the message for this member
                  const personalizedContent = personalizeMessage(message.content, member);
                  personalizedMessages.push(personalizedContent);

                  console.log(`Personalized message for ${member.first_name} ${member.last_name}:`, {
                    originalContent: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
                    personalizedContent: personalizedContent.substring(0, 30) + (personalizedContent.length > 30 ? '...' : ''),
                    hasPersonalization: personalizedContent !== message.content
                  });
                }

                // Send messages individually with personalization
                const bulkResults: any[] = [];
                let totalSentCount = 0;
                let totalFailedCount = 0;

                for (let i = 0; i < phoneNumbers.length; i++) {
                  try {
                    const memberId = memberIds[i];

                    // Check for existing message logs to prevent duplicates
                    try {
                      const response = await fetch(`/api/messaging/check-log?message_id=${createData.message.id}&recipient_id=${memberId}`);
                      if (response.ok) {
                        const data = await response.json();
                        if (data.exists) {
                          console.log(`Message ${createData.message.id} already sent to member ${memberId}. Skipping to prevent duplicate.`);

                          // Add a skipped result
                          bulkResults.push({
                            destination: phoneNumbers[i],
                            status: 'skipped',
                            messageId: `SKIP_${Date.now()}_${i}`,
                            skipped: true
                          });

                          // Count as sent to avoid retries
                          totalSentCount++;
                          continue;
                        }
                      }
                    } catch (checkError) {
                      console.error(`Error checking message log for member ${memberId}:`, checkError);
                      // Continue with the send even if the check fails
                    }

                    // Send the message
                    const result = await sendSMSWithConfig(
                      config,
                      phoneNumbers[i],
                      personalizedMessages[i],
                      config.sender_id
                    );

                    bulkResults.push({
                      destination: phoneNumbers[i],
                      status: result.success ? 'sent' : 'failed',
                      error: result.error,
                      messageId: result.messageId
                    });

                    if (result.success) {
                      totalSentCount++;
                    } else {
                      totalFailedCount++;
                    }
                  } catch (error) {
                    bulkResults.push({
                      destination: phoneNumbers[i],
                      status: 'failed',
                      error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    totalFailedCount++;
                  }
                }

                // Create a mock bulk result to match the expected format
                bulkSendResult = {
                  success: totalSentCount > 0,
                  messageId: `bulk_${Date.now()}`,
                  message: "Messages sent individually with personalization",
                  bulkDetails: {
                    totalSent: totalSentCount,
                    totalFailed: totalFailedCount,
                    destinations: bulkResults
                  }
                };

                console.timeEnd(`bulk-send-group-${groupRecipient.recipient_id}`);

                if (!bulkSendResult) {
                  throw new Error("No result returned from individual sends");
                }
              }
            } catch (bulkSendError) {
              console.error(`Error in bulk send to group ${groupRecipient.recipient_id}:`, bulkSendError);

              // Create a result object with the error
              bulkSendResult = {
                success: false,
                error: bulkSendError instanceof Error ? bulkSendError.message : String(bulkSendError),
                messageId: `ERROR_${Date.now()}`,
                bulkDetails: {
                  totalSent: 0,
                  totalFailed: phoneNumbers.length,
                  destinations: phoneNumbers.map(phone => ({
                    destination: phone,
                    messageId: `ERROR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    status: 'failed',
                    error: bulkSendError instanceof Error ? bulkSendError.message : String(bulkSendError)
                  }))
                }
              };
            }

            if (bulkSendResult && bulkSendResult.success) {
              console.log(`Successfully sent bulk message to group ${groupRecipient.recipient_id}`);

              // Create message logs for each member
              // Use batching to avoid too many concurrent requests
              const batchSize = 10;
              const batches = [];

              // Split memberIds into batches
              for (let i = 0; i < memberIds.length; i += batchSize) {
                batches.push(memberIds.slice(i, i + batchSize));
              }

              console.log(`Processing ${batches.length} batches of message logs`);

              // Process each batch sequentially
              for (const batch of batches) {
                const batchPromises = batch.map(async (memberId: string) => {
                  const index = memberIds.indexOf(memberId);
                  const phoneNumber = phoneNumbers[index];

                  // Find the destination result for this phone number if available
                  const destinationResult = bulkSendResult.bulkDetails?.destinations?.find(
                    d => d.destination === phoneNumber
                  );

                  const status = destinationResult?.status === 'failed' ? 'failed' : 'sent';
                  const errorMessage = destinationResult?.error;

                  try {
                    // Create a log entry
                    const response = await fetch('/api/messaging/logs', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        message_id: createData.message.id,
                        recipient_id: memberId,
                        status,
                        error_message: errorMessage,
                        message_id_from_provider: destinationResult?.messageId || bulkSendResult.messageId
                      }),
                    });

                    if (!response.ok) {
                      console.warn(`Failed to create message log for member ${memberId}: ${response.status}`);
                    }

                    return response.ok;
                  } catch (logError) {
                    console.error(`Error creating message log for member ${memberId}:`, logError);
                    return false;
                  }
                });

                // Wait for the current batch to complete before moving to the next
                await Promise.all(batchPromises);
              }

              console.log(`Finished creating message logs for group ${groupRecipient.recipient_id}`);

              // Add the result with detailed statistics
              results.push({
                success: true,
                message: {
                  ...createData.message,
                  bulkSendStats: {
                    totalSent: bulkSendResult.bulkDetails?.totalSent || phoneNumbers.length,
                    totalFailed: bulkSendResult.bulkDetails?.totalFailed || 0,
                    totalRecipients: phoneNumbers.length,
                    invalidCount: invalidPhoneNumbers.length,
                    validCount: phoneNumbers.length
                  }
                }
              });
            } else {
              console.error(`Error sending bulk message to group ${groupRecipient.recipient_id}:`, bulkSendResult.error);

              // Create failure logs for each member
              const logsPromises = memberIds.map(async (memberId: string) => {
                return fetch('/api/messaging/logs', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message_id: createData.message.id,
                    recipient_id: memberId,
                    status: 'failed',
                    error_message: bulkSendResult.error || 'Bulk send failed'
                  }),
                });
              });

              // Wait for all logs to be created
              await Promise.all(logsPromises);

              // Add the result
              results.push({
                success: false,
                error: new Error(bulkSendResult.error || 'Failed to send bulk message'),
                message: createData.message
              });

              // If bulk send fails, try to send individually as a fallback
              console.log(`Attempting individual sends as fallback for group ${groupRecipient.recipient_id}`);

              let sentCount = 0;
              let failedCount = 0;

              // Only try the first 5 members to avoid overwhelming the system
              const maxFallbackAttempts = Math.min(5, validMembers.length);
              const fallbackMembers = validMembers.slice(0, maxFallbackAttempts);

              console.log(`Will attempt to send to ${maxFallbackAttempts} members as fallback`);

              for (const member of fallbackMembers) {
                try {
                  // Validate the phone number
                  if (!isValidPhoneNumber(member.primary_phone_number)) {
                    console.warn(`Invalid phone number format for member ${member.id}: ${member.primary_phone_number}`);
                    failedCount++;
                    continue;
                  }

                  // Normalize the phone number
                  const normalizedPhone = normalizePhoneNumber(member.primary_phone_number);

                  // Try to send to this member individually
                  const individualResult = await sendSMSWithConfig(
                    config,
                    normalizedPhone,
                    message.content
                  );

                  if (individualResult.success) {
                    sentCount++;

                    // Create a log entry for this successful send
                    await fetch('/api/messaging/logs', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        message_id: createData.message.id,
                        recipient_id: member.id,
                        status: 'sent',
                        message_id_from_provider: individualResult.messageId
                      }),
                    });
                  } else {
                    failedCount++;
                  }
                } catch (individualError) {
                  console.error(`Error sending individual message to member ${member.id}:`, individualError);
                  failedCount++;
                }
              }

              console.log(`Fallback results: ${sentCount} sent, ${failedCount} failed`);

              if (sentCount > 0) {
                // If at least one message was sent successfully, update the result
                results[results.length - 1] = {
                  success: true,
                  message: {
                    ...createData.message,
                    fallbackStats: {
                      attempted: maxFallbackAttempts,
                      sent: sentCount,
                      failed: failedCount
                    }
                  }
                };
              }
            }
          } catch (fetchError) {
            console.error(`Error in bulk send process for group ${groupRecipient.recipient_id}:`, fetchError);
            results.push({
              success: false,
              error: fetchError instanceof Error ? fetchError : new Error(`Error in bulk send process for group ${groupRecipient.recipient_id}`)
            });
          }
        } catch (groupError) {
          console.error(`Error processing group ${groupRecipient.recipient_id}:`, groupError);
          results.push({
            success: false,
            error: groupError instanceof Error ? groupError : new Error(`Error processing group ${groupRecipient.recipient_id}`)
          });
        }
      }
    }

    // Process individual recipients
    if (individualRecipients.length > 0) {
      console.log(`Processing ${individualRecipients.length} individual recipients`);

      for (const recipient of individualRecipients) {
        try {
          // Call the create-and-send endpoint
          const response = await fetch('/api/messaging/create-and-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: message.name,
              content: message.content,
              recipientId: recipient.recipient_id,
              recipientType: 'individual',
              schedule_time: message.schedule_time,
              sendNow
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            console.error('Error creating/sending message:', data.error || 'Unknown error', data.details || '');

            // Handle specific error types
            if (data.errorType === 'member_not_found') {
              console.error(`Member ${recipient.recipient_id} not found. Skipping this recipient.`);
              results.push({
                success: false,
                error: new Error(`Member not found: ${data.details || 'Member does not exist in the database'}`)
              });
              continue;
            }

            if (data.errorType === 'member_inactive') {
              console.error(`Member ${recipient.recipient_id} is not active. Skipping this recipient.`);
              results.push({
                success: false,
                error: new Error(`Member is not active: ${data.details || 'Member is not active and cannot receive messages'}`)
              });
              continue;
            }

            if (data.errorType === 'no_phone_number') {
              console.error(`Member ${recipient.recipient_id} has no phone number. Skipping this recipient.`);
              results.push({
                success: false,
                error: new Error(`Member has no phone number: ${data.details || 'Member does not have a phone number and cannot receive SMS messages'}`)
              });
              continue;
            }

            if (data.errorType === 'invalid_phone_number') {
              console.error(`Member ${recipient.recipient_id} has an invalid phone number. Skipping this recipient.`);
              results.push({
                success: false,
                error: new Error(`Invalid phone number: ${data.details || 'Member has an invalid phone number format and cannot receive SMS messages'}`)
              });
              continue;
            }

            // If the error is related to SMS configuration and we're sending now, try to fix it and retry
            if (sendNow && data.error && data.error.includes('SMS configuration')) {
              console.log('Error related to SMS configuration, trying to fix and retry');

              // Try to check SMS configuration again
              const retryConfigCheck = await checkSMSConfig();

              if (retryConfigCheck.success) {
                console.log('SMS configuration verified, retrying send');

                // Retry the send
                const retryResponse = await fetch('/api/messaging/create-and-send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: message.name,
                    content: message.content,
                    recipientId: recipient.recipient_id,
                    recipientType: 'individual',
                    schedule_time: message.schedule_time,
                    sendNow
                  }),
                });

                const retryData = await retryResponse.json();

                if (retryResponse.ok && retryData.success) {
                  console.log('Retry successful');
                  results.push({ success: true, message: retryData.message });
                  continue;
                }

                console.error('Retry failed:', retryData.error || 'Unknown error');
              }
            }

            results.push({
              success: false,
              error: new Error(data.error || 'Failed to create/send message')
            });
            continue;
          }

          results.push({ success: true, message: data.message });
        } catch (recipientError) {
          console.error('Error processing recipient:', recipientError);
          results.push({
            success: false,
            error: recipientError instanceof Error ? recipientError : new Error('Unknown error')
          });
        }
      }
    }

    // If we have group recipients but we're not sending now, process them normally
    if (!sendNow && groupRecipients.length > 0) {
      console.log(`Processing ${groupRecipients.length} group recipients (create only)`);

      // Flag to track if we've already processed group recipients
      const processedGroupIds = new Set<string>();

      for (const recipient of groupRecipients) {
        // Skip if we've already processed this group
        if (processedGroupIds.has(recipient.recipient_id)) {
          console.log(`Skipping duplicate processing of group ${recipient.recipient_id}`);
          continue;
        }

        // Mark this group as processed
        processedGroupIds.add(recipient.recipient_id);

        try {
          // Call the create-and-send endpoint
          const response = await fetch('/api/messaging/create-and-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: message.name,
              content: message.content,
              recipientId: recipient.recipient_id,
              recipientType: 'group',
              type: message.type || 'group', // Ensure we pass the message type
              schedule_time: message.schedule_time,
              sendNow: false
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            console.error('Error creating group message:', data.error || 'Unknown error');
            results.push({
              success: false,
              error: new Error(data.error || 'Failed to create group message')
            });
            continue;
          }

          results.push({ success: true, message: data.message });
        } catch (recipientError) {
          console.error('Error processing group recipient:', recipientError);
          results.push({
            success: false,
            error: recipientError instanceof Error ? recipientError : new Error('Unknown error')
          });
        }
      }
    }

    // Check if all operations failed
    if (results.length > 0 && results.every(result => !result.success)) {
      return {
        data: null,
        error: new Error('Failed to create/send message for all recipients')
      };
    }

    // Special case for birthday messages (they'll be determined later)
    // Note: We're using 'group' type for birthday messages due to database constraints
    if (message.name.toLowerCase().includes('birthday') || message.content.toLowerCase().includes('birthday')) {
      console.log('Creating birthday message with no immediate recipients');

      // Create the message directly via API
      try {
        const response = await fetch('/api/messaging/create-birthday-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: message.name,
            content: message.content,
            type: 'group', // Using 'group' instead of 'birthday' due to database constraint
            frequency: message.frequency,
            schedule_time: message.schedule_time,
            days_before: message.days_before || 0
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error('Error creating birthday message:', data.error || 'Unknown error');
          return {
            data: null,
            error: new Error(data.error || 'Failed to create birthday message')
          };
        }

        return {
          data: data.message,
          error: null
        };
      } catch (error) {
        console.error('Error creating birthday message:', error);
        return {
          data: null,
          error: error instanceof Error ? error : new Error('Unknown error creating birthday message')
        };
      }
    }

    // Return the first successful message
    const successfulResult = results.find(result => result.success);
    if (successfulResult && successfulResult.message) {
      // Check if there's a mock warning in the response
      const mockWarning = results.some(result => {
        // Check if result has a mockWarning property
        if (result.success && typeof result === 'object' && result !== null && 'mockWarning' in result) {
          return true;
        }

        // Check if message has a smsProvider property with isMock
        if (result.success && result.message &&
            typeof result.message === 'object' && result.message !== null &&
            'smsProvider' in result.message &&
            result.message.smsProvider &&
            typeof result.message.smsProvider === 'object' && result.message.smsProvider !== null &&
            'isMock' in result.message.smsProvider &&
            result.message.smsProvider.isMock === true) {
          return true;
        }

        return false;
      });

      // Create a response object with the message data
      const responseData = {
        ...successfulResult.message
      };

      // Add mockWarning as a non-typed property
      if (mockWarning) {
        (responseData as any).mockWarning = 'Using mock SMS provider - no actual SMS was sent';
      }

      return {
        data: responseData,
        error: null
      };
    }

    // This should not happen if we checked for all failures above
    return { data: null, error: new Error('No successful message creation') };
  } catch (error) {
    console.error('Error in createAndSendMessage:', error);
    return { data: null, error: error as Error };
  } finally {
    // Clean up: remove the message from pending and clear the timeout
    const messageKey = `${message.name}-${message.content}-${JSON.stringify(recipients.map(r => r.recipient_id))}`;
    pendingMessages.delete(messageKey);
    // No need to clear the timeout as it's just a safety mechanism
  }
}

/**
 * Convert MessageFormValues to Message and Recipients
 */
export function convertFormValuesToMessageData(values: MessageFormValues): {
  message: Omit<Message, 'id' | 'created_at' | 'updated_at'>;
  recipients: Omit<MessageRecipient, 'id' | 'message_id' | 'created_at'>[];
} {
  // Convert form values to message
  const message: Omit<Message, 'id' | 'created_at' | 'updated_at'> = {
    name: values.name,
    content: values.content,
    type: values.type,
    frequency: values.frequency,
    schedule_time: values.schedule_time.toISOString(),
    end_date: values.end_date ? values.end_date.toISOString() : undefined,
    status: values.status
  };

  // Add days_before for birthday messages
  if (values.type === 'birthday' && values.days_before !== undefined) {
    message.days_before = values.days_before;
  }

  // Create recipients array
  const recipients: Omit<MessageRecipient, 'id' | 'message_id' | 'created_at'>[] =
    // For birthday messages, we don't need specific recipients as they're determined by birthdays
    values.type === 'birthday'
      ? []
      : values.recipients.ids.map(id => ({
          recipient_type: values.recipients.type,
          recipient_id: id
        }));

  return { message, recipients };
}

/**
 * Create a new message with recipients using the enhanced service
 */
export async function createEnhancedMessage(
  values: MessageFormValues,
  sendNow: boolean = false
): Promise<ServiceResponse<Message>> {
  try {
    const { message, recipients } = convertFormValuesToMessageData(values);
    return await createAndSendMessage(message, recipients, sendNow);
  } catch (error) {
    console.error('Error in createEnhancedMessage:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Check if an SMS configuration exists and prioritize real providers
 * @returns Object with success status and error message if applicable
 */
async function checkSMSConfig(): Promise<{ success: boolean; error?: string; errorType?: string }> {
  try {
    console.log('Checking SMS configuration');

    // First, call the ensure-sms-config endpoint to check if a configuration exists
    const ensureResponse = await fetch('/api/messaging/ensure-sms-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const ensureData = await ensureResponse.json();

    // If no provider is configured, return an error
    if (ensureResponse.status === 404 && ensureData.errorType === 'no_provider') {
      console.warn('No SMS provider configured:', ensureData.message);
      return {
        success: false,
        error: ensureData.message || 'No SMS provider configured. Please set up an SMS provider in the messaging settings.',
        errorType: 'no_provider'
      };
    }

    if (!ensureResponse.ok || !ensureData.success) {
      console.error('Error checking SMS configuration:', ensureData.error || 'Unknown error');
      return {
        success: false,
        error: ensureData.error || 'Error checking SMS configuration'
      };
    }

    console.log('SMS configuration checked:', ensureData.message);

    // Now, call the prioritize-real-provider endpoint to make sure we're using a real provider if available
    console.log('Prioritizing real SMS providers');
    const prioritizeResponse = await fetch('/api/messaging/prioritize-real-provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const prioritizeData = await prioritizeResponse.json();

    if (!prioritizeResponse.ok || !prioritizeData.success) {
      // If no real provider is found, return an error
      if (prioritizeResponse.status === 404 && prioritizeData.error === 'No real SMS providers found') {
        console.warn('No real SMS providers found:', prioritizeData.message);
        return {
          success: false,
          error: 'No real SMS provider configured. Please set up a real SMS provider in the messaging settings.',
          errorType: 'no_real_provider'
        };
      }

      console.warn('Could not prioritize real SMS providers:', prioritizeData.error || prioritizeData.message || 'Unknown error');
      // Continue anyway, we might have a provider
    } else {
      console.log('SMS provider prioritized:', prioritizeData.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in checkSMSConfig:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking SMS configuration'
    };
  }
}

/**
 * Send an existing message immediately
 */
export async function sendMessageImmediately(message: Message): Promise<ServiceResponse<Message>> {
  try {
    console.log('Sending message immediately:', message);

    // First, check if an SMS configuration exists
    const configCheck = await checkSMSConfig();

    if (!configCheck.success) {
      console.warn('SMS configuration check failed:', configCheck.error);

      // If no provider is configured, return an error
      if (configCheck.errorType === 'no_provider') {
        return {
          data: null,
          error: new Error(configCheck.error || 'No SMS provider configured. Please set up an SMS provider in the messaging settings.'),
          noProviderConfigured: true
        };
      }

      // For other errors, we'll try to send anyway
      console.warn('Will try to send anyway despite configuration check failure');
    }

    // Call the create-and-send endpoint to create a new message with the same content
    const response = await fetch('/api/messaging/create-and-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: message.name,
        content: message.content,
        schedule_time: message.schedule_time,
        sendNow: true
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error sending message:', data.error || 'Unknown error');

      // If the error is related to SMS configuration, try to fix it and retry
      if (data.error && data.error.includes('SMS configuration')) {
        console.log('Error related to SMS configuration, trying to fix and retry');

        // Try to check SMS configuration again
        const retryConfigCheck = await checkSMSConfig();

        if (retryConfigCheck.success) {
          console.log('SMS configuration verified, retrying send');

          // Retry the send
          const retryResponse = await fetch('/api/messaging/create-and-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: message.name,
              content: message.content,
              schedule_time: message.schedule_time,
              sendNow: true
            }),
          });

          const retryData = await retryResponse.json();

          if (retryResponse.ok && retryData.success) {
            console.log('Retry successful');
            // Check if there's a mock warning in the retry response
            const isMockProvider = retryData.mockWarning || (retryData.smsProvider?.isMock === true);

            return {
              data: {
                ...retryData.message,
                mockWarning: isMockProvider ? retryData.mockWarning || 'Using mock SMS provider - no actual SMS was sent' : undefined,
                smsProvider: retryData.smsProvider
              },
              error: null
            };
          }

          console.error('Retry failed:', retryData.error || 'Unknown error');
        }
      }

      return {
        data: null,
        error: new Error(data.error || 'Failed to send message')
      };
    }

    // Check if there's a mock warning in the response
    const isMockProvider = data.mockWarning || (data.smsProvider?.isMock === true);

    return {
      data: {
        ...data.message,
        mockWarning: isMockProvider ? data.mockWarning || 'Using mock SMS provider - no actual SMS was sent' : undefined,
        smsProvider: data.smsProvider
      },
      error: null
    };
  } catch (error) {
    console.error('Error in sendMessageImmediately:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Special handling for birthday messages
 * This function creates a birthday message without requiring explicit recipients
 */
export async function createBirthdayMessage(
  values: MessageFormValues
): Promise<ServiceResponse<Message>> {
  try {
    console.log('Creating birthday message with direct API call:', values);

    // Ensure the type is set to group (using 'group' instead of 'birthday' due to database constraint)
    values.type = 'group';

    // Set default days_before if not provided
    if (values.days_before === undefined) {
      values.days_before = 0;
    }

    // Ensure recipients is properly structured
    // Since we're using 'group' type, we need to provide at least one recipient
    values.recipients = {
      type: 'group',
      ids: ['00000000-0000-0000-0000-000000000000'] // Dummy ID to pass validation
    };

    // Call the birthday message API directly
    try {
      const response = await fetch('/api/messaging/create-birthday-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          content: values.content,
          type: 'group', // Using 'group' instead of 'birthday' due to database constraint
          frequency: 'monthly', // Using monthly instead of yearly due to database constraint
          schedule_time: values.schedule_time,
          days_before: values.days_before
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Error creating birthday message:', data.error || 'Unknown error');
        return {
          data: null,
          error: new Error(data.error || 'Failed to create birthday message')
        };
      }

      console.log('Birthday message created successfully:', data.message);

      return {
        data: data.message,
        error: null
      };
    } catch (apiError) {
      console.error('API error creating birthday message:', apiError);
      return {
        data: null,
        error: apiError instanceof Error ? apiError : new Error('Unknown error creating birthday message')
      };
    }
  } catch (error) {
    console.error('Error in createBirthdayMessage:', error);
    return { data: null, error: error as Error };
  }
}