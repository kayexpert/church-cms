import { NextRequest, NextResponse } from 'next/server';
import { messagingConfigSchema } from '@/schemas/messaging-config-schema';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/messaging/config/admin/[id]
 * Update an SMS provider configuration (bypassing RLS)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Admin: PATCH /api/messaging/config/admin/${id} called`);

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
    console.log('Admin: Updating messaging configuration:', {
      ...config,
      api_key: config.api_key ? '***' : undefined,
      api_secret: config.api_secret ? '***' : undefined,
      is_default: config.is_default,
      id
    });

    // Handle the default provider setting
    if (config.is_default !== undefined) {
      if (config.is_default) {
        // If this is set as default, update all other configurations to not be default
        const { error: updateError } = await supabaseAdmin
          .from('messaging_configurations')
          .update({ is_default: false })
          .eq('is_default', true);

        if (updateError) {
          console.error('Admin: Error updating existing default configurations:', updateError);
        } else {
          console.log('Admin: Updated existing default configurations');
        }
      } else {
        // If this is being set to non-default, check if it's currently the default
        const { data: currentConfig, error: checkError } = await supabaseAdmin
          .from('messaging_configurations')
          .select('is_default')
          .eq('id', id)
          .single();

        if (checkError) {
          console.error('Admin: Error checking current configuration:', checkError);
        } else if (currentConfig && currentConfig.is_default) {
          console.log('Admin: This is currently the default configuration');

          // Check if there are other configurations that could be set as default
          const { data: otherConfigs, error: otherCheckError } = await supabaseAdmin
            .from('messaging_configurations')
            .select('id')
            .neq('id', id);

          if (otherCheckError) {
            console.error('Admin: Error checking other configurations:', otherCheckError);
          } else if (!otherConfigs || otherConfigs.length === 0) {
            // If this is the only configuration, we can't unset it as default
            console.warn('Admin: This is the only configuration, keeping it as default');
            config.is_default = true;
          }
        }
      }
    }

    console.log(`Admin: About to update configuration with ID: ${id}, is_default: ${config.is_default}`);

    // Create a copy of the config object to ensure is_default is explicitly included
    const updateData = {
      ...config,
      is_default: config.is_default === true ? true : false
    };

    console.log('Admin: Update data being sent to database:', {
      ...updateData,
      api_key: updateData.api_key ? '***' : undefined,
      api_secret: updateData.api_secret ? '***' : undefined,
      is_default: updateData.is_default
    });

    const { data, error } = await supabaseAdmin
      .from('messaging_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Admin: Error updating messaging configuration:', error);
      return NextResponse.json(
        { error: 'Failed to update messaging configuration', details: error.message },
        { status: 500 }
      );
    }

    console.log('Admin: Configuration updated successfully:', {
      id: data.id,
      provider_name: data.provider_name,
      is_default: data.is_default,
      updated_at: data.updated_at
    });

    // Double-check if the default flag was properly set
    if (config.is_default !== undefined && config.is_default !== data.is_default) {
      console.warn(`Admin: Default flag was not properly set (expected: ${config.is_default}, actual: ${data.is_default}), attempting to fix...`);

      // Try to update just the default flag using direct SQL for maximum reliability
      try {
        console.log(`Admin: Attempting direct SQL update for default flag to ${config.is_default}`);

        const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: `
            UPDATE messaging_configurations
            SET is_default = ${config.is_default ? 'TRUE' : 'FALSE'}
            WHERE id = '${id}';
          `
        });

        if (sqlError) {
          console.error('Admin: Error with direct SQL update:', sqlError);

          // Fall back to regular update if SQL fails
          const { data: fixData, error: fixError } = await supabaseAdmin
            .from('messaging_configurations')
            .update({ is_default: config.is_default })
            .eq('id', id)
            .select()
            .single();

          if (fixError) {
            console.error('Admin: Error fixing default flag with regular update:', fixError);
          } else {
            console.log(`Admin: Successfully fixed default flag to ${config.is_default} with regular update`);
            return NextResponse.json({ data: fixData });
          }
        } else {
          // If SQL update succeeded, fetch the updated record
          const { data: fixData, error: fixError } = await supabaseAdmin
            .from('messaging_configurations')
            .select('*')
            .eq('id', id)
            .single();

          if (fixError) {
            console.error('Admin: Error fetching updated configuration after SQL update:', fixError);
          } else {
            console.log(`Admin: Successfully fixed default flag to ${config.is_default} with SQL update`);
            return NextResponse.json({ data: fixData });
          }
        }
      } catch (error) {
        console.error('Admin: Error in direct SQL update:', error);

        // Fall back to regular update if try/catch fails
        const { data: fixData, error: fixError } = await supabaseAdmin
          .from('messaging_configurations')
          .update({ is_default: config.is_default })
          .eq('id', id)
          .select()
          .single();

        if (fixError) {
          console.error('Admin: Error fixing default flag with regular update:', fixError);
        } else {
          console.log(`Admin: Successfully fixed default flag to ${config.is_default} with regular update after catch`);
          return NextResponse.json({ data: fixData });
        }
      }

      // This block is now handled inside the try/catch
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Admin: DELETE /api/messaging/config/admin/${id} called`);

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

    // Check if this is the default configuration
    const { data: config, error: fetchError } = await supabaseAdmin
      .from('messaging_configurations')
      .select('is_default')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Admin: Error fetching messaging configuration:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch messaging configuration', details: fetchError.message },
        { status: 500 }
      );
    }

    // Don't allow deleting the default configuration
    if (config.is_default) {
      console.error('Admin: Cannot delete default configuration');
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
      console.error('Admin: Error deleting messaging configuration:', error);
      return NextResponse.json(
        { error: 'Failed to delete messaging configuration', details: error.message },
        { status: 500 }
      );
    }

    console.log('Admin: Configuration deleted successfully');
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
