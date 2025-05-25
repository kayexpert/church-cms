import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/messaging/trigger-cron
 * Manually trigger the cron job for scheduled messages
 * This is useful for testing purposes
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Manually triggering cron job for scheduled messages');

    // Get the CRON_SECRET_KEY from environment variables
    const cronSecretKey = process.env.CRON_SECRET_KEY;
    
    if (!cronSecretKey) {
      console.error('CRON_SECRET_KEY is not defined in environment variables');
      return NextResponse.json({
        success: false,
        error: 'CRON_SECRET_KEY is not defined in environment variables'
      }, { status: 500 });
    }

    // Get the base URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Call the cron job endpoint
    const response = await fetch(`${baseUrl}/api/cron/process-scheduled-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecretKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error calling cron job endpoint:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to trigger cron job',
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Cron job triggered successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Cron job triggered successfully',
      details: data
    });
  } catch (error) {
    console.error('Error triggering cron job:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger cron job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
