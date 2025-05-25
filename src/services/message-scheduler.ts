/**
 * Message Scheduler Service
 *
 * This service handles the scheduling and sending of messages based on their frequency settings.
 * It runs in the browser and periodically checks for messages that need to be sent.
 */

import { supabase } from '@/lib/supabase';
import { config } from '@/lib/config';
import { Message, MessageRecipient } from '@/types/messaging';
import { sendAndLogMessage, getDefaultSMSConfig, sendSMSWithConfig } from './sms-service';
import { getMembersByIds, getMembersByGroupId, createMessageLog } from './messaging-service';
import { processBirthdayMessagesForDate } from './birthday-message-service';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';
import { personalizeMessage } from '@/utils/message-utils';

// Track if the scheduler is running
let isSchedulerRunning = false;

// Store the interval ID for cleanup
let schedulerIntervalId: NodeJS.Timeout | null = null;

/**
 * Start the message scheduler
 * This should be called when the application starts
 */
export function startMessageScheduler() {
  if (isSchedulerRunning) {
    console.log('Message scheduler is already running');
    return;
  }

  console.log('Starting message scheduler in development mode');

  // Set the interval to check for messages to send
  schedulerIntervalId = setInterval(
    checkAndProcessScheduledMessages,
    config.sms?.scheduling?.checkInterval || 60000 // Default to 1 minute
  );

  isSchedulerRunning = true;

  // Run immediately on start in development mode
  checkAndProcessScheduledMessages();

  console.log('Message scheduler started in development mode. Will check and process messages every minute.');
}

/**
 * Stop the message scheduler
 * This should be called when the application is shutting down
 */
export function stopMessageScheduler() {
  if (!isSchedulerRunning || !schedulerIntervalId) {
    console.log('Message scheduler is not running');
    return;
  }

  console.log('Stopping message scheduler');

  clearInterval(schedulerIntervalId);
  schedulerIntervalId = null;
  isSchedulerRunning = false;
}

// Track if a check is currently in progress to prevent overlapping executions
let isCheckingMessages = false;

/**
 * Check for scheduled messages and process them directly
 * This function is used in development mode to process messages without relying on cron jobs
 */
