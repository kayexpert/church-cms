import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/messaging/wigal-proxy
 * Proxy requests to the Wigal SMS API to avoid CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Wigal proxy endpoint called');

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body received (sensitive data redacted):', {
        apiKeyPresent: !!body.apiKey,
        apiSecretPresent: !!body.apiSecret,
        bodyPresent: !!body.body
      });
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body
    const { apiKey, apiSecret, body: wigalBody } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!wigalBody) {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    // Use the correct Wigal API endpoint
    const url = 'https://frogapi.wigal.com.gh/api/v3/sms/send';

    console.log('Proxying request to Wigal API:', {
      url,
      method: 'POST',
      bodyType: typeof wigalBody,
      destinationsCount: wigalBody.destinations?.length || 0,
      messageLength: wigalBody.message?.length || 0
    });

    // Make the API request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': apiKey,
        'USERNAME': apiSecret || 'default', // Use apiSecret as username or default
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(wigalBody),
    });

    // Get the response text
    const responseText = await response.text();
    console.log('Wigal API response text:', responseText);

    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing Wigal API response:', parseError);
      return NextResponse.json(
        { success: false, error: `Failed to parse Wigal API response: ${responseText}` },
        { status: 500 }
      );
    }

    // Return the response from Wigal
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in wigal-proxy endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to proxy request to Wigal API',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
