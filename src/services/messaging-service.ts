import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import {
  Message,
  MessageWithRecipients,
  MessageRecipient,
  MessageLog,
  MessageTemplate
} from '@/types/messaging';
import { ServiceResponse, PaginatedResponse } from '@/types/common';
import { Member } from '@/types/member';

// Create a server-side Supabase client with service role for server operations
function getSupabaseClient() {
  // Check if we're running on the server side
  if (typeof window === 'undefined') {
    // Server-side: use service role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      return createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  // Client-side: use the regular client
  return supabase;
}

/**
 * Get all messages with pagination
 */
export async function getMessages(
  page: number = 1,
  pageSize: number = 10,
  filters: { status?: string; type?: string } = {}
): Promise<ServiceResponse<PaginatedResponse<Message>>> {
  try {
    console.log(`Fetching messages: page=${page}, pageSize=${pageSize}, filters=`, JSON.stringify(filters));
    console.log(`Looking for messages with type=${filters.type || 'any'} and status=${filters.status || 'any'}`);

    const client = getSupabaseClient();
    let query = client
      .from('messages')
      .select('*', { count: 'exact' });

    // Apply filters if provided
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      if (filters.type === 'birthday') {
        // Handle birthday messages (stored as group type with special name)
        // Use a simpler approach that works with the client library
        query = query.eq('type', 'group').ilike('name', '[Birthday]%');
      } else {
        query = query.eq('type', filters.type);
      }
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    console.log(`Query range: from=${from}, to=${to}`);

    // Execute query with range
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
    }

    // Validate the data
    if (!data) {
      console.error('No data returned from messages query');
      return {
        data: {
          data: [],
          count: 0,
          page,
          pageSize
        },
        error: null
      };
    }

    // Validate each message object and normalize birthday messages
    const validMessages = data.filter((message: any) => {
      if (!message || !message.id) {
        console.error('Invalid message object in query result:', message);
        return false;
      }
      return true;
    }).map((message: any) => ({
      ...message,
      // Normalize birthday messages
      type: message.name?.startsWith('[Birthday]') ? 'birthday' : message.type,
      // Add computed fields
      is_birthday: message.name?.startsWith('[Birthday]') || message.type === 'birthday',
      is_scheduled: message.status === 'scheduled' || (message.status === 'active' && new Date(message.schedule_time) > new Date()),
      is_overdue: message.status === 'active' && new Date(message.schedule_time) < new Date()
    }));

    console.log(`Fetched ${validMessages.length} valid messages out of ${data.length} total`);

    return {
      data: {
        data: validMessages as Message[],
        count: count || 0,
        page,
        pageSize
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getMessages:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single message by ID with its recipients
 */
export async function getMessageById(id: string): Promise<ServiceResponse<MessageWithRecipients>> {
  try {
    const client = getSupabaseClient();

    // Get the message
    const { data: message, error: messageError } = await client
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (messageError) {
      console.error(`Error fetching message ${id}:`, messageError);
      return { data: null, error: messageError };
    }

    // Get the message recipients
    const { data: recipients, error: recipientsError } = await client
      .from('message_recipients')
      .select('*')
      .eq('message_id', id);

    if (recipientsError) {
      console.error(`Error fetching recipients for message ${id}:`, recipientsError);
      return { data: null, error: recipientsError };
    }

    // Combine the message with its recipients
    const messageWithRecipients: MessageWithRecipients = {
      ...message as Message,
      recipients: recipients as MessageRecipient[]
    };

    return { data: messageWithRecipients, error: null };
  } catch (error) {
    console.error('Error in getMessageById:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new message with recipients
 */
export async function createMessage(
  message: Omit<Message, 'id' | 'created_at' | 'updated_at'>,
  recipients: Omit<MessageRecipient, 'id' | 'message_id' | 'created_at'>[]
): Promise<ServiceResponse<Message>> {
  try {
    console.log('Creating message:', message);
    const client = getSupabaseClient();

    // Check if the messages table exists
    try {
      const { count, error: checkError } = await client
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (checkError) {
        console.error('Error checking messages table:', checkError);
        if (checkError.message.includes('relation') || checkError.message.includes('does not exist')) {
          return {
            data: null,
            error: new Error('The messages table does not exist. Please initialize the messaging tables first.')
          };
        }
      }

      console.log('Messages table exists, count:', count);
    } catch (checkError) {
      console.error('Error checking messages table:', checkError);
    }

    // Start a transaction
    const { data, error } = await client
      .from('messages')
      .insert({
        name: message.name,
        content: message.content,
        type: message.type,
        frequency: message.frequency,
        schedule_time: message.schedule_time,
        end_date: message.end_date,
        status: message.status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);

      // Provide more context for database errors
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          data: null,
          error: new Error('The messages table does not exist. Please initialize the messaging tables first.')
        };
      }

      return { data: null, error };
    }

    // Insert recipients
    if (recipients.length > 0) {
      const recipientsToInsert = recipients.map(recipient => ({
        message_id: data.id,
        recipient_type: recipient.recipient_type,
        recipient_id: recipient.recipient_id
      }));

      console.log('Inserting recipients:', recipientsToInsert);

      const { error: recipientsError } = await client
        .from('message_recipients')
        .insert(recipientsToInsert);

      if (recipientsError) {
        console.error('Error creating message recipients:', recipientsError);

        // Provide more context for database errors
        if (recipientsError.message.includes('relation') || recipientsError.message.includes('does not exist')) {
          return {
            data: null,
            error: new Error('The message_recipients table does not exist. Please initialize the messaging tables first.')
          };
        }

        // If there's a foreign key error, it might be because the message was created but the recipients table doesn't exist
        if (recipientsError.message.includes('foreign key constraint')) {
          // Return the message without recipients as a partial success
          console.warn('Foreign key constraint error. Returning message without recipients.');
          return { data: data as Message, error: null };
        }

        return { data: null, error: recipientsError };
      }
    }

    return { data: data as Message, error: null };
  } catch (error) {
    console.error('Error in createMessage:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing message
 */
export async function updateMessage(
  id: string,
  message: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>,
  recipients?: Omit<MessageRecipient, 'id' | 'message_id' | 'created_at'>[]
): Promise<ServiceResponse<Message>> {
  try {
    const client = getSupabaseClient();

    // Update the message
    const { data, error } = await client
      .from('messages')
      .update({
        ...message,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating message ${id}:`, error);
      return { data: null, error };
    }

    // If recipients are provided, update them
    if (recipients) {
      // First, delete existing recipients
      const { error: deleteError } = await client
        .from('message_recipients')
        .delete()
        .eq('message_id', id);

      if (deleteError) {
        console.error(`Error deleting recipients for message ${id}:`, deleteError);
        return { data: null, error: deleteError };
      }

      // Then, insert new recipients
      if (recipients.length > 0) {
        const recipientsToInsert = recipients.map(recipient => ({
          message_id: id,
          recipient_type: recipient.recipient_type,
          recipient_id: recipient.recipient_id
        }));

        const { error: insertError } = await client
          .from('message_recipients')
          .insert(recipientsToInsert);

        if (insertError) {
          console.error(`Error inserting recipients for message ${id}:`, insertError);
          return { data: null, error: insertError };
        }
      }
    }

    return { data: data as Message, error: null };
  } catch (error) {
    console.error('Error in updateMessage:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(id: string): Promise<ServiceResponse<null>> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting message ${id}:`, error);
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error in deleteMessage:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete multiple messages
 */
export async function deleteMessages(ids: string[]): Promise<ServiceResponse<null>> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('messages')
      .delete()
      .in('id', ids);

    if (error) {
      console.error(`Error deleting messages ${ids.join(', ')}:`, error);
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error in deleteMessages:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get message logs with pagination
 */
export async function getMessageLogs(
  page: number = 1,
  pageSize: number = 10,
  filters: { status?: string; message_id?: string } = {}
): Promise<ServiceResponse<PaginatedResponse<MessageLog>>> {
  try {
    const client = getSupabaseClient();
    let query = client
      .from('message_logs')
      .select('*', { count: 'exact' });

    // Apply filters if provided
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.message_id) {
      query = query.eq('message_id', filters.message_id);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Execute query with range
    const { data, error, count } = await query
      .order('sent_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching message logs:', error);
      return { data: null, error };
    }

    return {
      data: {
        data: data as MessageLog[],
        count: count || 0,
        page,
        pageSize
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getMessageLogs:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a message log entry
 */
export async function createMessageLog(
  log: Omit<MessageLog, 'id' | 'sent_at'>
): Promise<ServiceResponse<MessageLog>> {
  try {
    // Generate a unique request ID for tracking this operation
    const requestId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Log the input for debugging
    console.log(`[${requestId}] Creating message log with data:`, JSON.stringify({
      message_id: log.message_id,
      recipient_id: log.recipient_id,
      status: log.status,
      has_error: !!log.error_message,
      has_provider_id: !!log.message_id_from_provider
    }, null, 2));

    // Validate required fields to prevent database errors
    if (!log.message_id) {
      console.error(`[${requestId}] Error creating message log: message_id is required`);
      return {
        data: null,
        error: new Error('message_id is required for creating a message log')
      };
    }

    if (!log.recipient_id) {
      console.error(`[${requestId}] Error creating message log: recipient_id is required`);
      return {
        data: null,
        error: new Error('recipient_id is required for creating a message log')
      };
    }

    // Ensure status is valid
    const validStatuses = ['sent', 'failed', 'pending', 'delivered', 'rejected', 'expired', 'error'];
    if (!log.status || !validStatuses.includes(log.status)) {
      console.error(`[${requestId}] Error creating message log: Invalid status '${log.status}'. Using 'pending' as default.`);
      log.status = 'pending';
    }

    // Sanitize error message to prevent database errors
    if (log.error_message) {
      // Limit error message length to 1000 characters
      if (log.error_message.length > 1000) {
        log.error_message = log.error_message.substring(0, 997) + '...';
      }

      // Remove any null characters or other problematic characters
      log.error_message = log.error_message.replace(/\0/g, '');
    }

    // Check if a log already exists for this message and recipient
    // to prevent duplicate logs
    const client = getSupabaseClient();
    const { data: existingLog, error: checkError } = await client
      .from('message_logs')
      .select('*')
      .eq('message_id', log.message_id)
      .eq('recipient_id', log.recipient_id)
      .maybeSingle();

    if (!checkError && existingLog) {
      console.log(`Message log already exists for message ${log.message_id} and recipient ${log.recipient_id}`);

      // If the existing log has a 'pending' status and the new log has a different status,
      // update the existing log with the new status
      if (existingLog.status === 'pending' && log.status !== 'pending') {
        console.log(`Updating existing log from 'pending' to '${log.status}'`);

        const { data: updatedLog, error: updateError } = await client
          .from('message_logs')
          .update({
            status: log.status,
            error_message: log.error_message,
            message_id_from_provider: log.message_id_from_provider
          })
          .eq('id', existingLog.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating existing message log:', updateError);
          return { data: existingLog as MessageLog, error: null }; // Return the existing log anyway
        }

        return { data: updatedLog as MessageLog, error: null };
      }

      return { data: existingLog as MessageLog, error: null };
    }

    // Create a new log entry with all possible fields
    const logData = {
      message_id: log.message_id,
      recipient_id: log.recipient_id,
      status: log.status,
      error_message: log.error_message || null,
      message_id_from_provider: log.message_id_from_provider || null,
      message_type: log.message_type || null,
      sent_at: new Date().toISOString(),
      delivered_at: log.delivered_at || null,
      delivery_status: log.delivery_status || null,
      delivery_status_details: log.delivery_status_details || null,
      cost: log.cost || null,
      segments: log.segments || null
    };

    console.log(`[${requestId}] Inserting new message log:`, {
      message_id: logData.message_id,
      recipient_id: logData.recipient_id,
      status: logData.status
    });

    try {
      const { data, error } = await client
        .from('message_logs')
        .insert(logData)
        .select()
        .single();

      if (error) {
        console.error(`[${requestId}] Error creating message log:`, error);

        // Check for specific error types and provide more helpful messages
        if (error.message.includes('foreign key constraint')) {
          console.error(`[${requestId}] Foreign key constraint error. Check that message_id and recipient_id exist in their respective tables.`);

          // Try a simplified insert without the select
          try {
            const { error: retryError } = await client
              .from('message_logs')
              .insert(logData);

            if (retryError) {
              console.error(`[${requestId}] Retry also failed:`, retryError);
              return { data: null, error };
            } else {
              console.log(`[${requestId}] Simplified insert succeeded, but no data returned`);
              return {
                data: {
                  id: `generated_${Date.now()}`,
                  ...logData
                } as MessageLog,
                error: null
              };
            }
          } catch (retryError) {
            console.error(`[${requestId}] Error in retry:`, retryError);
            return { data: null, error };
          }
        } else if (error.message.includes('violates check constraint')) {
          console.error(`[${requestId}] Check constraint violation. Ensure status is valid.`);
        }

        return { data: null, error };
      }

      console.log(`[${requestId}] Message log created successfully:`, {
        id: data.id,
        status: data.status
      });

      return { data: data as MessageLog, error: null };
    } catch (insertError) {
      console.error(`[${requestId}] Exception during insert:`, insertError);

      // Try one more time with a simplified approach
      try {
        const { error: simpleError } = await client
          .from('message_logs')
          .insert({
            message_id: log.message_id,
            recipient_id: log.recipient_id,
            status: log.status,
            sent_at: new Date().toISOString()
          });

        if (simpleError) {
          console.error(`[${requestId}] Simplified insert also failed:`, simpleError);
        } else {
          console.log(`[${requestId}] Simplified insert succeeded`);
          return {
            data: {
              id: `simplified_${Date.now()}`,
              message_id: log.message_id,
              recipient_id: log.recipient_id,
              status: log.status,
              sent_at: new Date().toISOString()
            } as MessageLog,
            error: null
          };
        }
      } catch (finalError) {
        console.error(`[${requestId}] Final attempt failed:`, finalError);
      }

      throw insertError;
    }
  } catch (error) {
    // Generate a request ID for this error if we don't have one
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Handle the empty error object case that's causing the console error
    if (!error || Object.keys(error).length === 0) {
      console.error(`[${errorId}] Error in createMessageLog: Empty error object received`);

      // Create a dummy log entry to prevent further errors
      const dummyLog = {
        id: `dummy_${Date.now()}`,
        message_id: log.message_id || 'unknown',
        recipient_id: log.recipient_id || 'unknown',
        status: log.status || 'failed',
        error_message: 'Error creating message log: Empty error object',
        sent_at: new Date().toISOString()
      };

      return {
        data: dummyLog as MessageLog,
        error: new Error('Empty error object received when creating message log')
      };
    }

    console.error(`[${errorId}] Error in createMessageLog:`, error);

    // Try a last-resort direct insert without any bells and whistles
    try {
      const client = getSupabaseClient();
      await client
        .from('message_logs')
        .insert({
          message_id: log.message_id,
          recipient_id: log.recipient_id,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: new Date().toISOString()
        });
      console.log(`[${errorId}] Last-resort insert succeeded`);
    } catch (finalError) {
      console.error(`[${errorId}] Last-resort insert failed:`, finalError);
    }

    return { data: null, error: error as Error };
  }
}

/**
 * Get all message templates
 */
export async function getMessageTemplates(): Promise<ServiceResponse<MessageTemplate[]>> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('message_templates')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching message templates:', error);
      return { data: null, error };
    }

    return { data: data as MessageTemplate[], error: null };
  } catch (error) {
    console.error('Error in getMessageTemplates:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single message template by ID
 */
export async function getMessageTemplateById(id: string): Promise<ServiceResponse<MessageTemplate>> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching message template ${id}:`, error);
      return { data: null, error };
    }

    return { data: data as MessageTemplate, error: null };
  } catch (error) {
    console.error('Error in getMessageTemplateById:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new message template
 */
export async function createMessageTemplate(
  template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceResponse<MessageTemplate>> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('message_templates')
      .insert({
        name: template.name,
        content: template.content
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message template:', error);
      return { data: null, error };
    }

    return { data: data as MessageTemplate, error: null };
  } catch (error) {
    console.error('Error in createMessageTemplate:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing message template
 */
export async function updateMessageTemplate(
  id: string,
  template: Partial<Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<ServiceResponse<MessageTemplate>> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('message_templates')
      .update({
        ...template,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating message template ${id}:`, error);
      return { data: null, error };
    }

    return { data: data as MessageTemplate, error: null };
  } catch (error) {
    console.error('Error in updateMessageTemplate:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a message template
 */
export async function deleteMessageTemplate(id: string): Promise<ServiceResponse<null>> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting message template ${id}:`, error);
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error in deleteMessageTemplate:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get active members by IDs
 */
export async function getMembersByIds(ids: string[]): Promise<ServiceResponse<Member[]>> {
  try {
    if (ids.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .in('id', ids)
      .eq('status', 'active'); // Only get active members

    if (error) {
      console.error('Error fetching members by IDs:', error);
      return { data: null, error };
    }

    console.log(`Found ${data?.length || 0} active members out of ${ids.length} requested IDs`);
    return { data: data as Member[], error: null };
  } catch (error) {
    console.error('Error in getMembersByIds:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get active members by group ID using the API
 */
export async function getMembersByGroupId(groupId: string): Promise<ServiceResponse<Member[]>> {
  try {
    // Use the API to get members
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/groups/${groupId}/members`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error fetching members for group ${groupId}:`, errorData);
      return {
        data: null,
        error: new Error(errorData.error || `Failed to fetch members: ${response.statusText}`)
      };
    }

    const result = await response.json();

    if (!result.success) {
      console.error(`Error in API response for group ${groupId}:`, result.error);
      return {
        data: null,
        error: new Error(result.error || 'Failed to fetch members from API')
      };
    }

    console.log(`Found ${result.data?.length || 0} active members in group ${groupId}`);
    return { data: result.data as Member[], error: null };
  } catch (error) {
    console.error('Error in getMembersByGroupId:', error);
    return { data: null, error: error as Error };
  }
}
