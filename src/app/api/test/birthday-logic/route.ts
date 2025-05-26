import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/test/birthday-logic
 * Test the birthday message logic comprehensively
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Testing birthday message logic...');

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const testResults = [];

    // Test 1: Create a test birthday message
    console.log('Test 1: Creating test birthday message...');
    try {
      const birthdayMessageData = {
        name: 'Test Birthday Message',
        content: 'Happy Birthday {name}! 🎉 May God bless you on your special day!',
        days_before: 0,
        status: 'active'
      };

      const createResponse = await fetch(`${request.nextUrl.origin}/api/messaging/create-birthday-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(birthdayMessageData)
      });

      const createResult = await createResponse.json();

      if (createResult.success) {
        testResults.push({
          test: 'Create Birthday Message',
          status: 'PASS',
          details: `Created message with ID: ${createResult.message?.id}`,
          messageId: createResult.message?.id
        });
      } else {
        testResults.push({
          test: 'Create Birthday Message',
          status: 'FAIL',
          details: createResult.error || 'Unknown error'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Create Birthday Message',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Check if birthday messages are properly stored
    console.log('Test 2: Checking birthday message storage...');
    try {
      const { data: birthdayMessages, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .or('type.eq.birthday,and(type.eq.group,name.ilike.[Birthday]%)')
        .eq('status', 'active');

      if (!error && birthdayMessages) {
        testResults.push({
          test: 'Birthday Message Storage',
          status: 'PASS',
          details: `Found ${birthdayMessages.length} birthday messages in database`,
          data: birthdayMessages.map(msg => ({
            id: msg.id,
            name: msg.name,
            type: msg.type,
            payload: msg.payload
          }))
        });
      } else {
        testResults.push({
          test: 'Birthday Message Storage',
          status: 'FAIL',
          details: error?.message || 'No birthday messages found'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Birthday Message Storage',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Create test members with birthdays
    console.log('Test 3: Creating test members with birthdays...');
    try {
      const today = new Date();
      const testMembers = [
        {
          first_name: 'Test',
          last_name: 'Birthday1',
          primary_phone_number: '+1234567890',
          date_of_birth: new Date(1990, today.getMonth(), today.getDate()).toISOString().split('T')[0], // Birthday today
          status: 'active'
        },
        {
          first_name: 'Test',
          last_name: 'Birthday2',
          primary_phone_number: '+1234567891',
          date_of_birth: new Date(1985, today.getMonth(), today.getDate() + 1).toISOString().split('T')[0], // Birthday tomorrow
          status: 'active'
        }
      ];

      const { data: createdMembers, error: memberError } = await supabaseAdmin
        .from('members')
        .insert(testMembers)
        .select();

      if (!memberError && createdMembers) {
        testResults.push({
          test: 'Create Test Members',
          status: 'PASS',
          details: `Created ${createdMembers.length} test members with birthdays`,
          memberIds: createdMembers.map(m => m.id)
        });
      } else {
        testResults.push({
          test: 'Create Test Members',
          status: 'FAIL',
          details: memberError?.message || 'Failed to create test members'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Create Test Members',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Test birthday message processing logic
    console.log('Test 4: Testing birthday message processing...');
    try {
      const today = new Date();
      const targetMonthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

      // Find members with birthdays today
      const { data: allMembers, error: membersError } = await supabaseAdmin
        .from('members')
        .select('*')
        .eq('status', 'active')
        .not('date_of_birth', 'is', null);

      if (!membersError && allMembers) {
        const membersWithBirthdayToday = allMembers.filter(member => {
          if (!member.date_of_birth) return false;
          const birthDate = new Date(member.date_of_birth);
          const birthMonthDay = `${(birthDate.getMonth() + 1).toString().padStart(2, '0')}-${birthDate.getDate().toString().padStart(2, '0')}`;
          return birthMonthDay === targetMonthDay;
        });

        testResults.push({
          test: 'Birthday Logic Processing',
          status: 'PASS',
          details: `Found ${membersWithBirthdayToday.length} members with birthdays today (${targetMonthDay})`,
          data: {
            targetDate: targetMonthDay,
            totalMembers: allMembers.length,
            birthdayMembers: membersWithBirthdayToday.map(m => ({
              id: m.id,
              name: `${m.first_name} ${m.last_name}`,
              birthday: m.date_of_birth
            }))
          }
        });
      } else {
        testResults.push({
          test: 'Birthday Logic Processing',
          status: 'FAIL',
          details: membersError?.message || 'Failed to fetch members'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Birthday Logic Processing',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 5: Test the actual birthday message cron job
    console.log('Test 5: Testing birthday message cron job...');
    try {
      const cronResponse = await fetch(`${request.nextUrl.origin}/api/cron/process-birthday-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET_KEY}`
        }
      });

      const cronResult = await cronResponse.json();

      if (cronResponse.ok && cronResult.success) {
        testResults.push({
          test: 'Birthday Message Cron Job',
          status: 'PASS',
          details: `Processed ${cronResult.processed || 0} birthday messages`,
          data: cronResult.results
        });
      } else {
        testResults.push({
          test: 'Birthday Message Cron Job',
          status: 'FAIL',
          details: cronResult.error || 'Cron job failed'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Birthday Message Cron Job',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 6: Check message logs for birthday messages
    console.log('Test 6: Checking message logs...');
    try {
      const { data: messageLogs, error: logsError } = await supabaseAdmin
        .from('message_logs')
        .select('*')
        .eq('message_type', 'birthday')
        .order('sent_at', { ascending: false })
        .limit(10);

      if (!logsError) {
        testResults.push({
          test: 'Birthday Message Logs',
          status: 'PASS',
          details: `Found ${messageLogs?.length || 0} birthday message log entries`,
          data: messageLogs?.map(log => ({
            id: log.id,
            status: log.status,
            sent_at: log.sent_at,
            error_message: log.error_message
          }))
        });
      } else {
        testResults.push({
          test: 'Birthday Message Logs',
          status: 'FAIL',
          details: logsError.message
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Birthday Message Logs',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Calculate summary
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const errors = testResults.filter(r => r.status === 'ERROR').length;

    return NextResponse.json({
      success: true,
      summary: {
        total: testResults.length,
        passed,
        failed,
        errors,
        overallStatus: failed === 0 && errors === 0 ? 'PASS' : 'FAIL'
      },
      testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in birthday logic test:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run birthday logic test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/test/birthday-logic
 * Get information about the birthday logic test without running it
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Birthday Message Logic Test Endpoint',
    tests: [
      'Create Birthday Message',
      'Birthday Message Storage',
      'Create Test Members',
      'Birthday Logic Processing',
      'Birthday Message Cron Job',
      'Birthday Message Logs'
    ],
    usage: 'POST to this endpoint to run all birthday logic tests'
  });
}
