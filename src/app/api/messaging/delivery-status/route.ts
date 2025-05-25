/**
 * Webhook endpoint for receiving SMS delivery status updates from Wigal
 * 
 * This endpoint receives callbacks from Wigal when the status of a message changes
 * (e.g., delivered, failed, etc.) and updates the message_logs table accordingly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log('Received delivery status callback:', body);

    // Validate the callback data
    if (!body.messageId) {
      console.error('Invalid delivery status callback: Missing messageId');
      return NextResponse.json(
        { success: false, error: 'Missing messageId' },
        { status: 400 }
      );
    }

    // Extract status information
    const { 
      messageId, 
      status, 
      destination,
      deliveryTime,
      statusDetails,
      segments,
      cost
    } = body;

    // Map Wigal status to our status format
    let mappedStatus = 'sent';
    if (status === 'DELIVRD' || status === 'DELIVERED') {
      mappedStatus = 'delivered';
    } else if (status === 'UNDELIV' || status === 'FAILED') {
      mappedStatus = 'failed';
    } else if (status === 'EXPIRED') {
      mappedStatus = 'expired';
    } else if (status === 'REJECTD') {
      mappedStatus = 'rejected';
    }

    // Update the message log in the database
    const { data, error } = await supabase
      .from('message_logs')
      .update({ 
        status: mappedStatus,
        delivery_status: status,
        delivery_status_details: statusDetails || null,
        delivered_at: deliveryTime ? new Date(deliveryTime).toISOString() : null,
        segments: segments || null,
        cost: cost || null,
        updated_at: new Date().toISOString()
      })
      .eq('message_id_from_provider', messageId);

    if (error) {
      console.error('Error updating message log:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update message log' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing delivery status callback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}
