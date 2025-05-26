import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test/final-cron-analysis
 * Comprehensive final analysis of all cron job functionality
 * Tests both birthday messages and scheduled message processing
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Starting final cron analysis...');

    const analysis = {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      testResults: {} as any,
      summary: {} as any,
      issues: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    const baseUrl = new URL(request.url).origin;

    // Test 1: Birthday Cron Job Analysis
    console.log('Testing birthday cron job...');
    try {
      const birthdayResponse = await fetch(`${baseUrl}/api/test/birthday-cron`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (birthdayResponse.ok) {
        const birthdayData = await birthdayResponse.json();
        analysis.testResults.birthdayCron = {
          status: 'SUCCESS',
          data: birthdayData,
          totalMessages: birthdayData.totalMessages || 0,
          totalMembers: birthdayData.totalMembers || 0,
          successCount: birthdayData.successCount || 0,
          failureCount: birthdayData.failureCount || 0
        };
      } else {
        analysis.testResults.birthdayCron = {
          status: 'FAILED',
          error: `HTTP ${birthdayResponse.status}`,
          details: await birthdayResponse.text()
        };
        analysis.issues.push('Birthday cron job failed to execute');
      }
    } catch (error) {
      analysis.testResults.birthdayCron = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      analysis.issues.push(`Birthday cron job error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 2: Scheduled Messages Cron Job Analysis
    console.log('Testing scheduled messages cron job...');
    try {
      const scheduledResponse = await fetch(`${baseUrl}/api/test/scheduled-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (scheduledResponse.ok) {
        const scheduledData = await scheduledResponse.json();
        analysis.testResults.scheduledMessagesCron = {
          status: 'SUCCESS',
          data: scheduledData,
          totalMessages: scheduledData.totalMessages || 0,
          processedMessages: scheduledData.processedMessages || 0,
          successCount: scheduledData.successCount || 0,
          failureCount: scheduledData.failureCount || 0
        };
      } else {
        analysis.testResults.scheduledMessagesCron = {
          status: 'FAILED',
          error: `HTTP ${scheduledResponse.status}`,
          details: await scheduledResponse.text()
        };
        analysis.issues.push('Scheduled messages cron job failed to execute');
      }
    } catch (error) {
      analysis.testResults.scheduledMessagesCron = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      analysis.issues.push(`Scheduled messages cron job error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 3: Direct Birthday Processing Test
    console.log('Testing direct birthday message processing...');
    try {
      const directBirthdayResponse = await fetch(`${baseUrl}/api/cron/process-birthday-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (directBirthdayResponse.ok) {
        const directBirthdayData = await directBirthdayResponse.json();
        analysis.testResults.directBirthdayProcessing = {
          status: 'SUCCESS',
          data: directBirthdayData,
          processed: directBirthdayData.processed || 0,
          results: directBirthdayData.results || []
        };
      } else {
        analysis.testResults.directBirthdayProcessing = {
          status: 'FAILED',
          error: `HTTP ${directBirthdayResponse.status}`,
          details: await directBirthdayResponse.text()
        };
        analysis.warnings.push('Direct birthday processing endpoint failed');
      }
    } catch (error) {
      analysis.testResults.directBirthdayProcessing = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      analysis.warnings.push(`Direct birthday processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 4: Direct Scheduled Messages Processing Test
    console.log('Testing direct scheduled message processing...');
    try {
      const directScheduledResponse = await fetch(`${baseUrl}/api/cron/process-scheduled-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (directScheduledResponse.ok) {
        const directScheduledData = await directScheduledResponse.json();
        analysis.testResults.directScheduledProcessing = {
          status: 'SUCCESS',
          data: directScheduledData,
          processed: directScheduledData.processed || 0,
          results: directScheduledData.results || []
        };
      } else {
        analysis.testResults.directScheduledProcessing = {
          status: 'FAILED',
          error: `HTTP ${directScheduledResponse.status}`,
          details: await directScheduledResponse.text()
        };
        analysis.warnings.push('Direct scheduled message processing endpoint failed');
      }
    } catch (error) {
      analysis.testResults.directScheduledProcessing = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      analysis.warnings.push(`Direct scheduled message processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 5: Member Birthday Data Verification
    console.log('Verifying member birthday data...');
    try {
      const memberBirthdayResponse = await fetch(`${baseUrl}/api/test/check-member-birthdays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (memberBirthdayResponse.ok) {
        const memberBirthdayData = await memberBirthdayResponse.json();
        analysis.testResults.memberBirthdayVerification = {
          status: 'SUCCESS',
          data: memberBirthdayData,
          totalMembers: memberBirthdayData.totalMembers || 0,
          activeMembersWithBirthDates: memberBirthdayData.activeMembersWithBirthDates || 0,
          membersWithBirthdayToday: memberBirthdayData.membersWithBirthdayToday || 0,
          kelvinDetails: memberBirthdayData.kelvinDetails || null
        };
      } else {
        analysis.testResults.memberBirthdayVerification = {
          status: 'FAILED',
          error: `HTTP ${memberBirthdayResponse.status}`,
          details: await memberBirthdayResponse.text()
        };
        analysis.warnings.push('Member birthday verification failed');
      }
    } catch (error) {
      analysis.testResults.memberBirthdayVerification = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      analysis.warnings.push(`Member birthday verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Generate Summary and Recommendations
    const totalIssues = analysis.issues.length;
    const totalWarnings = analysis.warnings.length;
    
    // Check birthday cron functionality
    const birthdayWorking = analysis.testResults.birthdayCron?.status === 'SUCCESS';
    const scheduledWorking = analysis.testResults.scheduledMessagesCron?.status === 'SUCCESS';
    const directBirthdayWorking = analysis.testResults.directBirthdayProcessing?.status === 'SUCCESS';
    const directScheduledWorking = analysis.testResults.directScheduledProcessing?.status === 'SUCCESS';
    const memberDataWorking = analysis.testResults.memberBirthdayVerification?.status === 'SUCCESS';

    analysis.summary = {
      overallStatus: totalIssues === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
      totalIssues,
      totalWarnings,
      cronJobsStatus: {
        birthdayCron: birthdayWorking ? 'WORKING' : 'FAILED',
        scheduledMessagesCron: scheduledWorking ? 'WORKING' : 'FAILED',
        directBirthdayProcessing: directBirthdayWorking ? 'WORKING' : 'FAILED',
        directScheduledProcessing: directScheduledWorking ? 'WORKING' : 'FAILED',
        memberDataVerification: memberDataWorking ? 'WORKING' : 'FAILED'
      },
      readinessScore: {
        birthday: birthdayWorking && directBirthdayWorking && memberDataWorking ? 100 : 0,
        scheduled: scheduledWorking && directScheduledWorking ? 100 : 0,
        overall: (birthdayWorking && directBirthdayWorking && memberDataWorking && scheduledWorking && directScheduledWorking) ? 100 : 50
      }
    };

    // Generate recommendations
    if (!birthdayWorking) {
      analysis.recommendations.push('Fix birthday cron job test endpoint');
    }
    if (!scheduledWorking) {
      analysis.recommendations.push('Fix scheduled messages cron job test endpoint');
    }
    if (!directBirthdayWorking) {
      analysis.recommendations.push('Fix direct birthday processing endpoint');
    }
    if (!directScheduledWorking) {
      analysis.recommendations.push('Fix direct scheduled message processing endpoint');
    }
    if (!memberDataWorking) {
      analysis.recommendations.push('Fix member birthday data verification');
    }

    if (totalIssues === 0 && totalWarnings === 0) {
      analysis.recommendations.push('All cron jobs are working perfectly! Ready for production deployment.');
    }

    console.log('Final cron analysis completed');

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error in final cron analysis:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform final cron analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
