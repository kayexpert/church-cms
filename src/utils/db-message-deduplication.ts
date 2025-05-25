/**
 * Database-based message deduplication system
 * This ensures messages are not sent multiple times even across server restarts
 */

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role for more permissions
const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Check if a birthday message has already been sent to a member on a specific date
 * @param messageId The message ID
 * @param recipientId The recipient ID
 * @param date The date in YYYY-MM-DD format
 * @returns True if the message has already been sent, false otherwise
 */
export async function hasBirthdayMessageBeenSent(
  messageId: string,
  recipientId: string,
  date: string
): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Check if there's a log entry for this message, recipient, and date
    const { data, error, count } = await supabaseAdmin
      .from('message_logs')
      .select('*', { count: 'exact' })
      .eq('message_id', messageId)
      .eq('recipient_id', recipientId)
      .eq('message_type', 'birthday')
      .gte('sent_at', `${date}T00:00:00Z`)
      .lt('sent_at', `${date}T23:59:59Z`);
    
    if (error) {
      console.error('Error checking if birthday message has been sent:', error);
      // If there's an error, assume it hasn't been sent to be safe
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error('Unexpected error checking if birthday message has been sent:', error);
    // If there's an error, assume it hasn't been sent to be safe
    return false;
  }
}

/**
 * Log a birthday message as sent
 * @param messageId The message ID
 * @param recipientId The recipient ID
 * @param status The status of the message (sent, failed, etc.)
 * @param details Additional details about the message
 */
export async function logBirthdayMessage(
  messageId: string,
  recipientId: string,
  status: 'sent' | 'failed' | 'pending' | 'delivered' | 'rejected' | 'expired',
  details: {
    error_message?: string;
    message_id_from_provider?: string;
    delivery_status?: string;
    delivery_status_details?: string;
    cost?: number;
    segments?: number;
  } = {}
): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Create the log entry
    const { error } = await supabaseAdmin
      .from('message_logs')
      .insert({
        message_id: messageId,
        recipient_id: recipientId,
        status,
        message_type: 'birthday',
        sent_at: new Date().toISOString(),
        error_message: details.error_message || null,
        message_id_from_provider: details.message_id_from_provider || null,
        delivery_status: details.delivery_status || null,
        delivery_status_details: details.delivery_status_details || null,
        cost: details.cost || null,
        segments: details.segments || null
      });
    
    if (error) {
      console.error('Error logging birthday message:', error);
    }
  } catch (error) {
    console.error('Unexpected error logging birthday message:', error);
  }
}
