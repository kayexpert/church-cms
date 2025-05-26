import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test/complete-system
 * Run a complete end-to-end test of the messaging system
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Running complete messaging system test...');

    const testResults = [];
    const baseUrl = request.nextUrl.origin;

    // Test 1: API Endpoints Availability
    console.log('Test 1: Checking API endpoints...');
    const endpoints = [
      '/api/messaging/messages',
      '/api/messaging/create-birthday-message',
      '/api/cron/process-scheduled-messages',
      '/api/cron/process-birthday-messages',
      '/api/cron/cleanup-stuck-messages'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: endpoint.includes('cron') ? 'POST' : 'GET',
          headers: endpoint.includes('cron') ? {
            'Authorization': 'Bearer church-cms-cron-secret-key-2025'
          } : {}
        });

        testResults.push({
          test: `API Endpoint: ${endpoint}`,
          status: response.ok ? 'PASS' : 'FAIL',
          details: `Status: ${response.status}`,
          statusCode: response.status
        });
      } catch (error) {
        testResults.push({
          test: `API Endpoint: ${endpoint}`,
          status: 'ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 2: Birthday Message Creation
    console.log('Test 2: Testing birthday message creation...');
    try {
      const birthdayResponse = await fetch(`${baseUrl}/api/messaging/create-birthday-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'System Test Birthday Message',
          content: 'Happy Birthday from system test!',
          days_before: 0,
          status: 'active'
        })
      });

      const birthdayResult = await birthdayResponse.json();

      testResults.push({
        test: 'Birthday Message Creation',
        status: birthdayResult.success ? 'PASS' : 'FAIL',
        details: birthdayResult.success ? 
          `Created message ID: ${birthdayResult.message?.id}` : 
          birthdayResult.error,
        messageId: birthdayResult.message?.id
      });
    } catch (error) {
      testResults.push({
        test: 'Birthday Message Creation',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Scheduled Message Processing
    console.log('Test 3: Testing scheduled message processing...');
    try {
      const cronResponse = await fetch(`${baseUrl}/api/cron/process-scheduled-messages`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer church-cms-cron-secret-key-2025'
        }
      });

      const cronResult = await cronResponse.json();

      testResults.push({
        test: 'Scheduled Message Processing',
        status: cronResult.success ? 'PASS' : 'FAIL',
        details: cronResult.success ? 
          `Processed ${cronResult.processed || 0} messages` : 
          cronResult.error,
        processed: cronResult.processed
      });
    } catch (error) {
      testResults.push({
        test: 'Scheduled Message Processing',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Birthday Message Processing
    console.log('Test 4: Testing birthday message processing...');
    try {
      const birthdayCronResponse = await fetch(`${baseUrl}/api/cron/process-birthday-messages`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer church-cms-cron-secret-key-2025'
        }
      });

      const birthdayCronResult = await birthdayCronResponse.json();

      testResults.push({
        test: 'Birthday Message Processing',
        status: birthdayCronResult.success ? 'PASS' : 'FAIL',
        details: birthdayCronResult.success ? 
          `Processed ${birthdayCronResult.processed || 0} birthday messages` : 
          birthdayCronResult.error,
        processed: birthdayCronResult.processed
      });
    } catch (error) {
      testResults.push({
        test: 'Birthday Message Processing',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 5: System Cleanup
    console.log('Test 5: Testing system cleanup...');
    try {
      const cleanupResponse = await fetch(`${baseUrl}/api/cron/cleanup-stuck-messages`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer church-cms-cron-secret-key-2025'
        }
      });

      const cleanupResult = await cleanupResponse.json();

      testResults.push({
        test: 'System Cleanup',
        status: cleanupResult.success ? 'PASS' : 'FAIL',
        details: cleanupResult.success ? 
          `Cleaned ${cleanupResult.cleaned || 0} stuck messages` : 
          cleanupResult.error,
        cleaned: cleanupResult.cleaned
      });
    } catch (error) {
      testResults.push({
        test: 'System Cleanup',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 6: Message Status Monitoring
    console.log('Test 6: Testing message status monitoring...');
    try {
      const statusResponse = await fetch(`${baseUrl}/api/messaging/messages`);
      const statusResult = await statusResponse.json();

      testResults.push({
        test: 'Message Status Monitoring',
        status: statusResult.success ? 'PASS' : 'FAIL',
        details: statusResult.success ? 
          `Found ${statusResult.count || 0} messages` : 
          statusResult.error,
        messageCount: statusResult.count
      });
    } catch (error) {
      testResults.push({
        test: 'Message Status Monitoring',
        status: 'ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Calculate summary
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const errors = testResults.filter(r => r.status === 'ERROR').length;

    const overallStatus = failed === 0 && errors === 0 ? 'PASS' : 
                         passed > failed + errors ? 'PARTIAL' : 'FAIL';

    return NextResponse.json({
      success: true,
      summary: {
        total: testResults.length,
        passed,
        failed,
        errors,
        overallStatus,
        successRate: `${Math.round((passed / testResults.length) * 100)}%`
      },
      testResults,
      systemStatus: {
        messagingSystem: overallStatus === 'PASS' ? 'OPERATIONAL' : 'DEGRADED',
        cronJobs: testResults.filter(r => r.test.includes('Processing') || r.test.includes('Cleanup')).every(r => r.status === 'PASS') ? 'ACTIVE' : 'ISSUES',
        apiEndpoints: testResults.filter(r => r.test.includes('API Endpoint')).every(r => r.status === 'PASS') ? 'HEALTHY' : 'ISSUES',
        messageCreation: testResults.find(r => r.test.includes('Creation'))?.status === 'PASS' ? 'WORKING' : 'ISSUES'
      },
      timestamp: new Date().toISOString(),
      recommendations: overallStatus !== 'PASS' ? [
        'Check failed tests for specific issues',
        'Verify environment variables are set correctly',
        'Ensure database connectivity',
        'Check SMS provider configuration'
      ] : [
        'System is fully operational',
        'All tests passing',
        'Ready for production use'
      ]
    });

  } catch (error) {
    console.error('Error in complete system test:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run complete system test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/test/complete-system
 * Get information about the complete system test
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Complete Messaging System Test Endpoint',
    tests: [
      'API Endpoints Availability',
      'Birthday Message Creation',
      'Scheduled Message Processing',
      'Birthday Message Processing',
      'System Cleanup',
      'Message Status Monitoring'
    ],
    purpose: 'Comprehensive end-to-end testing of the entire messaging system',
    usage: 'POST to this endpoint to run all system tests'
  });
}