async function checkAndProcessScheduledMessages() {
  if (isCheckingMessages) {
    console.log('Already checking for scheduled messages. Skipping this run.');
    return;
  }

  isCheckingMessages = true;

  try {
    console.log('Checking for scheduled messages to process');

    // Get current time
    const now = new Date();

    // Find messages that are ready to be sent (active or scheduled status)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .in('status', ['active', 'scheduled'])
      .not('type', 'eq', 'birthday')
      .lte('schedule_time', now.toISOString())
      .limit(5);

    if (error) {
      console.error('Error checking for scheduled messages:', error);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log('No scheduled messages to process');
      return;
    }

    console.log(`Found ${messages.length} messages ready to be processed`);

    // Process each message directly
    for (const message of messages) {
      try {
        console.log(`Processing message: ${message.name} (${message.id})`);

        // Mark the message as processing
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error(`Error marking message ${message.id} as processing:`, updateError);
          continue;
        }

        // Call the API endpoint to process this specific message
        const response = await fetch('/api/messaging/process-scheduled-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageId: message.id
          }),
        });

        if (!response.ok) {
          console.error(`Error processing message ${message.id}:`, response.statusText);

          // If there was an error, mark the message as error
          await supabase
            .from('messages')
            .update({
              status: 'error',
              error_message: `Failed to process: ${response.statusText}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);
        } else {
          const result = await response.json();
          console.log(`Message ${message.id} processed:`, result);
        }
      } catch (processError) {
        console.error(`Error processing message ${message.id}:`, processError);
      }
    }
  } catch (error) {
    console.error('Error in checkAndProcessScheduledMessages:', error);
  } finally {
    isCheckingMessages = false;
  }
}

/**
 * Monitor scheduled messages without processing them
 * This function only checks for scheduled messages and triggers the server-side cron job
 */
async function monitorScheduledMessages() {
  try {
    console.log('Monitoring scheduled messages');

    // Get current time
    const now = new Date();

    // Find messages that are ready to be sent (active or scheduled status)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, name, schedule_time, status')
      .in('status', ['active', 'scheduled'])
      .not('type', 'eq', 'birthday')
      .lte('schedule_time', now.toISOString())
      .limit(5);

    if (error) {
      console.error('Error checking for scheduled messages:', error);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log('No scheduled messages to process');
      return;
    }

    console.log(`Found ${messages.length} messages ready to be processed`);
    console.log('Messages will be processed by the server-side cron job');

    // Trigger the server-side cron job
    try {
      const response = await fetch('/api/messaging/process-scheduled-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Successfully triggered server-side message processing');
      } else {
        console.error('Failed to trigger server-side message processing:', response.statusText);
      }
    } catch (triggerError) {
      console.error('Error triggering server-side message processing:', triggerError);
    }
  } catch (error) {
    console.error('Error in monitorScheduledMessages:', error);
  }
}

/**
 * Check for scheduled messages that need to be sent
 * This function is kept for backward compatibility but is no longer used directly
 */
async function checkScheduledMessages() {
  // Prevent multiple concurrent executions
  if (isCheckingMessages) {
    console.log('Another check is already in progress. Skipping this execution.');
    return;
  }

  isCheckingMessages = true;

  try {
    console.log('Checking for scheduled messages');

    // Get current time
    const now = new Date();

    // Process birthday messages for today
    await processBirthdayMessagesForDate(now);

    // Find messages that are ready to be sent (active or scheduled status)
    // Messages with status 'inactive', 'pending', or 'processing' are skipped
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .in('status', ['active', 'scheduled']) // Include both active and scheduled messages
      .not('type', 'eq', 'birthday') // Exclude birthday messages as they're handled separately
      .lte('schedule_time', now.toISOString())
      .limit(config.sms?.scheduling?.batchSize || 10);

    if (error) {
      console.error('Error fetching scheduled messages:', error);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log('No scheduled messages to send');
      return;
    }

    console.log(`Found ${messages.length} messages to process`);

    // Process each message
    for (const message of messages) {
      await processMessage(message as Message);
    }
  } catch (error) {
    console.error('Error in checkScheduledMessages:', error);
  } finally {
    // Always reset the flag when done, even if there was an error
    isCheckingMessages = false;
    console.log('Message check completed, ready for next execution');
  }
}

/**
 * Process a single message
 * @param message The message to process
 */
async function processMessage(message: Message) {
  // Track if we've already marked the message as processing
  let markedAsProcessing = false;

  try {
    console.log(`Processing message: ${message.name} (${message.id})`);

    // Check if the message is already being processed
    if (message.status === 'processing') {
      console.log(`Message ${message.id} is already in processing state. Checking last updated time...`);

      // Check if the message has been in processing state for too long (more than 10 minutes)
      const lastUpdated = new Date(message.updated_at || message.created_at);
      const now = new Date();
      const processingTimeMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

      if (processingTimeMinutes > 10) {
        console.log(`Message ${message.id} has been processing for ${processingTimeMinutes.toFixed(2)} minutes. Resuming processing.`);
      } else {
        console.log(`Message ${message.id} has been processing for ${processingTimeMinutes.toFixed(2)} minutes. Skipping to avoid duplicate processing.`);
        return;
      }
    }

    // Get the recipients for this message
    const { data: recipients, error } = await supabase
      .from('message_recipients')
      .select('*')
      .eq('message_id', message.id);

    if (error) {
      console.error(`Error fetching recipients for message ${message.id}:`, error);
      throw new Error(`Failed to fetch recipients: ${error.message}`);
    }

    if (!recipients || recipients.length === 0) {
      console.log(`No recipients found for message ${message.id}`);

      // Update the message schedule based on frequency
      await updateMessageSchedule(message);
      return;
    }

    // Mark the message as processing before sending to prevent duplicate sends
    console.log(`Marking message ${message.id} as processing to prevent duplicate sends`);
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString() // Use updated_at instead of processing_started_at
      })
      .eq('id', message.id);

    if (updateError) {
      console.error(`Error marking message ${message.id} as processing:`, updateError);
      throw new Error(`Failed to mark message as processing: ${updateError.message}`);
    }

    markedAsProcessing = true;

    // Process each recipient
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of recipients) {
      try {
        await processRecipient(message, recipient as MessageRecipient);
        successCount++;
      } catch (recipientError) {
        console.error(`Error processing recipient ${recipient.id} for message ${message.id}:`, recipientError);
        failureCount++;

        // Continue processing other recipients even if one fails
        continue;
      }
    }

    console.log(`Message ${message.id} processing complete: ${successCount} successful, ${failureCount} failed`);

    // Update the message schedule based on frequency
    await updateMessageSchedule(message);
  } catch (error) {
    console.error(`Error processing message ${message.id}:`, error);

    // If there's an error, mark the message with an error status
    try {
      await supabase
        .from('messages')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error during processing'
        })
        .eq('id', message.id);
      console.log(`Message ${message.id} marked as error due to processing failure`);
    } catch (updateError) {
      console.error(`Error marking message ${message.id} as error:`, updateError);

      // Last resort - try a simpler update
      try {
        await supabase
          .from('messages')
          .update({ status: 'error' })
          .eq('id', message.id);
      } catch (finalError) {
        console.error(`Critical error updating message ${message.id} status:`, finalError);
      }
    }
  } finally {
    // If we marked the message as processing but didn't complete successfully,
    // make sure it's not left in a processing state
    if (markedAsProcessing && message.status === 'processing') {
      try {
        const { data: currentMessage } = await supabase
          .from('messages')
          .select('status')
          .eq('id', message.id)
          .single();

        if (currentMessage?.status === 'processing') {
          console.log(`Message ${message.id} is still in processing state in finally block. Marking as error.`);

          await supabase
            .from('messages')
            .update({
              status: 'error',
              error_message: 'Message processing did not complete properly'
            })
            .eq('id', message.id);
        }
      } catch (finalError) {
        console.error(`Error in finally block for message ${message.id}:`, finalError);
      }
    }
  }
}

/**
 * Process a single recipient
 * @param message The message to send
 * @param recipient The recipient information
 */
async function processRecipient(message: Message, recipient: MessageRecipient) {
  try {
    if (recipient.recipient_type === 'individual') {
      // Get the member
      const { data: members, error: memberError } = await getMembersByIds([recipient.recipient_id]);

      if (memberError) {
        console.error(`Error getting member ${recipient.recipient_id}:`, memberError);
        return;
      }

      if (!members || members.length === 0) {
        console.error(`Member ${recipient.recipient_id} not found or not active`);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: recipient.recipient_id,
          status: 'failed',
          error_message: `Member not found or not active: ${recipient.recipient_id}`
        });

        return;
      }

      const member = members[0];

      // Check if the member has a phone number
      if (!member.primary_phone_number) {
        console.error(`Member ${member.id} (${member.first_name} ${member.last_name}) does not have a phone number`);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: recipient.recipient_id,
          status: 'failed',
          error_message: `Member ${member.first_name} ${member.last_name} does not have a phone number`
        });

        return;
      }

      // Get the default SMS configuration
      const { success: configSuccess, config, error: configError } = await getDefaultSMSConfig();

      if (!configSuccess || !config) {
        console.error(`Error getting SMS configuration for member ${member.id}:`, configError);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: member.id,
          status: 'failed',
          error_message: `Error getting SMS configuration: ${configError}`
        });

        return;
      }

      try {
        // Validate the phone number
        if (!isValidPhoneNumber(member.primary_phone_number)) {
          console.error(`Invalid phone number format for member ${member.id}: ${member.primary_phone_number}`);

          // Log failure
          await createMessageLog({
            message_id: message.id,
            recipient_id: member.id,
            status: 'failed',
            error_message: `Invalid phone number format: ${member.primary_phone_number}`
          });

          return;
        }

        // Normalize the phone number
        const normalizedPhone = normalizePhoneNumber(member.primary_phone_number);

        // Check for existing message logs to prevent duplicates
        const { data: existingLogs, error: logError } = await supabase
          .from('message_logs')
          .select('id')
          .eq('message_id', message.id)
          .eq('recipient_id', member.id)
          .eq('status', 'sent')
          .limit(1);

        if (!logError && existingLogs && existingLogs.length > 0) {
          console.log(`Message ${message.id} already sent to member ${member.id}. Skipping to prevent duplicate.`);

          // Log as skipped
          try {
            await createMessageLog({
              message_id: message.id,
              recipient_id: member.id,
              status: 'sent',
              message_id_from_provider: `SKIP_${Date.now()}`,
              error_message: 'Skipped sending to prevent duplicate'
            });
          } catch (logError) {
            console.error(`Error creating skip log for member ${member.id}:`, logError);
          }

          return;
        }

        // Personalize the message content
        const personalizedContent = personalizeMessage(message.content, member);

        console.log(`Sending personalized message to ${member.first_name} ${member.last_name}:`, {
          originalContent: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
          personalizedContent: personalizedContent.substring(0, 50) + (personalizedContent.length > 50 ? '...' : ''),
          hasPersonalization: personalizedContent !== message.content
        });

        // Send the message using the default SMS configuration
        const result = await sendSMSWithConfig(
          config,
          normalizedPhone,
          personalizedContent,
          config.sender_id
        );

        if (result.success) {
          console.log(`Successfully sent message to member ${member.id}`);

          // Log success
          try {
            await createMessageLog({
              message_id: message.id,
              recipient_id: member.id,
              status: 'sent',
              message_id_from_provider: result.messageId
            });
          } catch (logError) {
            console.error(`Error creating success log for member ${member.id}:`, logError);
          }
        } else {
          console.error(`Error sending message to member ${member.id}:`, result.error);

          // Log failure
          try {
            await createMessageLog({
              message_id: message.id,
              recipient_id: member.id,
              status: 'failed',
              error_message: result.error || 'Failed to send message'
            });
          } catch (logError) {
            console.error(`Error creating failure log for member ${member.id}:`, logError);
          }
        }
      } catch (sendError) {
        console.error(`Error sending message to member ${member.id}:`, sendError);

        // Log failure
        try {
          await createMessageLog({
            message_id: message.id,
            recipient_id: member.id,
            status: 'failed',
            error_message: sendError instanceof Error ? sendError.message : 'Unknown error sending message'
          });
        } catch (logError) {
          console.error(`Error creating error log for member ${member.id}:`, logError);
        }
      }
    } else if (recipient.recipient_type === 'group') {
      // Get all members in the group using the updated API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/groups/${recipient.recipient_id}/members`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error getting members for group ${recipient.recipient_id}:`, errorData);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: recipient.recipient_id,
          status: 'failed',
          error_message: `Error getting members for group: ${errorData.error || response.statusText}`
        });

        return;
      }

      const groupData = await response.json();

      if (!groupData.success) {
        console.error(`Error getting members for group ${recipient.recipient_id}:`, groupData.error);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: recipient.recipient_id,
          status: 'failed',
          error_message: `Error getting members for group: ${groupData.error}`
        });

        return;
      }

      const members = groupData.data;
      const groupError = null;

      if (groupError) {
        console.error(`Error getting members for group ${recipient.recipient_id}:`, groupError);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: recipient.recipient_id,
          status: 'failed',
          error_message: `Error getting members for group: ${groupError.message}`
        });

        return;
      }

      if (!members || members.length === 0) {
        console.error(`No active members found in group ${recipient.recipient_id}`);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: recipient.recipient_id,
          status: 'failed',
          error_message: `No active members found in group ${recipient.recipient_id}`
        });

        return;
      }

      // Count members with and without phone numbers
      const membersWithPhone = members.filter(m => m.primary_phone_number);
      const membersWithoutPhone = members.length - membersWithPhone.length;

      console.log(`Group ${recipient.recipient_id} stats: Total members=${members.length}, With phone=${membersWithPhone.length}, Without phone=${membersWithoutPhone}`);

      if (membersWithPhone.length === 0) {
        console.error(`No members with phone numbers found in group ${recipient.recipient_id}`);

        // Log this error to help with debugging
        await createMessageLog({
          message_id: message.id,
          recipient_id: recipient.recipient_id,
          status: 'failed',
          error_message: `No members with phone numbers found in group ${recipient.recipient_id}`
        });

        return;
      }

      // For group messages, we need to personalize for each member
      const personalizedMessages = [];
      const phoneNumbers = [];
      const memberIds = [];

      // Prepare personalized messages for each member
      for (const member of membersWithPhone) {
        // Personalize the message for this member
        const personalizedContent = personalizeMessage(message.content, member);

        // Add to our arrays
        personalizedMessages.push(personalizedContent);
        phoneNumbers.push(member.primary_phone_number);
        memberIds.push(member.id);

        // Log personalization for debugging
        console.log(`Personalized message for ${member.first_name} ${member.last_name}:`, {
          originalContent: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
          personalizedContent: personalizedContent.substring(0, 30) + (personalizedContent.length > 30 ? '...' : ''),
          hasPersonalization: personalizedContent !== message.content
        });
      }

      console.log(`Sending personalized bulk messages to ${phoneNumbers.length} members in group ${recipient.recipient_id}`);

      try {
        // Start progress tracking
        console.time(`group-${recipient.recipient_id}-bulk-send`);

        // Get the default SMS configuration
        const { success: configSuccess, config, error: configError } = await getDefaultSMSConfig();

        if (!configSuccess || !config) {
          console.error(`Error getting SMS configuration for group ${recipient.recipient_id}:`, configError);

          // Log this error to help with debugging
          try {
            await createMessageLog({
              message_id: message.id,
              recipient_id: recipient.recipient_id,
              status: 'failed',
              error_message: `Error getting SMS configuration: ${configError}`
            });
          } catch (logError) {
            console.error(`Error creating config error log for group ${recipient.recipient_id}:`, logError);
          }

          return;
        }

        // Since we can't send different messages in bulk, we need to send them individually
        const bulkResults = [];
        let totalSentCount = 0;
        let totalFailedCount = 0;

        // Send messages individually with personalization
        for (let i = 0; i < phoneNumbers.length; i++) {
          try {
            const memberId = memberIds[i];

            // Check for existing message logs to prevent duplicates
            const { data: existingLogs, error: logError } = await supabase
              .from('message_logs')
              .select('id')
              .eq('message_id', message.id)
              .eq('recipient_id', memberId)
              .eq('status', 'sent')
              .limit(1);

            if (!logError && existingLogs && existingLogs.length > 0) {
              console.log(`Message ${message.id} already sent to member ${memberId}. Skipping to prevent duplicate.`);

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
        const result = {
          success: totalSentCount > 0,
          messageId: `bulk_${Date.now()}`,
          bulkDetails: {
            totalSent: totalSentCount,
            totalFailed: totalFailedCount,
            destinations: bulkResults
          }
        };

        console.timeEnd(`group-${recipient.recipient_id}-bulk-send`);

        if (result.success) {
          console.log(`Successfully sent bulk message to group ${recipient.recipient_id}`);

          // Log success for each member
          if (result.bulkDetails) {
            console.log(`Bulk send details: Total sent=${result.bulkDetails.totalSent}, Total failed=${result.bulkDetails.totalFailed || 0}`);

            // Create logs for each member
            for (let i = 0; i < memberIds.length; i++) {
              const memberId = memberIds[i];
              const phoneNumber = phoneNumbers[i];

              // Find the destination result for this phone number
              const destinationResult = result.bulkDetails.destinations.find(d => d.destination === phoneNumber);

              if (destinationResult && destinationResult.status === 'sent') {
                // Log success
                try {
                  await createMessageLog({
                    message_id: message.id,
                    recipient_id: memberId,
                    status: 'sent',
                    message_id_from_provider: destinationResult.messageId
                  });
                } catch (logError) {
                  console.error(`Error creating success log for member ${memberId} in bulk send:`, logError);
                }
              } else {
                // Log failure
                try {
                  await createMessageLog({
                    message_id: message.id,
                    recipient_id: memberId,
                    status: 'failed',
                    error_message: destinationResult?.error || 'Failed to send message in bulk operation'
                  });
                } catch (logError) {
                  console.error(`Error creating failure log for member ${memberId} in bulk send:`, logError);
                }
              }
            }
          } else {
            // If we don't have bulk details, log success for all members
            for (const memberId of memberIds) {
              try {
                await createMessageLog({
                  message_id: message.id,
                  recipient_id: memberId,
                  status: 'sent',
                  message_id_from_provider: result.messageId
                });
              } catch (logError) {
                console.error(`Error creating success log for member ${memberId} in bulk send (no details):`, logError);
              }
            }
          }
        } else {
          console.error(`Error sending bulk message to group ${recipient.recipient_id}:`, result.error);

          // Log failure for all members
          for (const memberId of memberIds) {
            try {
              await createMessageLog({
                message_id: message.id,
                recipient_id: memberId,
                status: 'failed',
                error_message: result.error || 'Failed to send message in bulk operation'
              });
            } catch (logError) {
              console.error(`Error creating failure log for member ${memberId} in bulk send failure:`, logError);
            }
          }
        }
      } catch (bulkSendError) {
        console.error(`Error in bulk send to group ${recipient.recipient_id}:`, bulkSendError);

        // If bulk send fails, fall back to individual sends
        console.log(`Falling back to individual sends for group ${recipient.recipient_id}`);

        let sentCount = 0;
        let failedCount = 0;

        // Get the default SMS configuration for fallback
        const { success: fallbackConfigSuccess, config: fallbackConfig } = await getDefaultSMSConfig();

        if (!fallbackConfigSuccess || !fallbackConfig) {
          console.error(`Error getting SMS configuration for fallback sends in group ${recipient.recipient_id}`);

          // Log failure for all members
          for (const member of membersWithPhone) {
            try {
              await createMessageLog({
                message_id: message.id,
                recipient_id: member.id,
                status: 'failed',
                error_message: 'Failed to get SMS configuration for fallback send'
              });
            } catch (logError) {
              console.error(`Error creating fallback config error log for member ${member.id}:`, logError);
            }
          }

          return;
        }

        for (const member of membersWithPhone) {
          if (member.primary_phone_number) {
            try {
              // Validate the phone number
              if (!isValidPhoneNumber(member.primary_phone_number)) {
                console.error(`Invalid phone number format for member ${member.id}: ${member.primary_phone_number}`);

                // Log failure
                try {
                  await createMessageLog({
                    message_id: message.id,
                    recipient_id: member.id,
                    status: 'failed',
                    error_message: `Invalid phone number format: ${member.primary_phone_number}`
                  });
                } catch (logError) {
                  console.error(`Error creating invalid phone log for member ${member.id}:`, logError);
                }

                failedCount++;
                continue;
              }

              // Normalize the phone number
              const normalizedPhone = normalizePhoneNumber(member.primary_phone_number);

              // Check for existing message logs to prevent duplicates
              const { data: existingLogs, error: logError } = await supabase
                .from('message_logs')
                .select('id')
                .eq('message_id', message.id)
                .eq('recipient_id', member.id)
                .eq('status', 'sent')
                .limit(1);

              if (!logError && existingLogs && existingLogs.length > 0) {
                console.log(`Message ${message.id} already sent to member ${member.id}. Skipping fallback to prevent duplicate.`);

                // Log as skipped but count as success
                try {
                  await createMessageLog({
                    message_id: message.id,
                    recipient_id: member.id,
                    status: 'sent',
                    message_id_from_provider: `SKIP_FALLBACK_${Date.now()}`,
                    error_message: 'Skipped fallback sending to prevent duplicate'
                  });
                } catch (logError) {
                  console.error(`Error creating fallback skip log for member ${member.id}:`, logError);
                }

                sentCount++;
                continue;
              }

              // Personalize the message content
              const personalizedContent = personalizeMessage(message.content, member);

              console.log(`Sending personalized fallback message to ${member.first_name} ${member.last_name}:`, {
                originalContent: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
                personalizedContent: personalizedContent.substring(0, 30) + (personalizedContent.length > 30 ? '...' : ''),
                hasPersonalization: personalizedContent !== message.content
              });

              // Send the message using the default SMS configuration
              const result = await sendSMSWithConfig(
                fallbackConfig,
                normalizedPhone,
                personalizedContent,
                fallbackConfig.sender_id
              );

              if (result.success) {
                console.log(`Successfully sent fallback message to member ${member.id} in group ${recipient.recipient_id}`);

                // Log success
                try {
                  await createMessageLog({
                    message_id: message.id,
                    recipient_id: member.id,
                    status: 'sent',
                    message_id_from_provider: result.messageId
                  });
                } catch (logError) {
                  console.error(`Error creating fallback success log for member ${member.id}:`, logError);
                }

                sentCount++;
              } else {
                console.error(`Error sending fallback message to member ${member.id} in group ${recipient.recipient_id}:`, result.error);

                // Log failure
                try {
                  await createMessageLog({
                    message_id: message.id,
                    recipient_id: member.id,
                    status: 'failed',
                    error_message: result.error || 'Failed to send fallback message'
                  });
                } catch (logError) {
                  console.error(`Error creating fallback failure log for member ${member.id}:`, logError);
                }

                failedCount++;
              }
            } catch (sendError) {
              console.error(`Error sending fallback message to member ${member.id} in group ${recipient.recipient_id}:`, sendError);

              // Log failure
              try {
                await createMessageLog({
                  message_id: message.id,
                  recipient_id: member.id,
                  status: 'failed',
                  error_message: sendError instanceof Error ? sendError.message : 'Unknown error sending fallback message'
                });
              } catch (logError) {
                console.error(`Error creating fallback error log for member ${member.id}:`, logError);
              }

              failedCount++;
            }
          }
        }

        console.log(`Individual send results for group ${recipient.recipient_id}: Sent=${sentCount}, Failed=${failedCount}, Skipped=${membersWithoutPhone}`);
      }

      // Log members without phone numbers
      if (membersWithoutPhone > 0) {
        const membersWithoutPhoneList = members.filter(m => !m.primary_phone_number);

        for (const member of membersWithoutPhoneList) {
          console.warn(`Member ${member.id} (${member.first_name} ${member.last_name}) in group ${recipient.recipient_id} does not have a phone number`);

          // Log this warning to help with debugging
          try {
            await createMessageLog({
              message_id: message.id,
              recipient_id: member.id,
              status: 'failed',
              error_message: `Member does not have a phone number`
            });
          } catch (logError) {
            console.error(`Error creating no-phone log for member ${member.id}:`, logError);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing recipient ${recipient.id}:`, error);

    // Add a safety check to prevent the empty error object issue
    try {
      // Create a generic error log to ensure we have a record of the failure
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id || recipient.id || 'unknown',
        status: 'failed',
        error_message: error instanceof Error
          ? error.message
          : (typeof error === 'string'
              ? error
              : 'Unknown error processing recipient')
      }).catch(logError => {
        // If this also fails, just log it and continue
        console.error(`Failed to create error log for recipient ${recipient.id}:`, logError);
      });
    } catch (finalError) {
      // Last resort error handling
      console.error(`Critical error in error handling for recipient ${recipient.id}:`, finalError);
    }
  }
}

