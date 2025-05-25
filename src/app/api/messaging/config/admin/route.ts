import { NextRequest, NextResponse } from 'next/server';
import { messagingConfigSchema } from '@/schemas/messaging-config-schema';
import { createClient } from '@supabase/supabase-js';
import { MessagingConfiguration } from '@/types/messaging';

/**
 * GET /api/messaging/config/admin
 * Get all SMS provider configurations (bypassing RLS)
 */
export async function GET() {
  try {
    console.log('Admin: Fetching all messaging configurations');

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create a Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabaseAdmin
      .from('messaging_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin: Error fetching messaging configurations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messaging configurations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Admin: Error in GET /api/messaging/config/admin:', error);
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
 * POST /api/messaging/config/admin
 * Create a new SMS provider configuration (bypassing RLS)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Admin: POST /api/messaging/config/admin called');

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create a Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Admin: Request body:', body);
    } catch (parseError) {
      console.error('Admin: Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Validate request body
    const validationResult = messagingConfigSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Admin: Validation error:', validationResult.error.format());
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const config = validationResult.data;
    console.log('Admin: Creating messaging configuration:', config);

    // If this is set as default, update all other configurations to not be default
    if (config.is_default) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from('messaging_configurations')
          .update({ is_default: false })
          .eq('is_default', true);

        if (updateError) {
          console.error('Admin: Error updating existing default configurations:', updateError);
        } else {
          console.log('Admin: Updated existing default configurations');
        }
      } catch (updateError) {
        console.error('Admin: Error updating existing default configurations:', updateError);
      }
    }

    // Insert the new configuration
    console.log('Admin: Inserting configuration with data:', JSON.stringify(config, null, 2));

    let createdData;
    try {
      const { data, error } = await supabaseAdmin
        .from('messaging_configurations')
        .insert(config)
        .select()
        .single();

      if (error) {
        console.error('Admin: Error creating messaging configuration:', error);
        return NextResponse.json(
          {
            error: 'Failed to create messaging configuration',
            details: error.message,
            code: error.code,
            hint: error.hint
          },
          { status: 500 }
        );
      }

      createdData = data;
    } catch (insertError) {
      console.error('Admin: Exception during insert:', insertError);
      return NextResponse.json(
        {
          error: 'Exception during insert operation',
          details: insertError instanceof Error ? insertError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    console.log('Admin: Configuration created successfully:', createdData);
    return NextResponse.json({ data: createdData });
  } catch (error) {
    console.error('Admin: Error in POST /api/messaging/config/admin:', error);
    return NextResponse.json(
      {
        error: 'Failed to create messaging configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


