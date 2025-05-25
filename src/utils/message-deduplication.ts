/**
 * Message deduplication utility (legacy compatibility layer)
 * 
 * This file provides compatibility with older code that still imports
 * the message-deduplication utility. It forwards all calls to the
 * database-based deduplication system.
 */

import { hasBirthdayMessageBeenSent, logBirthdayMessage } from './db-message-deduplication';

// In-memory cache for quick lookups during a single request
// This is just a fallback in case the database check fails
const sentMessages = new Map<string, Set<string>>();

/**
 * Check if a message has already been sent to a recipient
 * @param messageKey A unique key for the message (can include date for birthday messages)
 * @param recipientId The recipient ID
 * @returns True if the message has already been sent, false otherwise
 */
export function hasMessageBeenSent(messageKey: string, recipientId: string): boolean {
  // First check the in-memory cache
  if (sentMessages.has(messageKey) && sentMessages.get(messageKey)?.has(recipientId)) {
    return true;
  }

  // For birthday messages, extract the date from the key if it's in the format messageId_recipientId_date
  const parts = messageKey.split('_');
  if (parts.length === 3) {
    const [messageId, , date] = parts;
    
    // Use the async function but don't await it - this is a synchronous function
    // that needs to return immediately. The database check will happen in the background.
    hasBirthdayMessageBeenSent(messageId, recipientId, date)
      .then(sent => {
        if (sent) {
          // Add to the in-memory cache for future checks
          if (!sentMessages.has(messageKey)) {
            sentMessages.set(messageKey, new Set());
          }
          sentMessages.get(messageKey)?.add(recipientId);
        }
      })
      .catch(error => {
        console.error('Error checking if message has been sent:', error);
      });
  }

  // Default to false to ensure messages are sent even if the check fails
  return false;
}

/**
 * Mark a message as sent to a recipient
 * @param messageKey A unique key for the message (can include date for birthday messages)
 * @param recipientId The recipient ID
 */
export function markMessageAsSent(messageKey: string, recipientId: string): void {
  // Add to the in-memory cache
  if (!sentMessages.has(messageKey)) {
    sentMessages.set(messageKey, new Set());
  }
  sentMessages.get(messageKey)?.add(recipientId);

  // For birthday messages, extract the date from the key if it's in the format messageId_recipientId_date
  const parts = messageKey.split('_');
  if (parts.length === 3) {
    const [messageId, , date] = parts;
    
    // Log the message as sent in the database
    logBirthdayMessage(messageId, recipientId, 'sent')
      .catch(error => {
        console.error('Error logging message as sent:', error);
      });
  }
}

/**
 * Clear the in-memory cache
 * This is useful for testing or when you want to force messages to be sent again
 */
export function clearMessageDeduplicationCache(): void {
  sentMessages.clear();
}
