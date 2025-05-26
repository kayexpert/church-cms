import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test/trigger-morning-operations
 * Manual trigger for testing morning operations cron job
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Manually triggering morning operations...');
    
    // Call the morning operations endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/morning-operations?token=${process.env.CRON_SECRET_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Morning operations triggered manually',
      response: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering morning operations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger morning operations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/test/trigger-morning-operations
 * Manual trigger via GET for easy browser testing
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