/**
 * Update the message schedule based on frequency
 * @param message The message to update
 */
async function updateMessageSchedule(message: Message) {
  try {
    // Calculate the next schedule time based on frequency
    const nextScheduleTime = calculateNextScheduleTime(message);

    // If there's no next schedule time (one-time message or past end date), mark as completed
    if (!nextScheduleTime) {
      console.log(`Message ${message.id} will be marked as completed (one-time or past end date)`);

      // Update the message status to 'completed' instead of leaving it as 'processing'
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString() // Use updated_at instead of completed_at
        })
        .eq('id', message.id);

      if (updateError) {
        console.error(`Error marking message ${message.id} as completed:`, updateError);
      } else {
        console.log(`Message ${message.id} successfully marked as completed`);
      }

      return;
    }

    // For recurring messages, update the schedule time and set status back to active
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        schedule_time: nextScheduleTime.toISOString(),
        status: 'active', // Set it back to active for the next scheduled time
        updated_at: new Date().toISOString() // Use updated_at to track when it was last run
      })
      .eq('id', message.id);

    if (updateError) {
      console.error(`Error rescheduling message ${message.id}:`, updateError);

      // If there's an error, try one more time with a simpler update
      try {
        await supabase
          .from('messages')
          .update({
            status: 'active',
            schedule_time: nextScheduleTime.toISOString()
          })
          .eq('id', message.id);
        console.log(`Message ${message.id} rescheduled with simplified update`);
      } catch (retryError) {
        console.error(`Error in retry for message ${message.id}:`, retryError);

        // Last resort - just update the status
        try {
          await supabase
            .from('messages')
            .update({ status: 'active' })
            .eq('id', message.id);
          console.log(`Message ${message.id} status updated to active as last resort`);
        } catch (finalError) {
          console.error(`Critical error updating message ${message.id}:`, finalError);
        }
      }
    } else {
      console.log(`Message ${message.id} successfully rescheduled for ${nextScheduleTime.toISOString()} and set to active`);
    }
  } catch (error) {
    console.error(`Error updating message schedule for ${message.id}:`, error);

    // If there's an error, make sure the message is marked as inactive to prevent duplicate sends
    try {
      await supabase
        .from('messages')
        .update({ status: 'error', error_message: error instanceof Error ? error.message : 'Unknown error during scheduling' })
        .eq('id', message.id);
      console.log(`Message ${message.id} marked as error due to scheduling failure`);
    } catch (updateError) {
      console.error(`Error marking message ${message.id} as error:`, updateError);
    }
  }
}

