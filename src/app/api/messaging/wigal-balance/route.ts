/**
 * API endpoint to fetch the current Wigal SMS balance
 *
 * This endpoint connects to the Wigal API to retrieve the current SMS credit balance
 * for the configured account.
 *
 * Documentation: https://frogdocs.wigal.com.gh/get_account_balance.html
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultSMSConfig } from '@/services/sms-service';

export async function GET(request: NextRequest) {
  try {
    // Get the SMS configuration
    const { success, config, error } = await getDefaultSMSConfig();

    if (!success || !config) {
      console.error('Failed to get SMS configuration:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'No SMS provider configured. Please set up an SMS provider in the messaging settings.'
        },
        { status: 404 }
      );
    }

    // Ensure we're using Wigal
    if (config.provider_name !== 'wigal') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Wigal SMS provider is supported for balance checking'
        },
        { status: 400 }
      );
    }

    // Construct the API URL for balance check - using the correct endpoint from Wigal docs
    const baseUrl = config.base_url || 'https://frogapi.wigal.com.gh';
    const url = `${baseUrl}/api/v3/balance`;

    console.log('Fetching Wigal balance from:', url);

    // Make the API request with the correct headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'API-KEY': config.api_key,
        'USERNAME': config.api_secret || (config as any).username || 'default',
        'Cache-Control': 'no-cache',
      },
    });

    // Get the response text for debugging
    const responseText = await response.text();
    console.log('Wigal balance API response text:', responseText);

    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing Wigal balance API response:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse Wigal API response: ${responseText}`
        },
        { status: 500 }
      );
    }

    // Check for API-specific error responses
    if (!response.ok || data.status !== 'SUCCESS') {
      console.error('Wigal balance API error response:', data);
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.error || `Wigal API error: ${response.status} ${response.statusText}`
        },
        { status: response.status || 500 }
      );
    }

    // Extract the balance information from the correct response structure
    // According to Wigal docs, the balance is in data.cashbalance
    const smsBalance = data.data?.bundles?.SMS || 0;
    const cashBalance = data.data?.cashbalance || 0;

    const balance = {
      amount: smsBalance > 0 ? smsBalance : cashBalance,
      currency: 'GHS',
      timestamp: new Date().toISOString(),
      // Include additional details for debugging
      details: {
        smsBalance,
        cashBalance,
        hasBundles: !!data.data?.bundles,
        bundleTypes: data.data?.bundles ? Object.keys(data.data.bundles) : []
      }
    };

    // Return the balance information
    return NextResponse.json({
      success: true,
      balance
    });
  } catch (error) {
    console.error('Error fetching Wigal balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching Wigal balance'
      },
      { status: 500 }
    );
  }
}
