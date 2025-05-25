import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMSWithConfig, getDefaultSMSConfig } from '@/services/sms-service';
import { personalizeMessage } from '@/utils/message-utils';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';

/**
 * POST /api/cron/process-scheduled-messages
 * Process scheduled messages - to be triggered by a cron job
 * This endpoint is protected by a secret key to prevent unauthorized access
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Process scheduled messages endpoint called');

    // Verify the request is authorized
    // For Vercel cron jobs, check for authorization header first, then fall back to query parameter
    let token = '';

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Fall back to query parameter for Vercel cron jobs
      const url = new URL(request.url);
      token = url.searchParams.get('token') || '';
    }

    if (!token || token !== process.env.CRON_SECRET_KEY) {
      console.error('Invalid or missing token for process-scheduled-messages');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and calculate 24 hours ago
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    console.log(`Processing scheduled messages at ${now.toISOString()}`);
    console.log(`Looking for messages scheduled between ${yesterday.toISOString()} and ${now.toISOString()}`);

    // Find messages that are ready to be sent (active or scheduled status)
    // Process all messages due in the last 24 hours since we only run once daily
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .in('status', ['active', 'scheduled']) // Include both active and scheduled messages
      .not('type', 'eq', 'birthday') // Exclude birthday messages as they're handled separately
      .gte('schedule_time', yesterday.toISOString()) // Messages scheduled since yesterday
      .lte('schedule_time', now.toISOString()) // Up to now
      .limit(100); // Increased batch size for daily processing

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
        // Mark the message as processing
        await supabaseAdmin
          .from('messages')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString() // Use updated_at to track when processing started
          })
          .eq('id', message.id);

        // Get the recipients for this message
        const { data: recipients, error: recipientsError } = await supabaseAdmin
          .from('message_recipients')
          .select('*')
          .eq('message_id', message.id);

        if (recipientsError) {
          console.error(`Error fetching recipients for message ${message.id}:`, recipientsError);

          // Update message with error
          await supabaseAdmin
            .from('messages')
            .update({
              status: 'inactive',
              error_message: `Failed to fetch recipients: ${recipientsError.message}`
            })
            .eq('id', message.id);

          results.push({
            messageId: message.id,
            status: 'failed',
            error: recipientsError.message
          });

          continue;
        }

        if (!recipients || recipients.length === 0) {
          console.log(`No recipients found for message ${message.id}`);

          // Update message schedule based on frequency
          await updateMessageSchedule(message);

          results.push({
            messageId: message.id,
            status: 'skipped',
            reason: 'No recipients'
          });

          continue;
        }

        // Process each recipient
        const recipientResults = [];
        for (const recipient of recipients) {
          const result = await processRecipient(supabaseAdmin, message, recipient);
          recipientResults.push(result);
        }

        // Update message schedule based on frequency
        await updateMessageSchedule(supabaseAdmin, message);

        results.push({
          messageId: message.id,
          status: 'processed',
          recipientResults
        });
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);

        // Update message with error
        await supabaseAdmin
          .from('messages')
          .update({
            status: 'inactive',
            error_message: error instanceof Error ? error.message : 'Unknown error during processing'
          })
          .eq('id', message.id);

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
 * Process a single recipient
 * @param supabaseAdmin The Supabase admin client
 * @param message The message to send
 * @param recipient The recipient information
 */
