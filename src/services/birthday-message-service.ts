import { supabase } from '@/lib/supabase';
import { Member } from '@/types/member';
import { Message } from '@/types/messaging';
import { BirthdayMessage, BirthdayMessageFormValues } from '@/types/birthday-messaging';
import { ServiceResponse } from '@/types/common';
import { sendAndLogMessage, getDefaultSMSConfig, sendSMSWithConfig } from './sms-service';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/utils/phone-utils';
import { personalizeMessage } from '@/utils/message-utils';

/**
 * Get members with birthdays in the next N days
 * @param days Number of days to look ahead
 * @returns Array of members with upcoming birthdays
 */
export async function getMembersWithUpcomingBirthdays(days: number = 7): Promise<ServiceResponse<Member[]>> {
  try {
    // Get current date
    const today = new Date();

    // First, get all active members with a birth date
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .not('date_of_birth', 'is', null);

    if (error) {
      console.error('Error fetching members for upcoming birthdays:', error);
      return { data: null, error };
    }

    // Calculate upcoming birthdays client-side
    const upcomingBirthdays = data.filter(member => {
      if (!member.date_of_birth) return false;

      try {
        const birthDate = new Date(member.date_of_birth);

        // Create dates for checking each day in the range
        for (let i = 0; i <= days; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() + i);

          // Check if month and day match
          if (birthDate.getMonth() === checkDate.getMonth() &&
              birthDate.getDate() === checkDate.getDate()) {
            return true;
          }
        }

        return false;
      } catch (e) {
        console.error(`Error parsing date for member ${member.id}:`, e);
        return false;
      }
    });

    console.log(`Found ${upcomingBirthdays.length} members with birthdays in the next ${days} days`);
    return { data: upcomingBirthdays as Member[], error: null };
  } catch (error) {
    console.error('Error in getMembersWithUpcomingBirthdays:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get members with birthdays today
 * @returns Array of members with birthdays today
 */
export async function getMembersWithBirthdaysToday(): Promise<ServiceResponse<Member[]>> {
  return getMembersWithUpcomingBirthdays(0);
}

/**
 * Get members with birthdays on a specific date (month and day)
 * @param month Month (1-12)
 * @param day Day (1-31)
 * @returns Array of members with birthdays on the specified date
 */
export async function getMembersWithBirthdaysOnDate(month: number, day: number): Promise<ServiceResponse<Member[]>> {
  try {
    // First, get all active members with a birth date
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .not('date_of_birth', 'is', null);

    if (error) {
      console.error(`Error fetching members for birthday date ${month}/${day}:`, error);
      return { data: null, error };
    }

    // Filter members with birthdays on the specified date client-side
    const membersWithBirthdaysOnDate = data.filter(member => {
      if (!member.date_of_birth) return false;

      try {
        // Parse the date parts directly to avoid timezone issues
        const dateParts = member.date_of_birth.split('-');
        if (dateParts.length !== 3) {
          console.log(`Member ${member.id} has invalid date format: ${member.date_of_birth}`);
          return false;
        }

        // Create a date object using the date parts
        // Note: months are 0-indexed in JavaScript Date
        const birthDate = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]) // day
        );

        // Get month (1-12) and day
        const birthMonth = birthDate.getMonth() + 1;
        const birthDay = birthDate.getDate();

        console.log(`Checking member ${member.first_name} ${member.last_name}: birth date=${member.date_of_birth}, parsed month=${birthMonth}, day=${birthDay}, comparing with month=${month}, day=${day}`);

        return birthMonth === month && birthDay === day;
      } catch (e) {
        console.error(`Error parsing date for member ${member.id}:`, e);
        return false;
      }
    });

    console.log(`Found ${membersWithBirthdaysOnDate.length} members with birthdays on ${month}/${day}`);
    return { data: membersWithBirthdaysOnDate as Member[], error: null };
  } catch (error) {
    console.error('Error in getMembersWithBirthdaysOnDate:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get members with birthdays in a specific month
 * @param month Month (1-12)
 * @returns Array of members with birthdays in the specified month
 */
export async function getMembersByMonth(month: number): Promise<ServiceResponse<Member[]>> {
  try {
    // First, get all active members with a birth date
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .not('date_of_birth', 'is', null);

    if (error) {
      console.error(`Error fetching members for birthday month ${month}:`, error);
      return { data: null, error };
    }

    // Filter members with birthdays in the specified month client-side
    const membersWithBirthdaysInMonth = data.filter(member => {
      if (!member.date_of_birth) return false;

      try {
        // Parse the date parts directly to avoid timezone issues
        const dateParts = member.date_of_birth.split('-');
        if (dateParts.length !== 3) {
          console.log(`Member ${member.id} has invalid date format: ${member.date_of_birth}`);
          return false;
        }

        // Create a date object using the date parts
        // Note: months are 0-indexed in JavaScript Date
        const birthDate = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]) // day
        );

        // Get month (1-12)
        const birthMonth = birthDate.getMonth() + 1;

        return birthMonth === month;
      } catch (e) {
        console.error(`Error parsing date for member ${member.id}:`, e);
        return false;
      }
    });

    console.log(`Found ${membersWithBirthdaysInMonth.length} members with birthdays in month ${month}`);
    return { data: membersWithBirthdaysInMonth as Member[], error: null };
  } catch (error) {
    console.error('Error in getMembersByMonth:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get active birthday messages
 * @returns Array of active birthday messages
 */
export async function getActiveBirthdayMessages(): Promise<ServiceResponse<Message[]>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('type', 'birthday')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching active birthday messages:', error);
      return { data: null, error };
    }

    return { data: data as Message[], error: null };
  } catch (error) {
    console.error('Error in getActiveBirthdayMessages:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Process birthday messages for a specific date
 * @param date Date to process birthday messages for
 */
export async function processBirthdayMessagesForDate(date: Date = new Date()): Promise<void> {
  try {
    // Get active birthday messages
    const { data: messages } = await getActiveBirthdayMessages();

    if (!messages || messages.length === 0) {
      console.log('No active birthday messages found');
      return;
    }

    // Process each message
    for (const message of messages) {
      await processBirthdayMessage(message, date);
    }
  } catch (error) {
    console.error('Error in processBirthdayMessagesForDate:', error);
  }
}

/**
 * Process a single birthday message
 * @param message Birthday message to process
 * @param currentDate Current date
 */
async function processBirthdayMessage(message: Message, currentDate: Date): Promise<void> {
  try {
    // Calculate the target date based on days_before
    const targetDate = new Date(currentDate);
    if (message.days_before) {
      targetDate.setDate(targetDate.getDate() + message.days_before);
    }

    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    // Get members with birthdays on the target date
    const { data: members } = await getMembersWithBirthdaysOnDate(targetMonth, targetDay);

    if (!members || members.length === 0) {
      console.log(`No members with birthdays on ${targetMonth}/${targetDay}`);
      return;
    }

    console.log(`Found ${members.length} members with birthdays on ${targetMonth}/${targetDay}`);

    // Get the default SMS configuration
    const smsConfigResponse = await getDefaultSMSConfig();

    if (!smsConfigResponse.success || !smsConfigResponse.config) {
      console.error('Failed to get SMS configuration for birthday messages:', smsConfigResponse.error);
      return;
    }

    const smsConfig = smsConfigResponse.config;
    console.log('Using SMS configuration for birthday messages:', {
      provider: smsConfig.provider_name,
      senderId: smsConfig.sender_id,
      hasApiKey: !!smsConfig.api_key
    });

    // Send message to each member
    for (const member of members) {
      if (member.primary_phone_number) {
        try {
          // Validate the phone number
          if (!isValidPhoneNumber(member.primary_phone_number)) {
            console.warn(`Invalid phone number format for member ${member.id}: ${member.primary_phone_number}. Skipping birthday message.`);
            continue;
          }

          // Normalize the phone number
          const normalizedPhone = normalizePhoneNumber(member.primary_phone_number);

          // Personalize the message content
          const personalizedContent = personalizeMessage(message.content, member);

          // Send the message using the default SMS configuration
          const smsResult = await sendSMSWithConfig(
            smsConfig,
            normalizedPhone,
            personalizedContent,
            smsConfig.sender_id
          );

          if (!smsResult.success) {
            console.error(`Failed to send birthday message to ${member.first_name} ${member.last_name}:`, smsResult.error);
            continue;
          }

          // Log the message
          await supabase
            .from('message_logs')
            .insert({
              message_id: message.id,
              recipient_id: member.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
              message_id_from_provider: smsResult.messageId
            });

          console.log(`Birthday message sent to ${member.first_name} ${member.last_name} at ${normalizedPhone}`);
        } catch (error) {
          console.error(`Error sending birthday message to member ${member.id}:`, error);
        }
      } else {
        console.warn(`Member ${member.id} (${member.first_name} ${member.last_name}) has no phone number. Skipping birthday message.`);
      }
    }
  } catch (error) {
    console.error('Error in processBirthdayMessage:', error);
  }
}

// Using the shared personalizeMessage function from utils/message-utils.ts

/**
 * Create a new birthday message
 */
export async function createBirthdayMessage(
  values: BirthdayMessageFormValues
): Promise<ServiceResponse<BirthdayMessage>> {
  try {
    console.log('Creating birthday message with dedicated service:', values);

    // Set default days_before if not provided
    if (values.days_before === undefined) {
      values.days_before = 0;
    }

    // First try the enhanced messaging service endpoint
    try {
      console.log('Trying enhanced messaging service endpoint first');

      const response = await fetch('/api/messaging/create-birthday-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          content: values.content,
          type: 'birthday', // This will be converted to 'group' in the API
          days_before: values.days_before,
          status: values.status || 'active',
          frequency: 'yearly' // This will be converted to 'monthly' in the API
        }),
      });

      console.log('Enhanced API response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('Enhanced API response data:', data);

        if (data.success) {
          console.log('Birthday message created successfully via enhanced API:', data.message);
          return {
            data: data.message,
            error: null
          };
        }
      }

      // If enhanced endpoint fails, continue to dedicated endpoint
      console.log('Enhanced endpoint failed, trying dedicated endpoint');
    } catch (enhancedApiError) {
      console.error('Error with enhanced API endpoint:', enhancedApiError);
      // Continue to dedicated endpoint
    }

    // Call the dedicated birthday message API
    try {
      const requestData = {
        name: values.name,
        content: values.content,
        days_before: values.days_before,
        status: values.status || 'active'
      };

      console.log('Sending request to birthday message API with data:', requestData);

      const response = await fetch('/api/messaging/birthday-messages-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('API response status:', response.status, response.statusText);

      // Get the response text first for debugging
      const responseText = await response.text();
      console.log('API response text:', responseText);

      let data;
      try {
        // Parse the text as JSON
        data = JSON.parse(responseText);
        console.log('API response data:', data);
      } catch (jsonError) {
        console.error('Error parsing API response:', jsonError, 'Response text:', responseText);
        return {
          data: null,
          error: new Error(`Failed to parse API response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}. Response: ${responseText.substring(0, 100)}...`)
        };
      }

      if (!response.ok || !data.success) {
        const errorDetails = data.details ? `: ${JSON.stringify(data.details)}` : '';
        console.error('Error creating birthday message:', data.error || 'Unknown error', errorDetails);
        return {
          data: null,
          error: new Error(`${data.error || 'Failed to create birthday message'}${errorDetails}`)
        };
      }

      console.log('Birthday message created successfully:', data.message);

      return {
        data: data.message,
        error: null
      };
    } catch (apiError) {
      console.error('API error creating birthday message:', apiError);

      // Try one more approach - direct insert to messages table
      try {
        console.log('Trying direct insert to messages table');

        const response = await fetch('/api/messaging/create-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: values.name,
            content: values.content,
            type: 'group', // Must be 'group' due to database constraints
            days_before: values.days_before,
            status: values.status || 'active',
            frequency: 'monthly', // Must be one of the allowed frequencies
            is_birthday_message: true // Flag to indicate this is a birthday message
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('Birthday message created successfully via direct insert:', data.message);
            return {
              data: data.message,
              error: null
            };
          }
        }

        // If all approaches fail, return the original error
        return {
          data: null,
          error: apiError instanceof Error ? apiError : new Error('Unknown error creating birthday message')
        };
      } catch (directInsertError) {
        console.error('Error with direct insert approach:', directInsertError);
        return {
          data: null,
          error: apiError instanceof Error ? apiError : new Error('Unknown error creating birthday message')
        };
      }
    }
  } catch (error) {
    console.error('Error in createBirthdayMessage:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all birthday messages
 */
export async function getBirthdayMessages(): Promise<ServiceResponse<BirthdayMessage[]>> {
  try {
    console.log('Fetching birthday messages from API');
    const response = await fetch('/api/messaging/birthday-messages-db', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Birthday messages API response status:', response.status, response.statusText);

    const data = await response.json();
    console.log('Birthday messages API response data:', data);

    if (!response.ok || !data.success) {
      console.error('Error getting birthday messages:', data.error || 'Unknown error');
      return {
        data: null,
        error: new Error(data.error || 'Failed to get birthday messages')
      };
    }

    console.log(`Found ${data.messages?.length || 0} birthday messages`);

    if (data.messages?.length > 0) {
      console.log('First birthday message:', data.messages[0]);
    }

    return {
      data: data.messages,
      error: null
    };
  } catch (error) {
    console.error('Error in getBirthdayMessages:', error);
    return { data: null, error: error as Error };
  }
}
