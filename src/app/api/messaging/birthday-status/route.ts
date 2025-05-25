import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role for more permissions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET /api/messaging/birthday-status
 * Check if there are any birthday messages that need to be processed today
 */
export async function GET() {
  try {
    console.log('Birthday status check endpoint called');

    // Get current date
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const day = now.getDate();

    console.log(`Checking for birthdays on month: ${month}, day: ${day}`);

    // Get all active birthday messages
    const { data: birthdayMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('type', 'group')
      .ilike('name', '[Birthday]%')
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
        needsProcessing: false,
        reason: 'No active birthday messages found'
      });
    }

    console.log(`Found ${birthdayMessages.length} active birthday messages`);

    // Get all active members with birthdays on the current date
    const { data: members, error: membersError } = await supabaseAdmin
      .from('members')
      .select('id, first_name, last_name, date_of_birth, status')
      .eq('status', 'active')
      .not('date_of_birth', 'is', null);

    if (membersError) {
      console.error('Error getting members:', membersError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get members',
        details: membersError.message
      }, { status: 500 });
    }

    // Filter members with birthdays on the current date
    const birthdayMembers = members?.filter(member => {
      if (!member.date_of_birth) return false;

      try {
        // Parse the date parts directly to avoid timezone issues
        const dateParts = member.date_of_birth.split('-');
        if (dateParts.length !== 3) return false;

        // Create a date object using the date parts
        const birthDate = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]) // day
        );

        // Get month (1-12) and day
        const birthMonth = birthDate.getMonth() + 1;
        const birthDay = birthDate.getDate();

        return birthMonth === month && birthDay === day;
      } catch (error) {
        console.error(`Error parsing date for member ${member.id}:`, error);
        return false;
      }
    }) || [];

    if (birthdayMembers.length === 0) {
      return NextResponse.json({
        success: true,
        needsProcessing: false,
        reason: 'No members with birthdays found for the current date'
      });
    }

    // Check if any messages have already been sent today
    const today = now.toISOString().split('T')[0];
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('message_logs')
      .select('*')
      .in('message_id', birthdayMessages.map(m => m.id))
      .in('recipient_id', birthdayMembers.map(m => m.id))
      .gte('sent_at', `${today}T00:00:00Z`)
      .lt('sent_at', `${today}T23:59:59Z`);

    if (logsError) {
      console.error('Error checking message logs:', logsError);
      // If there's an error, assume we need to process to be safe
      return NextResponse.json({
        success: true,
        needsProcessing: true,
        reason: 'Error checking message logs'
      });
    }

    if (logs && logs.length > 0) {
      console.log(`Found ${logs.length} birthday messages already sent today`);

      // Check if all possible combinations have been sent
      const totalPossibleMessages = birthdayMessages.length * birthdayMembers.length;

      if (logs.length >= totalPossibleMessages) {
        console.log('All birthday messages have already been sent today');
        return NextResponse.json({
          success: true,
          needsProcessing: false,
          reason: 'All birthday messages have already been sent today'
        });
      }
    }

    // If we get here, there are birthday messages that need to be sent
    return NextResponse.json({
      success: true,
      needsProcessing: true,
      birthdayMessagesCount: birthdayMessages.length,
      birthdayMembersCount: birthdayMembers.length
    });
  } catch (error) {
    console.error('Error in birthday status check endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check birthday status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
