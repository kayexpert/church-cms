import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cron/morning-operations
 * Consolidated morning cron job that handles:
 * 1. Birthday message processing
 * 2. Scheduled message processing
 * 3. Basic cleanup
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (token !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting morning operations cron job...');
    
    const results = {
      timestamp: new Date().toISOString(),
      operations: [] as any[],
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0
      }
    };

    // Operation 1: Process Birthday Messages
    console.log('1. Processing birthday messages...');
    try {
      const birthdayResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/process-birthday-messages?token=${process.env.CRON_SECRET_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const birthdayData = await birthdayResponse.json();
      
      results.operations.push({
        operation: 'birthday-messages',
        status: birthdayResponse.ok ? 'success' : 'failed',
        data: birthdayData,
        timestamp: new Date().toISOString()
      });

      if (birthdayResponse.ok) {
        results.summary.successfulOperations++;
        console.log('✅ Birthday messages processed successfully');
      } else {
        results.summary.failedOperations++;
        console.error('❌ Birthday messages processing failed:', birthdayData);
      }
    } catch (error) {
      results.operations.push({
        operation: 'birthday-messages',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      results.summary.failedOperations++;
      console.error('❌ Birthday messages processing error:', error);
    }

    results.summary.totalOperations++;

    // Operation 2: Process Scheduled Messages
    console.log('2. Processing scheduled messages...');
    try {
      const scheduledResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/process-scheduled-messages?token=${process.env.CRON_SECRET_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const scheduledData = await scheduledResponse.json();
      
      results.operations.push({
        operation: 'scheduled-messages',
        status: scheduledResponse.ok ? 'success' : 'failed',
        data: scheduledData,
        timestamp: new Date().toISOString()
      });

      if (scheduledResponse.ok) {
        results.summary.successfulOperations++;
        console.log('✅ Scheduled messages processed successfully');
      } else {
        results.summary.failedOperations++;
        console.error('❌ Scheduled messages processing failed:', scheduledData);
      }
    } catch (error) {
      results.operations.push({
        operation: 'scheduled-messages',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      results.summary.failedOperations++;
      console.error('❌ Scheduled messages processing error:', error);
    }

    results.summary.totalOperations++;

    // Operation 3: Basic Cleanup (Light cleanup for morning)
    console.log('3. Performing basic cleanup...');
    try {
      const cleanupResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/cleanup-stuck-messages?token=${process.env.CRON_SECRET_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const cleanupData = await cleanupResponse.json();
      
      results.operations.push({
        operation: 'basic-cleanup',
        status: cleanupResponse.ok ? 'success' : 'failed',
        data: cleanupData,
        timestamp: new Date().toISOString()
      });

      if (cleanupResponse.ok) {
        results.summary.successfulOperations++;
        console.log('✅ Basic cleanup completed successfully');
      } else {
        results.summary.failedOperations++;
        console.error('❌ Basic cleanup failed:', cleanupData);
      }
    } catch (error) {
      results.operations.push({
        operation: 'basic-cleanup',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      results.summary.failedOperations++;
      console.error('❌ Basic cleanup error:', error);
    }

    results.summary.totalOperations++;

    console.log('Morning operations completed:', results.summary);

    return NextResponse.json({
      success: true,
      message: 'Morning operations completed',
      results
    });

  } catch (error) {
    console.error('Error in morning operations cron job:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to complete morning operations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
