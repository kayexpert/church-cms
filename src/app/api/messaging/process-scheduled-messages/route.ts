import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDefaultSMSConfig, sendSMSWithConfig } from '@/services/sms-service';
import { personalizeMessage } from '@/utils/message-utils';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';

// Create a Supabase client with service role for more permissions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/messaging/process-scheduled-messages
 * Process scheduled messages directly from the client
 * This endpoint can be called directly from the client to process scheduled messages
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Direct process scheduled messages endpoint called');

    // Parse the request body to check if a specific message ID was provided
    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (e) {
      // If parsing fails, assume no body was provided
      console.log('No request body provided or invalid JSON');
    }

    const { messageId } = requestBody as { messageId?: string };

    let messages;
    let error;

    // Get current time
    const now = new Date();
    console.log(`Processing scheduled messages at ${now.toISOString()}`);

    // If a specific message ID was provided, fetch only that message
    if (messageId) {
      console.log(`Processing specific message with ID: ${messageId}`);

      const result = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .limit(1);

      messages = result.data;
      error = result.error;

      // If the message was found but is not in a processable state, update it to be processable
      if (messages && messages.length > 0 && messages[0].status === 'processing') {
        console.log(`Message ${messageId} is in 'processing' state. Updating to 'scheduled' to allow processing.`);

        // Update the message status to scheduled so it can be processed
        const { error: updateError } = await supabaseAdmin
          .from('messages')
          .update({ status: 'scheduled' })
          .eq('id', messageId);

        if (updateError) {
          console.error(`Error updating message ${messageId} status:`, updateError);
        } else {
          // Refresh the message data
          const refreshResult = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .limit(1);

          messages = refreshResult.data;
          error = refreshResult.error;
        }
      }
    } else {
      // Otherwise, find all messages that are ready to be sent
      console.log('Processing all scheduled messages that are due');

      const result = await supabaseAdmin
        .from('messages')
        .select('*')
        .in('status', ['active', 'scheduled']) // Include both active and scheduled messages
        .not('type', 'eq', 'birthday') // Exclude birthday messages as they're handled separately
        .lte('schedule_time', now.toISOString())
        .limit(10); // Process in batches

      messages = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching scheduled messages:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch scheduled messages',
        details: error.message
      }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      console.log('No scheduled messages to process');
      return NextResponse.json({
        success: true,
        message: 'No scheduled messages to process'
      });
    }

    console.log(`Found ${messages.length} messages to process`);

    // Process each message
    const results = [];

    for (const message of messages) {
      try {
        console.log(`Processing message: ${message.name} (${message.id})`);

        // Mark the message as processing
        const { error: updateError } = await supabaseAdmin
          .from('messages')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error(`Error marking message ${message.id} as processing:`, updateError);
          results.push({
            messageId: message.id,
            status: 'failed',
            error: `Failed to mark message as processing: ${updateError.message}`
          });
          continue;
        }

        // Get the recipients for this message
        const { data: recipients, error: recipientsError } = await supabaseAdmin
          .from('message_recipients')
          .select('*')
          .eq('message_id', message.id);

        if (recipientsError) {
          console.error(`Error fetching recipients for message ${message.id}:`, recipientsError);
          results.push({
            messageId: message.id,
            status: 'failed',
            error: `Failed to fetch recipients: ${recipientsError.message}`
          });

          // Mark the message as error
          await supabaseAdmin
            .from('messages')
            .update({
              status: 'error',
              error_message: `Failed to fetch recipients: ${recipientsError.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          continue;
        }

        if (!recipients || recipients.length === 0) {
          console.log(`No recipients found for message ${message.id}`);

          // Mark one-time messages as completed
          if (message.frequency === 'one-time') {
            await supabaseAdmin
              .from('messages')
              .update({
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', message.id);

            console.log(`Message ${message.id} marked as completed (no recipients)`);
          } else {
            // For recurring messages, calculate the next schedule time
            await updateMessageSchedule(message);
          }

          results.push({
            messageId: message.id,
            status: 'skipped',
            reason: 'No recipients found'
          });
          continue;
        }

        // Process each recipient
        const recipientResults = [];
        let successCount = 0;
        let failureCount = 0;

        for (const recipient of recipients) {
          try {
            // Process individual recipient
            if (recipient.recipient_type === 'individual') {
              const result = await processIndividualRecipient(message, recipient);
              recipientResults.push(result);

              if (result.status === 'sent') {
                successCount++;
              } else {
                failureCount++;
              }
            }
            // Process group recipient
            else if (recipient.recipient_type === 'group') {
              const result = await processGroupRecipient(message, recipient);
              recipientResults.push(result);

              if (result.status === 'sent' || result.status === 'partial_success') {
                successCount++;
              } else {
                failureCount++;
              }
            }
            else {
              console.error(`Unknown recipient type: ${recipient.recipient_type}`);
              recipientResults.push({
                recipientId: recipient.recipient_id,
                status: 'failed',
                error: `Unknown recipient type: ${recipient.recipient_type}`
              });
              failureCount++;
            }
          } catch (recipientError) {
            console.error(`Error processing recipient ${recipient.id} for message ${message.id}:`, recipientError);
            recipientResults.push({
              recipientId: recipient.recipient_id,
              status: 'failed',
              error: recipientError instanceof Error ? recipientError.message : 'Unknown error'
            });
            failureCount++;
          }
        }

        // Update message status based on frequency
        await updateMessageSchedule(message);

        results.push({
          messageId: message.id,
          status: successCount > 0 ? 'success' : 'failed',
          stats: {
            total: recipients.length,
            success: successCount,
            failure: failureCount
          },
          recipientResults
        });
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);

        // Mark the message as error
        try {
          await supabaseAdmin
            .from('messages')
            .update({
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);
        } catch (updateError) {
          console.error(`Error marking message ${message.id} as error:`, updateError);
        }

        results.push({
          messageId: message.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: messages.length,
      results
    });
  } catch (error) {
    console.error('Error in process scheduled messages endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process scheduled messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Process an individual recipient
 * @param message The message to send
 * @param recipient The recipient information
 */
async function processIndividualRecipient(message: any, recipient: any) {
  try {
    // Get the member
    const { data: members, error: memberError } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('id', recipient.recipient_id)
      .eq('status', 'active')
      .limit(1);

    if (memberError || !members || members.length === 0) {
      console.error(`Member ${recipient.recipient_id} not found or not active`);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id,
        status: 'failed',
        error_message: `Member not found or not active: ${recipient.recipient_id}`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'Member not found or not active'
      };
    }

    const member = members[0];

    // Check if the member has a phone number
    if (!member.primary_phone_number) {
      console.error(`Member ${member.id} (${member.first_name} ${member.last_name}) does not have a phone number`);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id,
        status: 'failed',
        error_message: `Member ${member.first_name} ${member.last_name} does not have a phone number`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'Member does not have a phone number'
      };
    }

    // Get the default SMS configuration
    const { success: configSuccess, config, error: configError } = await getDefaultSMSConfig();

    if (!configSuccess || !config) {
      console.error(`Error getting SMS configuration for member ${member.id}:`, configError);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: member.id,
        status: 'failed',
        error_message: `Error getting SMS configuration: ${configError}`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'Failed to get SMS configuration'
      };
    }

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

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'Invalid phone number format'
      };
    }

    // Normalize the phone number
    const normalizedPhone = normalizePhoneNumber(member.primary_phone_number);

    // Check if this message has already been sent to this recipient today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingLogs, error: logsError } = await supabaseAdmin
      .from('message_logs')
      .select('*')
      .eq('message_id', message.id)
      .eq('recipient_id', member.id)
      .gte('sent_at', `${today}T00:00:00Z`)
      .lt('sent_at', `${today}T23:59:59Z`);

    if (!logsError && existingLogs && existingLogs.length > 0) {
      console.log(`Message ${message.id} already sent to member ${member.id} today. Skipping.`);

      return {
        recipientId: recipient.recipient_id,
        status: 'skipped',
        reason: 'Already sent today'
      };
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
      await createMessageLog({
        message_id: message.id,
        recipient_id: member.id,
        status: 'sent',
        message_id_from_provider: result.messageId
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'sent',
        messageId: result.messageId
      };
    } else {
      console.error(`Error sending message to member ${member.id}:`, result.error);

      // Log failure
      await createMessageLog({
        message_id: message.id,
        recipient_id: member.id,
        status: 'failed',
        error_message: result.error || 'Failed to send message'
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: result.error || 'Failed to send message'
      };
    }
  } catch (error) {
    console.error(`Error processing individual recipient:`, error);

    // Log failure
    await createMessageLog({
      message_id: message.id,
      recipient_id: recipient.recipient_id,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      recipientId: recipient.recipient_id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process a group recipient
 * @param message The message to send
 * @param recipient The recipient information
 */
async function processGroupRecipient(message: any, recipient: any) {
  try {
    // Try to get members from covenant_families_members table first
    let groupData;
    let groupError;

    try {
      const result = await supabaseAdmin
        .from('covenant_families_members')
        .select('member_id')
        .eq('covenant_family_id', recipient.recipient_id);

      groupData = result.data;
      groupError = result.error;

      if (groupError || !groupData || groupData.length === 0) {
        console.log(`No members found in covenant_families_members for group ${recipient.recipient_id}, trying direct covenant_family_id lookup`);

        // Fall back to direct lookup using covenant_family_id in members table
        const directResult = await supabaseAdmin
          .from('members')
          .select('id as member_id')
          .eq('covenant_family_id', recipient.recipient_id)
          .eq('status', 'active');

        if (directResult.error || !directResult.data || directResult.data.length === 0) {
          console.error(`Error getting members for group ${recipient.recipient_id} using direct lookup:`, directResult.error);

          // Log this error
          await createMessageLog({
            message_id: message.id,
            recipient_id: recipient.recipient_id,
            status: 'failed',
            error_message: `Error getting members for group: ${directResult.error?.message || 'No members found with direct lookup'}`
          });

          return {
            recipientId: recipient.recipient_id,
            status: 'failed',
            error: 'Failed to get group members'
          };
        }

        // Use the direct lookup results
        groupData = directResult.data;
        console.log(`Found ${groupData.length} members for group ${recipient.recipient_id} using direct lookup`);
      } else {
        console.log(`Found ${groupData.length} members for group ${recipient.recipient_id} using covenant_families_members table`);
      }
    } catch (error) {
      console.error(`Exception getting members for group ${recipient.recipient_id}:`, error);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id,
        status: 'failed',
        error_message: `Exception getting members for group: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'Exception getting group members'
      };
    }

    if (!groupData || groupData.length === 0) {
      console.error(`No members found for group ${recipient.recipient_id} after all attempts`);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id,
        status: 'failed',
        error_message: `No members found for group ${recipient.recipient_id} after all attempts`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'No members found for group'
      };
    }

    // Get all member IDs from the group
    const memberIds = groupData.map(item => item.member_id);

    // Get the members' details
    const { data: members, error: membersError } = await supabaseAdmin
      .from('members')
      .select('*')
      .in('id', memberIds)
      .eq('status', 'active');

    if (membersError || !members || members.length === 0) {
      console.error(`Error getting member details for group ${recipient.recipient_id}:`, membersError);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id,
        status: 'failed',
        error_message: `Error getting member details: ${membersError?.message || 'No active members found'}`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'Failed to get member details'
      };
    }

    // Filter members with phone numbers
    const membersWithPhone = members.filter(m => m.primary_phone_number);

    if (membersWithPhone.length === 0) {
      console.error(`No members with phone numbers found in group ${recipient.recipient_id}`);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id,
        status: 'failed',
        error_message: `No members with phone numbers found in group ${recipient.recipient_id}`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'No members with phone numbers'
      };
    }

    // Get the default SMS configuration
    const { success: configSuccess, config, error: configError } = await getDefaultSMSConfig();

    if (!configSuccess || !config) {
      console.error(`Error getting SMS configuration for group ${recipient.recipient_id}:`, configError);

      // Log this error
      await createMessageLog({
        message_id: message.id,
        recipient_id: recipient.recipient_id,
        status: 'failed',
        error_message: `Error getting SMS configuration: ${configError}`
      });

      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: 'Failed to get SMS configuration'
      };
    }

    // Process each member in the group
    const memberResults = [];
    let successCount = 0;
    let failureCount = 0;

    for (const member of membersWithPhone) {
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

          memberResults.push({
            memberId: member.id,
            status: 'failed',
            error: 'Invalid phone number format'
          });

          failureCount++;
          continue;
        }

        // Normalize the phone number
        const normalizedPhone = normalizePhoneNumber(member.primary_phone_number);

        // Check if this message has already been sent to this recipient today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingLogs, error: logsError } = await supabaseAdmin
          .from('message_logs')
          .select('*')
          .eq('message_id', message.id)
          .eq('recipient_id', member.id)
          .gte('sent_at', `${today}T00:00:00Z`)
          .lt('sent_at', `${today}T23:59:59Z`);

        if (!logsError && existingLogs && existingLogs.length > 0) {
          console.log(`Message ${message.id} already sent to member ${member.id} today. Skipping.`);

          memberResults.push({
            memberId: member.id,
            status: 'skipped',
            reason: 'Already sent today'
          });

          // Count as success to avoid retries
          successCount++;
          continue;
        }

        // Personalize the message content
        const personalizedContent = personalizeMessage(message.content, member);

        // Send the message using the default SMS configuration
        const result = await sendSMSWithConfig(
          config,
          normalizedPhone,
          personalizedContent,
          config.sender_id
        );

        if (result.success) {
          console.log(`Successfully sent message to member ${member.id} in group ${recipient.recipient_id}`);

          // Log success
          await createMessageLog({
            message_id: message.id,
            recipient_id: member.id,
            status: 'sent',
            message_id_from_provider: result.messageId
          });

          memberResults.push({
            memberId: member.id,
            status: 'sent',
            messageId: result.messageId
          });

          successCount++;
        } else {
          console.error(`Error sending message to member ${member.id} in group ${recipient.recipient_id}:`, result.error);

          // Log failure
          await createMessageLog({
            message_id: message.id,
            recipient_id: member.id,
            status: 'failed',
            error_message: result.error || 'Failed to send message'
          });

          memberResults.push({
            memberId: member.id,
            status: 'failed',
            error: result.error || 'Failed to send message'
          });

          failureCount++;
        }
      } catch (sendError) {
        console.error(`Error sending message to member ${member.id} in group ${recipient.recipient_id}:`, sendError);

        // Log failure
        await createMessageLog({
          message_id: message.id,
          recipient_id: member.id,
          status: 'failed',
          error_message: sendError instanceof Error ? sendError.message : 'Unknown error sending message'
        });

        memberResults.push({
          memberId: member.id,
          status: 'failed',
          error: sendError instanceof Error ? sendError.message : 'Unknown error'
        });

        failureCount++;
      }
    }

    return {
      recipientId: recipient.recipient_id,
      status: successCount > 0 ? 'partial_success' : 'failed',
      stats: {
        total: membersWithPhone.length,
        success: successCount,
        failure: failureCount
      },
      memberResults
    };
  } catch (error) {
    console.error(`Error processing group recipient:`, error);

    // Log failure
    await createMessageLog({
      message_id: message.id,
      recipient_id: recipient.recipient_id,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      recipientId: recipient.recipient_id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update the message schedule based on frequency
 * @param message The message to update
 */
async function updateMessageSchedule(message: any) {
  try {
    console.log(`Updating message schedule for message ${message.id} (${message.name})`);
    console.log(`Current message status: ${message.status}, frequency: ${message.frequency}`);

    // Calculate the next schedule time based on frequency
    const nextScheduleTime = calculateNextScheduleTime(message);

    // If there's no next schedule time (one-time message or past end date), mark as inactive or completed
    if (!nextScheduleTime) {
      console.log(`Message ${message.id} will be marked as inactive or completed (one-time or past end date)`);

      // Try to update the message status to completed, but fall back to inactive if it fails
      try {
        const { data, error } = await supabaseAdmin
          .from('messages')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id)
          .select();

        if (error) {
          console.error(`Error marking message ${message.id} as completed:`, error);
          console.log(`Falling back to marking message ${message.id} as inactive`);

          // Fall back to marking as inactive
          const { data: inactiveData, error: inactiveError } = await supabaseAdmin
            .from('messages')
            .update({
              status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id)
            .select();

          if (inactiveError) {
            console.error(`Error marking message ${message.id} as inactive:`, inactiveError);
            throw new Error(`Failed to mark message as inactive: ${inactiveError.message}`);
          } else {
            console.log(`Message ${message.id} successfully marked as inactive:`, inactiveData);
          }
        } else {
          console.log(`Message ${message.id} successfully marked as completed:`, data);
        }
      } catch (updateError) {
        console.error(`Exception marking message ${message.id} as completed/inactive:`, updateError);
        throw updateError;
      }

      return;
    }

    // For recurring messages, update the schedule time and set status back to scheduled
    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({
        schedule_time: nextScheduleTime.toISOString(),
        status: 'scheduled', // Use 'scheduled' status for future scheduled messages
        updated_at: new Date().toISOString()
      })
      .eq('id', message.id)
      .select();

    if (error) {
      console.error(`Error rescheduling message ${message.id}:`, error);
      throw new Error(`Failed to reschedule message: ${error.message}`);
    } else {
      console.log(`Message ${message.id} successfully rescheduled for ${nextScheduleTime.toISOString()} and set to scheduled:`, data);
    }
  } catch (error) {
    console.error(`Error updating message schedule for ${message.id}:`, error);

    // If there's an error, mark the message as error
    try {
      await supabaseAdmin
        .from('messages')
        .update({
          status: 'error',
          error_message: `Error updating schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id);
      console.log(`Message ${message.id} marked as error due to scheduling error`);
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
function calculateNextScheduleTime(message: any): Date | null {
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

/**
 * Create a message log entry
 * @param log The log entry to create
 */
async function createMessageLog(log: any) {
  try {
    // Validate required fields
    if (!log.message_id) {
      console.error('Error creating message log: message_id is required');
      return;
    }

    if (!log.recipient_id) {
      console.error('Error creating message log: recipient_id is required');
      return;
    }

    // Ensure status is valid
    const validStatuses = ['sent', 'failed', 'pending', 'delivered', 'rejected', 'expired'];
    if (!log.status || !validStatuses.includes(log.status)) {
      console.error(`Error creating message log: Invalid status '${log.status}'. Using 'pending' as default.`);
      log.status = 'pending';
    }

    // Create the log entry with all possible fields
    const logData = {
      message_id: log.message_id,
      recipient_id: log.recipient_id,
      status: log.status,
      error_message: log.error_message || null,
      message_id_from_provider: log.message_id_from_provider || null,
      message_type: log.message_type || 'scheduled',
      sent_at: new Date().toISOString(),
      delivered_at: log.delivered_at || null,
      delivery_status: log.delivery_status || null,
      delivery_status_details: log.delivery_status_details || null,
      cost: log.cost || null,
      segments: log.segments || null
    };

    // Insert the log entry
    const { data, error } = await supabaseAdmin
      .from('message_logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error('Error creating message log:', error);
    } else {
      console.log(`Message log created successfully for message ${log.message_id} and recipient ${log.recipient_id}`);
    }
  } catch (error) {
    console.error('Error creating message log:', error);
  }
}