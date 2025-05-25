/**
 * API endpoint to fetch message history from Wigal
 *
 * This endpoint connects to the Wigal API to retrieve message history
 * for the configured account.
 *
 * Documentation: https://frogdocs.wigal.com.gh/history.html
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultSMSConfig } from '@/services/sms-service';

export async function POST(request: NextRequest) {
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
          error: 'Only Wigal SMS provider is supported for message history'
        },
        { status: 400 }
      );
    }

    // Get request parameters
    const requestData = await request.json();

    // Set default date range if not provided (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Prepare the request payload
    const payload = {
      service: "SMS",
      servicetype: "TEXT",
      datefrom: requestData.datefrom || formatDate(thirtyDaysAgo),
      dateto: requestData.dateto || formatDate(now),
      // Only include optional parameters if they are provided
      ...(requestData.senderid && { senderid: requestData.senderid }),
      ...(requestData.status && { status: requestData.status }),
      ...(requestData.msgid && { msgid: requestData.msgid })
    };

    console.log('Fetching Wigal message history with payload:', payload);

    // Construct the API URL for message history
    const baseUrl = config.base_url || 'https://frogapi.wigal.com.gh';
    const url = `${baseUrl}/api/v3/sms/history`;

    // Make the API request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': config.api_key,
        'USERNAME': config.api_secret || (config as any).username || 'default',
      },
      body: JSON.stringify(payload),
    });

    // Get the response text for debugging
    const responseText = await response.text();
    console.log('Wigal history API response text:', responseText);

    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing Wigal history API response:', parseError);
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
      console.error('Wigal history API error response:', data);
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.error || `Wigal API error: ${response.status} ${response.statusText}`
        },
        { status: response.status || 500 }
      );
    }

    // Process the message history data to calculate statistics
    const messages = data.data?.content || [];
    const totalMessages = messages.length;
    const totalCost = messages.reduce((sum: number, msg: any) => sum + (msg.charge || 0), 0);
    const totalSegments = messages.reduce((sum: number, msg: any) => sum + (msg.messagecount || 1), 0);

    // Count messages by status
    const statusCounts: Record<string, number> = {};
    messages.forEach((msg: any) => {
      const status = msg.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Calculate statistics
    const statistics = {
      totalMessages,
      totalCost,
      totalSegments,
      averageCost: totalMessages > 0 ? totalCost / totalMessages : 0,
      statusCounts,
      // Include pagination info if available
      pagination: data.data?.pageable ? {
        totalElements: data.data.totalElements,
        totalPages: data.data.totalPages,
        currentPage: data.data.number,
        pageSize: data.data.size
      } : null
    };

    // Return the statistics and raw data
    return NextResponse.json({
      success: true,
      statistics,
      messages: messages,
      rawResponse: data
    });
  } catch (error) {
    console.error('Error fetching Wigal message history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching Wigal message history'
      },
      { status: 500 }
    );
  }
}
