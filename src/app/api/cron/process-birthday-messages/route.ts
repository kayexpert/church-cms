import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMSWithConfig, getDefaultSMSConfig } from '@/services/sms-service';
import { personalizeMessage } from '@/utils/message-utils';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';
import { hasBirthdayMessageBeenSent } from '@/utils/db-message-deduplication';

// Create a Supabase client with service role for more permissions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/cron/process-birthday-messages
 * Process birthday messages - to be triggered by a daily cron job
 * This endpoint is protected by a secret key to prevent unauthorized access
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Process birthday messages endpoint called');

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
      console.error('Invalid or missing token for process-birthday-messages');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log(`Processing birthday messages for ${today.toISOString().split('T')[0]}`);

    // Find active birthday messages
    const { data: birthdayMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('type', 'birthday')
      .eq('status', 'active');

    if (messagesError) {
      console.error('Error fetching birthday messages:', messagesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch birthday messages',
        details: messagesError.message
      }, { status: 500 });
    }

    if (!birthdayMessages || birthdayMessages.length === 0) {
      console.log('No active birthday messages found');
      return NextResponse.json({
        success: true,
        message: 'No active birthday messages found'
      });
    }

    console.log(`Found ${birthdayMessages.length} active birthday messages`);

    // Find members with birthdays today or in the coming days
    const results = [];

    for (const message of birthdayMessages) {
      try {
        // Get the days before setting (default to 0 for same-day)
        const daysBefore = message.days_before || 0;

        // Calculate the target date (today + days before)
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysBefore);

        // Format month and day for comparison (MM-DD)
        const targetMonthDay = `${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;
        console.log(`Looking for members with birthdays on month-day: ${targetMonthDay} (${daysBefore} days before)`);

        // Find members with birthdays on the target date
        const { data: birthdayMembers, error: membersError } = await supabaseAdmin
          .from('members')
          .select('*')
          .eq('status', 'active')
          .not('date_of_birth', 'is', null);

        if (membersError) {
          console.error('Error fetching members with birthdays:', membersError);
          results.push({
            messageId: message.id,
            status: 'failed',
            error: `Failed to fetch members: ${membersError.message}`
          });
          continue;
        }

        if (!birthdayMembers || birthdayMembers.length === 0) {
          console.log('No active members with birth dates found');
          results.push({
            messageId: message.id,
            status: 'skipped',
            reason: 'No members with birth dates'
          });
          continue;
        }

        // Filter members whose birthdays match the target month-day
        const membersWithBirthdayToday = birthdayMembers.filter(member => {
          if (!member.date_of_birth) return false;

          const birthDate = new Date(member.date_of_birth);
          const birthMonthDay = `${(birthDate.getMonth() + 1).toString().padStart(2, '0')}-${birthDate.getDate().toString().padStart(2, '0')}`;
          return birthMonthDay === targetMonthDay;
        });

        if (membersWithBirthdayToday.length === 0) {
          console.log(`No members with birthdays on ${targetMonthDay}`);
          results.push({
            messageId: message.id,
            status: 'skipped',
            reason: `No members with birthdays on ${targetMonthDay}`
          });
          continue;
        }

        console.log(`Found ${membersWithBirthdayToday.length} members with birthdays on ${targetMonthDay}`);

        // Get the default SMS configuration
        const { success: configSuccess, config, error: configError } = await getDefaultSMSConfig();

        if (!configSuccess || !config) {
          console.error('Error getting SMS configuration for birthday messages:', configError);
          results.push({
            messageId: message.id,
            status: 'failed',
            error: `Failed to get SMS configuration: ${configError}`
          });
          continue;
        }

        // Send birthday messages to each member
        const memberResults = [];
        let successCount = 0;
        let failureCount = 0;

        for (const member of membersWithBirthdayToday) {
          try {
            // Skip members without phone numbers
            if (!member.primary_phone_number) {
              console.log(`Member ${member.id} (${member.first_name} ${member.last_name}) does not have a phone number`);
              memberResults.push({
                memberId: member.id,
                status: 'skipped',
                reason: 'No phone number'
              });
              continue;
            }

            // Validate the phone number
            if (!isValidPhoneNumber(member.primary_phone_number)) {
              console.error(`Invalid phone number format for member ${member.id}: ${member.primary_phone_number}`);
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

            // Check if this birthday message has already been sent to this member today
            // Use the database to check for existing logs
            const today = new Date().toISOString().split('T')[0];
            const hasBeenSent = await hasBirthdayMessageBeenSent(message.id, member.id, today);

            if (hasBeenSent) {
              console.log(`Birthday message already sent to member ${member.id} today. Skipping.`);
              memberResults.push({
                memberId: member.id,
                status: 'skipped',
                reason: 'Already sent today'
              });
              continue;
            }

            // Personalize the message content
            const personalizedContent = personalizeMessage(message.content, member);

            // Send the message
            const result = await sendSMSWithConfig(
              config,
              normalizedPhone,
              personalizedContent,
              config.sender_id
            );

            if (result.success) {
              console.log(`Successfully sent birthday message to member ${member.id}`);

              // Log success
              await createMessageLog({
                message_id: message.id,
                recipient_id: member.id,
                status: 'sent',
                message_id_from_provider: result.messageId,
                message_type: 'birthday'
              });

              memberResults.push({
                memberId: member.id,
                status: 'sent',
                messageId: result.messageId
              });

              successCount++;
            } else {
              console.error(`Error sending birthday message to member ${member.id}:`, result.error);

              // Log failure
              await createMessageLog({
                message_id: message.id,
                recipient_id: member.id,
                status: 'failed',
                error_message: result.error || 'Failed to send birthday message',
                message_type: 'birthday'
              });

              memberResults.push({
                memberId: member.id,
                status: 'failed',
                error: result.error || 'Failed to send message'
              });

              failureCount++;
            }
          } catch (sendError) {
            console.error(`Error sending birthday message to member ${member.id}:`, sendError);

            // Log failure
            await createMessageLog({
              message_id: message.id,
              recipient_id: member.id,
              status: 'failed',
              error_message: sendError instanceof Error ? sendError.message : 'Unknown error sending birthday message',
              message_type: 'birthday'
            });

            memberResults.push({
              memberId: member.id,
              status: 'failed',
              error: sendError instanceof Error ? sendError.message : 'Unknown error'
            });

            failureCount++;
          }
        }

        results.push({
          messageId: message.id,
          status: successCount > 0 ? 'success' : 'failed',
          stats: {
            total: membersWithBirthdayToday.length,
            success: successCount,
            failure: failureCount
          },
          memberResults
        });
      } catch (error) {
        console.error(`Error processing birthday message ${message.id}:`, error);
        results.push({
          messageId: message.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: birthdayMessages.length,
      results
    });
  } catch (error) {
    console.error('Error in process birthday messages endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process birthday messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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
      message_type: log.message_type || 'birthday',
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
