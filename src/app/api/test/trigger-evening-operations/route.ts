import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test/trigger-evening-operations
 * Manual trigger for testing evening operations cron job
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Manually triggering evening operations...');
    
    // Call the evening operations endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/evening-operations?token=${process.env.CRON_SECRET_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Evening operations triggered manually',
      response: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering evening operations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger evening operations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/test/trigger-evening-operations
 * Manual trigger via GET for easy browser testing
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