/**
 * Calculate the next schedule time based on frequency
 * @param message The message
 * @returns The next schedule time, or null if there's no next time
 */
function calculateNextScheduleTime(message: Message): Date | null {
  // Get the current schedule time
  const currentScheduleTime = new Date(message.schedule_time);

  // For one-time messages, there's no next schedule time
  if (message.frequency === 'one-time') {
    return null;
  }

  // Calculate the next schedule time based on frequency
  let nextScheduleTime: Date;

  switch (message.frequency) {
    case 'daily':
      nextScheduleTime = new Date(currentScheduleTime);
      nextScheduleTime.setDate(nextScheduleTime.getDate() + 1);
      break;
    case 'weekly':
      nextScheduleTime = new Date(currentScheduleTime);
      nextScheduleTime.setDate(nextScheduleTime.getDate() + 7);
      break;
    case 'monthly':
      nextScheduleTime = new Date(currentScheduleTime);
      nextScheduleTime.setMonth(nextScheduleTime.getMonth() + 1);
      break;
    case 'yearly':
      nextScheduleTime = new Date(currentScheduleTime);
      nextScheduleTime.setFullYear(nextScheduleTime.getFullYear() + 1);
      break;
    default:
      return null;
  }

  // Check if the next schedule time is past the end date
  if (message.end_date && new Date(message.end_date) < nextScheduleTime) {
    return null;
  }

  return nextScheduleTime;
}