async function processRecipient(supabaseAdmin: any, message: any, recipient: any) {
  try {
    if (recipient.recipient_type === 'individual') {
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
        await createMessageLog(supabaseAdmin, {
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
        await createMessageLog(supabaseAdmin, {
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
        await createMessageLog(supabaseAdmin, {
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

      try {
        // Validate the phone number
        if (!isValidPhoneNumber(member.primary_phone_number)) {
          console.error(`Invalid phone number format for member ${member.id}: ${member.primary_phone_number}`);

          // Log failure
          await createMessageLog(supabaseAdmin, {
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

        // Check if this message has already been sent to this recipient using database
        const { data: existingLogs, error: logCheckError } = await supabaseAdmin
          .from('message_logs')
          .select('id')
          .eq('message_id', message.id)
          .eq('recipient_id', member.id)
          .limit(1);

        if (!logCheckError && existingLogs && existingLogs.length > 0) {
          console.log(`Message ${message.id} already sent to member ${member.id}. Skipping to prevent duplicate.`);

          // Log as skipped
          await createMessageLog(supabaseAdmin, {
            message_id: message.id,
            recipient_id: member.id,
            status: 'sent',
            message_id_from_provider: `SKIP_${Date.now()}`,
            error_message: 'Skipped sending to prevent duplicate'
          });

          return {
            recipientId: recipient.recipient_id,
            status: 'skipped',
            reason: 'Already sent'
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
          await createMessageLog(supabaseAdmin, {
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
          await createMessageLog(supabaseAdmin, {
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
      } catch (sendError) {
        console.error(`Error sending message to member ${member.id}:`, sendError);

        // Log failure
        await createMessageLog(supabaseAdmin, {
          message_id: message.id,
          recipient_id: member.id,
          status: 'failed',
          error_message: sendError instanceof Error ? sendError.message : 'Unknown error sending message'
        });

        return {
          recipientId: recipient.recipient_id,
          status: 'failed',
          error: sendError instanceof Error ? sendError.message : 'Unknown error'
        };
      }
    } else if (recipient.recipient_type === 'group') {
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
            await createMessageLog(supabaseAdmin, {
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
        await createMessageLog(supabaseAdmin, {
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
        await createMessageLog(supabaseAdmin, {
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
      const memberIds = groupData.map((item: any) => item.member_id);

      // Get the members' details
      const { data: members, error: membersError } = await supabaseAdmin
        .from('members')
        .select('*')
        .in('id', memberIds)
        .eq('status', 'active');

      if (membersError || !members || members.length === 0) {
        console.error(`Error getting member details for group ${recipient.recipient_id}:`, membersError);

        // Log this error
        await createMessageLog(supabaseAdmin, {
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
        await createMessageLog(supabaseAdmin, {
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
        await createMessageLog(supabaseAdmin, {
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
            await createMessageLog(supabaseAdmin, {
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

          // Check if this message has already been sent to this recipient using database
          const { data: existingLogs, error: logCheckError } = await supabaseAdmin
            .from('message_logs')
            .select('id')
            .eq('message_id', message.id)
            .eq('recipient_id', member.id)
            .limit(1);

          if (!logCheckError && existingLogs && existingLogs.length > 0) {
            console.log(`Message ${message.id} already sent to member ${member.id}. Skipping to prevent duplicate.`);

            // Log as skipped
            await createMessageLog(supabaseAdmin, {
              message_id: message.id,
              recipient_id: member.id,
              status: 'sent',
              message_id_from_provider: `SKIP_${Date.now()}`,
              error_message: 'Skipped sending to prevent duplicate'
            });

            memberResults.push({
              memberId: member.id,
              status: 'skipped',
              reason: 'Already sent'
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
            await createMessageLog(supabaseAdmin, {
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
            await createMessageLog(supabaseAdmin, {
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
          await createMessageLog(supabaseAdmin, {
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
    } else {
      console.error(`Unknown recipient type: ${recipient.recipient_type}`);
      return {
        recipientId: recipient.recipient_id,
        status: 'failed',
        error: `Unknown recipient type: ${recipient.recipient_type}`
      };
    }
  } catch (error) {
    console.error(`Error processing recipient ${recipient.id}:`, error);

    // Create a generic error log
    await createMessageLog(supabaseAdmin, {
      message_id: message.id,
      recipient_id: recipient.recipient_id,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error processing recipient'
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
 * @param supabaseAdmin The Supabase admin client
 * @param message The message to update
 */
async function updateMessageSchedule(supabaseAdmin: any, message: any) {
  try {
    // Calculate the next schedule time based on frequency
    const nextScheduleTime = calculateNextScheduleTime(message);

    // If there's no next schedule time (one-time message or past end date), keep it as inactive
    if (!nextScheduleTime) {
      console.log(`Message ${message.id} will remain inactive (one-time or completed)`);

      // Update the message status to completed for one-time messages
      await supabaseAdmin
        .from('messages')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id);

      return;
    }

    // For recurring messages, update the schedule time and set status back to active
    await supabaseAdmin
      .from('messages')
      .update({
        schedule_time: nextScheduleTime.toISOString(),
        status: 'scheduled', // Use 'scheduled' status for future scheduled messages
        updated_at: new Date().toISOString() // Update the timestamp
      })
      .eq('id', message.id);

    console.log(`Message ${message.id} rescheduled for ${nextScheduleTime.toISOString()} and set to scheduled`);
  } catch (error) {
    console.error(`Error updating message schedule for ${message.id}:`, error);

    // If there's an error, make sure the message is marked as inactive to prevent duplicate sends
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
      console.error(`Error marking message ${message.id} as inactive:`, updateError);
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
 * @param supabaseAdmin The Supabase admin client
 * @param log The log entry to create
 */
async function createMessageLog(supabaseAdmin: any, log: any) {
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
