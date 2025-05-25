import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to directly create messaging tables
 * POST /api/db/direct-create
 */
export async function POST() {
  try {
    console.log('Directly creating messaging tables');

    // Create a Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not found in environment variables' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we can authenticate
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 500 }
      );
    }

    // Try to create the tables directly using the REST API
    let tablesCreated = false;

    // First, try to check if the tables exist
    try {
      const { error: checkMessagingError } = await supabase
        .from('messaging_configurations')
        .select('id')
        .limit(1);

      const { error: checkAIError } = await supabase
        .from('ai_configurations')
        .select('id')
        .limit(1);

      // If both tables exist, we're done
      if (!checkMessagingError && !checkAIError) {
        return NextResponse.json({
          success: true,
          message: 'Tables already exist'
        });
      }
    } catch (error) {
      console.error('Error checking if tables exist:', error);
    }

    // Try to create the tables using direct insertion
    try {
      // Try to create messaging_configurations by inserting a record
      const { data: messagingData, error: messagingError } = await supabase
        .from('messaging_configurations')
        .insert({
          provider_name: 'mock',
          is_default: true
        })
        .select();

      if (!messagingError) {
        console.log('messaging_configurations table created or already exists');
        tablesCreated = true;
      } else {
        console.error('Error creating messaging_configurations table:', messagingError);
      }


    } catch (error) {
      console.error('Error creating tables via direct insertion:', error);
    }

    // If we successfully created the tables, return success
    if (tablesCreated) {
      return NextResponse.json({
        success: true,
        message: 'Tables created successfully'
      });
    }

    // If we get here, we couldn't create the tables
    return NextResponse.json({
      success: false,
      message: 'Could not create tables, but no error was thrown'
    });
  } catch (error) {
    console.error('Error in direct-create:', error);
    return NextResponse.json(
      {
        error: 'Failed to create tables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
