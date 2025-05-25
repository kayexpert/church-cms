import { NextRequest, NextResponse } from 'next/server';
import { messagingConfigSchema } from '@/schemas/messaging-config-schema';
import { 
  updateMessagingConfiguration, 
  deleteMessagingConfiguration 
} from '@/services/messaging-config-service';

/**
 * PATCH /api/messaging/config/[id]
 * Update an existing SMS provider configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // Validate request body
    const validationResult = messagingConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { data, error } = await updateMessagingConfiguration(id, validationResult.data);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to update messaging configuration', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error(`Error in PATCH /api/messaging/config/[id]:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to update messaging configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/config/[id]
 * Delete an SMS provider configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const { error } = await deleteMessagingConfiguration(id);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete messaging configuration', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/messaging/config/[id]:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to delete messaging configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
