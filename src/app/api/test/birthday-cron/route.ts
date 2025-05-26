import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test/birthday-cron
 * Test endpoint to manually trigger the birthday message cron job
 * This endpoint is for testing purposes and doesn't require authentication
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Test birthday cron endpoint called');

    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin;
    
    // Call the actual cron endpoint with the secret key
    const cronResponse = await fetch(`${baseUrl}/api/cron/process-birthday-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET_KEY}`
      },
    });

    const cronData = await cronResponse.json();

    if (cronResponse.ok) {
      // Calculate summary statistics
      let totalMessages = 0;
      let totalMembers = 0;
      let successCount = 0;
      let failureCount = 0;

      if (cronData.results && Array.isArray(cronData.results)) {
        totalMessages = cronData.results.length;
        
        cronData.results.forEach((result: any) => {
          if (result.stats) {
            totalMembers += result.stats.total || 0;
            successCount += result.stats.success || 0;
            failureCount += result.stats.failure || 0;
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Birthday message cron job completed successfully',
        totalMessages,
        totalMembers,
        successCount,
        failureCount,
        details: cronData
      });
    } else {
      return NextResponse.json({
        success: false,
        error: cronData.error || 'Failed to run cron job',
        details: cronData
      }, { status: cronResponse.status });
    }
  } catch (error) {
    console.error('Error in test birthday cron endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test birthday cron job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
