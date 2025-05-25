import { NextRequest, NextResponse } from 'next/server';
import { messagingConfigSchema } from '@/schemas/messaging-config-schema';
import { supabase } from '@/lib/supabase';
import {
  getMessagingConfigurations,
  createMessagingConfiguration,
  updateMessagingConfiguration,
  deleteMessagingConfiguration,
  testMessagingConfiguration
} from '@/services/messaging-config-service';

/**
 * GET /api/messaging/config
 * Get all SMS provider configurations
 */
export async function GET() {
  try {
    const { data, error } = await getMessagingConfigurations();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch messaging configurations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/messaging/config:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch messaging configurations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messaging/config
 * Create a new SMS provider configuration
 */
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/messaging/config called');

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Validate request body
    const validationResult = messagingConfigSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.format());
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const config = validationResult.data;
    console.log('Creating messaging configuration:', config);

    // Create the configuration
    const { data, error } = await createMessagingConfiguration(config);

    if (error) {
      console.error('Error creating messaging configuration:', error);

      // Try a direct approach as fallback
      try {
        console.log('Trying direct database insertion...');
        const { data: directData, error: directError } = await supabase
          .from('messaging_configurations')
          .insert(config)
          .select()
          .single();

        if (directError) {
          console.error('Direct insertion failed:', directError);
          return NextResponse.json(
            { error: 'Failed to create messaging configuration', details: error.message },
            { status: 500 }
          );
        }

        console.log('Direct insertion succeeded:', directData);
        return NextResponse.json({ data: directData });
      } catch (directError) {
        console.error('Error with direct insertion:', directError);
        return NextResponse.json(
          { error: 'Failed to create messaging configuration', details: error.message },
          { status: 500 }
        );
      }
    }

    console.log('Messaging configuration created successfully:', data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST /api/messaging/config:', error);
    return NextResponse.json(
      {
        error: 'Failed to create messaging configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
