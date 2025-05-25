import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { sendSMSWithConfig, getDefaultSMSConfig } from '@/services/sms-service';
import { createMessageLog } from '@/services/messaging-service';
import { getMembersByIds, getMembersByGroupId } from '@/services/messaging-service';

/**
 * Enhanced logging function for SMS sending
 * @param level Log level (info, warn, error)
 * @param message Message to log
 * @param data Additional data to log
 */
function logSmsSend(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[SMS-SEND ${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    // Safely stringify data, handling circular references
    let dataStr;
    try {
      dataStr = JSON.stringify(data, (key, value) => {
        if (key === 'password' || key === 'api_secret' || key === 'authToken' || key === 'api_key') {
          return '***REDACTED***';
        }
        return value;
      }, 2);
    } catch (e) {
      dataStr = '[Circular or complex object]';
    }

    console[level](`${logPrefix} ${message}`, dataStr);
  } else {
    console[level](`${logPrefix} ${message}`);
  }
}

/**
 * POST /api/messaging/send/[id]
 * Send an existing message by ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // In Next.js 15+, we need to await params to ensure they're properly resolved
  const { id } = await params;
  const messageId = id;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Parse request body if available
  let requestBody = {};
  try {
    requestBody = await request.json();
    logSmsSend('info', `Request body: ${JSON.stringify(requestBody)}`, { requestId });
  } catch (e) {
    // No request body or invalid JSON
    logSmsSend('info', `No request body or invalid JSON: ${e instanceof Error ? e.message : String(e)}`, { requestId });
  }

  // Forward the request to the main send endpoint
  try {
    logSmsSend('info', `Forwarding request to main send endpoint [${requestId}]`);

    // Create the request URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/messaging/send`;

    // Create the request body
    const body = {
      messageId,
      sendNow: true,
      ...requestBody
    };

    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Get the response
    const data = await response.json();

    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    logSmsSend('error', `Error forwarding request [${requestId}]`, error);
    return NextResponse.json(
      {
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
