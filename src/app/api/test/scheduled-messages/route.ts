import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/test/scheduled-messages
 * Test the scheduled message logic comprehensively
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Testing scheduled message logic...');

    // Create a Supabase client with service role for more permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const testResults = [];

    // Test 1: Create a scheduled message for immediate processing
    console.log('Test 1: Creating immediate scheduled message...');
    try {
      const now = new Date();
      const scheduleTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago (should be processed)

      const messageData = {
        name: 'Test Immediate Scheduled Message',
        content: 'This message should be processed immediately',
        type: 'quick',
        frequency: 'one-time',
        schedule_time: scheduleTime.toISOString(),
        status: 'active'
      };

      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (!error && message) {
        testResults.push({
          test: 'Create Immediate Scheduled Message',
          status: 'PASS',
          details: `Created message with ID: ${message.id}`,
          messageId: message.id
        });
      } else {
        testResults.push({
          test: 'Create Immediate Scheduled Message',
          status: 'FAIL',
          details: error?.message || 'Unknown error'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Create Immediate Scheduled Message',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Create a future scheduled message
    console.log('Test 2: Creating future scheduled message...');
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

      const messageData = {
        name: 'Test Future Scheduled Message',
        content: 'This message should be processed in the future',
        type: 'quick',
        frequency: 'one-time',
        schedule_time: futureTime.toISOString(),
        status: 'active'
      };

      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (!error && message) {
        testResults.push({
          test: 'Create Future Scheduled Message',
          status: 'PASS',
          details: `Created message with ID: ${message.id}, scheduled for ${futureTime.toISOString()}`,
          messageId: message.id
        });
      } else {
        testResults.push({
          test: 'Create Future Scheduled Message',
          status: 'FAIL',
          details: error?.message || 'Unknown error'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Create Future Scheduled Message',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Create a recurring message
    console.log('Test 3: Creating recurring scheduled message...');
    try {
      const now = new Date();
      const scheduleTime = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago

      const messageData = {
        name: 'Test Recurring Message',
        content: 'This is a recurring message',
        type: 'quick',
        frequency: 'daily',
        schedule_time: scheduleTime.toISOString(),
        status: 'active'
      };

      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (!error && message) {
        testResults.push({
          test: 'Create Recurring Scheduled Message',
          status: 'PASS',
          details: `Created recurring message with ID: ${message.id}`,
          messageId: message.id
        });
      } else {
        testResults.push({
          test: 'Create Recurring Scheduled Message',
          status: 'FAIL',
          details: error?.message || 'Unknown error'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Create Recurring Scheduled Message',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Test the scheduled message cron job
    console.log('Test 4: Testing scheduled message cron job...');
    try {
      const cronResponse = await fetch(`${request.nextUrl.origin}/api/cron/process-scheduled-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET_KEY}`
        }
      });

      const cronResult = await cronResponse.json();

      if (cronResponse.ok && cronResult.success) {
        testResults.push({
          test: 'Scheduled Message Cron Job',
          status: 'PASS',
          details: `Processed ${cronResult.processed || 0} scheduled messages`,
          data: cronResult.results
        });
      } else {
        testResults.push({
          test: 'Scheduled Message Cron Job',
          status: 'FAIL',
          details: cronResult.error || 'Cron job failed'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Scheduled Message Cron Job',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 5: Check message status updates
    console.log('Test 5: Checking message status updates...');
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .like('name', 'Test%Scheduled%')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && messages) {
        const statusCounts = messages.reduce((acc, msg) => {
          acc[msg.status] = (acc[msg.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        testResults.push({
          test: 'Message Status Updates',
          status: 'PASS',
          details: `Found ${messages.length} test messages`,
          data: {
            totalMessages: messages.length,
            statusCounts,
            messages: messages.map(msg => ({
              id: msg.id,
              name: msg.name,
              status: msg.status,
              schedule_time: msg.schedule_time,
              frequency: msg.frequency
            }))
          }
        });
      } else {
        testResults.push({
          test: 'Message Status Updates',
          status: 'FAIL',
          details: error?.message || 'Failed to fetch messages'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Message Status Updates',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 6: Test cleanup functionality
    console.log('Test 6: Testing cleanup functionality...');
    try {
      const cleanupResponse = await fetch(`${request.nextUrl.origin}/api/cron/cleanup-stuck-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET_KEY}`
        }
      });

      const cleanupResult = await cleanupResponse.json();

      if (cleanupResponse.ok && cleanupResult.success) {
        testResults.push({
          test: 'Cleanup Functionality',
          status: 'PASS',
          details: `Cleaned up ${cleanupResult.cleaned || 0} stuck messages`,
          data: cleanupResult
        });
      } else {
        testResults.push({
          test: 'Cleanup Functionality',
          status: 'FAIL',
          details: cleanupResult.error || 'Cleanup failed'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Cleanup Functionality',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 7: Test frequency handling
    console.log('Test 7: Testing frequency handling...');
    try {
      const frequencies = ['one-time', 'daily', 'weekly', 'monthly'];
      const frequencyResults = [];

      for (const frequency of frequencies) {
        const messageData = {
          name: `Test ${frequency} Message`,
          content: `This is a ${frequency} message`,
          type: 'quick',
          frequency,
          schedule_time: new Date().toISOString(),
          status: 'active'
        };

        const { data: message, error } = await supabaseAdmin
          .from('messages')
          .insert(messageData)
          .select()
          .single();

        frequencyResults.push({
          frequency,
          success: !error,
          messageId: message?.id,
          error: error?.message
        });
      }

      const successfulFrequencies = frequencyResults.filter(r => r.success).length;

      testResults.push({
        test: 'Frequency Handling',
        status: successfulFrequencies === frequencies.length ? 'PASS' : 'PARTIAL',
        details: `${successfulFrequencies}/${frequencies.length} frequencies supported`,
        data: frequencyResults
      });
    } catch (error) {
      testResults.push({
        test: 'Frequency Handling',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Calculate summary
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const errors = testResults.filter(r => r.status === 'ERROR').length;
    const partial = testResults.filter(r => r.status === 'PARTIAL').length;

    return NextResponse.json({
      success: true,
      summary: {
        total: testResults.length,
        passed,
        failed,
        errors,
        partial,
        overallStatus: failed === 0 && errors === 0 ? 'PASS' : 'PARTIAL'
      },
      testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in scheduled message test:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run scheduled message test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/test/scheduled-messages
 * Get information about the scheduled message test
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Scheduled Message Logic Test Endpoint',
    tests: [
      'Create Immediate Scheduled Message',
      'Create Future Scheduled Message',
      'Create Recurring Scheduled Message',
      'Scheduled Message Cron Job',
      'Message Status Updates',
      'Cleanup Functionality',
      'Frequency Handling'
    ],
    usage: 'POST to this endpoint to run all scheduled message tests'
  });
}
