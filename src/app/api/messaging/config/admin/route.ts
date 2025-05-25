import { NextRequest, NextResponse } from 'next/server';
import { messagingConfigSchema } from '@/schemas/messaging-config-schema';
import { createClient } from '@supabase/supabase-js';
import { MessagingConfiguration } from '@/types/messaging';

// Create a Supabase client with service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * GET /api/messaging/config/admin
 * Get all SMS provider configurations (bypassing RLS)
 */
export async function GET() {
  try {
    console.log('Admin: Fetching all messaging configurations');

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

/**
 * PATCH /api/messaging/config/admin/[id]
 * Update an SMS provider configuration (bypassing RLS)
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

    const config = validationResult.data;

    // If this is set as default, update all other configurations to not be default
    if (config.is_default) {
      const { error: updateError } = await supabaseAdmin
        .from('messaging_configurations')
        .update({ is_default: false })
        .eq('is_default', true);

      if (updateError) {
        console.error('Admin: Error updating existing default configurations:', updateError);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('messaging_configurations')
      .update(config)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update messaging configuration', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error(`Admin: Error in PATCH /api/messaging/config/admin/[id]:`, error);
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
 * DELETE /api/messaging/config/admin/[id]
 * Delete an SMS provider configuration (bypassing RLS)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if this is the default configuration
    const { data: config, error: fetchError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('is_default')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch messaging configuration', details: fetchError.message },
        { status: 500 }
      );
    }

    // Don't allow deleting the default configuration
    if (config.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default configuration. Set another configuration as default first.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('messaging_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete messaging configuration', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Admin: Error in DELETE /api/messaging/config/admin/[id]:`, error);
    return NextResponse.json(
      {
        error: 'Failed to delete messaging configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
