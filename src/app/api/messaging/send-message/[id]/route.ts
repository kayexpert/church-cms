import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDefaultSMSConfig, sendSMSWithConfig } from '@/services/sms-service';
import { personalizeMessage } from '@/utils/message-utils';

/**
 * POST /api/messaging/send-message/[id]
 * Send a message immediately
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Send message endpoint called for message ID: ${id}`);

    // Get the message ID from the URL
    const messageId = id;

    if (!messageId) {
      return NextResponse.json({
        success: false,
        error: 'Message ID is required'
      }, { status: 400 });
    }

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError) {
      console.error(`Error getting message ${messageId}:`, messageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get message',
        details: messageError.message
      }, { status: 500 });
    }

    if (!message) {
      console.error(`Message ${messageId} not found`);
      return NextResponse.json({
        success: false,
        error: 'Message not found',
        details: `Message with ID ${messageId} does not exist`
      }, { status: 404 });
    }

    // Get the message recipients
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from('message_recipients')
      .select('*')
      .eq('message_id', messageId);

    if (recipientsError) {
      console.error(`Error getting recipients for message ${messageId}:`, recipientsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get message recipients',
        details: recipientsError.message
      }, { status: 500 });
    }

    if (!recipients || recipients.length === 0) {
      console.error(`No recipients found for message ${messageId}`);
      return NextResponse.json({
        success: false,
        error: 'No recipients',
        details: `Message with ID ${messageId} has no recipients`
      }, { status: 400 });
    }

    // Get the SMS configuration
    const { success: configSuccess, config, error: configError } = await getDefaultSMSConfig();

    if (!configSuccess || !config) {
      console.error(`Error getting SMS configuration for message ${messageId}:`, configError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get SMS configuration',
        details: configError
      }, { status: 500 });
    }

    // Check if we're using a mock provider
    const isMockProvider = config.provider_name?.toLowerCase() === 'mock';

    // Process each recipient
    const results = [];
    let totalSent = 0;
    let totalFailed = 0;
    let bulkSendStats = null;

    for (const recipient of recipients) {
      try {
        if (recipient.recipient_type === 'individual') {
          // Get the member's phone number
          const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('id, first_name, last_name, primary_phone_number, status')
            .eq('id', recipient.recipient_id)
            .single();

          if (memberError) {
            console.error(`Error getting member ${recipient.recipient_id}:`, memberError);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: `Failed to get member: ${memberError.message}`
            });
            totalFailed++;
            continue;
          }

          if (!member) {
            console.error(`Member ${recipient.recipient_id} not found`);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: 'Member not found'
            });
            totalFailed++;
            continue;
          }

          if (member.status !== 'active') {
            console.error(`Member ${recipient.recipient_id} is not active (status: ${member.status})`);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: `Member is not active (status: ${member.status})`
            });
            totalFailed++;
            continue;
          }

          if (!member.primary_phone_number) {
            console.error(`Member ${recipient.recipient_id} does not have a phone number`);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: 'Member has no phone number'
            });
            totalFailed++;
            continue;
          }

          // Personalize the message content
          const personalizedContent = personalizeMessage(message.content, member);

          console.log(`Sending personalized message to ${member.first_name} ${member.last_name}:`, {
            originalContent: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
            personalizedContent: personalizedContent.substring(0, 50) + (personalizedContent.length > 50 ? '...' : ''),
            hasPersonalization: personalizedContent !== message.content
          });

          // Send the SMS with personalized content
          const smsResult = await sendSMSWithConfig(
            config,
            member.primary_phone_number,
            personalizedContent,
            config.sender_id
          );

          // Create a message log entry
          await supabaseAdmin
            .from('message_logs')
            .insert({
              message_id: messageId,
              recipient_id: recipient.recipient_id,
              status: smsResult.success ? 'sent' : 'failed',
              error_message: smsResult.success ? null : smsResult.error,
              message_id_from_provider: smsResult.messageId,
              sent_at: new Date().toISOString()
            });

          results.push({
            success: smsResult.success,
            recipientId: recipient.recipient_id,
            error: smsResult.error
          });

          if (smsResult.success) {
            totalSent++;
          } else {
            totalFailed++;
          }
        } else if (recipient.recipient_type === 'group') {
          // Get all members in the group using the API
          const groupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/groups/${recipient.recipient_id}/members`);

          if (!groupResponse.ok) {
            const errorData = await groupResponse.json();
            console.error(`Error getting members for group ${recipient.recipient_id}:`, errorData);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: `Error getting members for group: ${errorData.error || groupResponse.statusText}`
            });
            totalFailed++;
            continue;
          }

          const groupData = await groupResponse.json();

          if (!groupData.success) {
            console.error(`Error getting members for group ${recipient.recipient_id}:`, groupData.error);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: `Error getting members for group: ${groupData.error}`
            });
            totalFailed++;
            continue;
          }

          const groupMembers = groupData.data;
          const groupError = null;

          if (groupError) {
            console.error(`Error getting members for group ${recipient.recipient_id}:`, groupError);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: `Error getting members for group: ${(groupError as any) instanceof Error ? (groupError as any).message : String(groupError)}`
            });
            totalFailed++;
            continue;
          }

          if (!groupMembers || groupMembers.length === 0) {
            console.error(`No members found in group ${recipient.recipient_id}`);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: 'No members found in group'
            });
            totalFailed++;
            continue;
          }

          // Extract active members with phone numbers
          const validMembers = groupMembers
            .filter((m: any) => m && m.status === 'active' && m.primary_phone_number);

          if (validMembers.length === 0) {
            console.error(`No active members with phone numbers found in group ${recipient.recipient_id}`);
            results.push({
              success: false,
              recipientId: recipient.recipient_id,
              error: 'No active members with phone numbers found in group'
            });
            totalFailed++;
            continue;
          }

          // For group messages, we need to personalize for each member
          const personalizedMessages = [];
          const phoneNumbers = [];
          const memberIds = [];

          // Prepare personalized messages for each member
          for (const member of validMembers) {
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

          // Since we can't send different messages in bulk, we need to send them individually
          const bulkResults = [];
          let totalSentCount = 0;
          let totalFailedCount = 0;

          // Send messages individually with personalization
          for (let i = 0; i < phoneNumbers.length; i++) {
            try {
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
          const bulkResult = {
            success: totalSentCount > 0,
            messageId: `bulk_${Date.now()}`,
            bulkDetails: {
              totalSent: totalSentCount,
              totalFailed: totalFailedCount,
              destinations: bulkResults
            }
          };

          // Create message logs for each member
          for (let i = 0; i < memberIds.length; i++) {
            const memberId = memberIds[i];
            const phoneNumber = phoneNumbers[i];

            // Find the destination result for this phone number if available
            const destinationResult = bulkResult.bulkDetails?.destinations.find(
              d => d.destination === phoneNumber
            );

            const status = destinationResult?.status === 'failed' ? 'failed' : 'sent';
            const errorMessage = destinationResult?.error;

            // Create a log entry
            await supabaseAdmin
              .from('message_logs')
              .insert({
                message_id: messageId,
                recipient_id: memberId,
                status,
                error_message: errorMessage,
                message_id_from_provider: destinationResult?.messageId || bulkResult.messageId,
                sent_at: new Date().toISOString()
              });
          }

          results.push({
            success: bulkResult.success,
            recipientId: recipient.recipient_id,
            recipientType: 'group',
            bulkStats: {
              totalSent: bulkResult.bulkDetails?.totalSent || 0,
              totalFailed: bulkResult.bulkDetails?.totalFailed || 0,
              totalRecipients: phoneNumbers.length
            }
          });

          if (bulkResult.success) {
            totalSent++;

            // Set bulk send stats for the response
            bulkSendStats = {
              totalSent: bulkResult.bulkDetails?.totalSent || phoneNumbers.length,
              totalFailed: bulkResult.bulkDetails?.totalFailed || 0,
              totalRecipients: phoneNumbers.length
            };
          } else {
            totalFailed++;
          }
        }
      } catch (recipientError) {
        console.error(`Error processing recipient ${recipient.id}:`, recipientError);
        results.push({
          success: false,
          recipientId: recipient.recipient_id,
          error: recipientError instanceof Error ? recipientError.message : 'Unknown error'
        });
        totalFailed++;
      }
    }

    // Return the results
    return NextResponse.json({
      success: totalSent > 0,
      message,
      results,
      stats: {
        totalRecipients: recipients.length,
        totalSent,
        totalFailed
      },
      bulkSendStats,
      mockWarning: isMockProvider ? 'Using mock SMS provider. No actual SMS was sent.' : undefined
    });
  } catch (error) {
    console.error('Error in send message endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
