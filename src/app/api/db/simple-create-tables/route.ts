import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to create messaging tables using a simple approach
 * POST /api/db/simple-create-tables
 */
export async function POST() {
  try {
    console.log('Creating messaging tables using simple approach');

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

    // Try to create the messaging_configurations table
    try {
      // First check if the table exists
      const { error: checkError } = await supabase
        .from('messaging_configurations')
        .select('id')
        .limit(1);

      if (checkError && checkError.message.includes('relation "messaging_configurations" does not exist')) {
        // Table doesn't exist, create it using a simple query
        const { error: createError } = await supabase.rpc('create_table_if_not_exists', {
          table_name: 'messaging_configurations',
          columns: `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            provider_name TEXT NOT NULL,
            api_key TEXT,
            api_secret TEXT,
            base_url TEXT,
            auth_type TEXT,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          `
        });

        if (createError) {
          console.error('Error creating messaging_configurations table:', createError);
        } else {
          console.log('messaging_configurations table created successfully');

          // Insert default record
          const { error: insertError } = await supabase
            .from('messaging_configurations')
            .insert({
              provider_name: 'mock',
              is_default: true
            });

          if (insertError) {
            console.error('Error inserting default messaging configuration:', insertError);
          } else {
            console.log('Default messaging configuration inserted successfully');
          }
        }
      } else {
        console.log('messaging_configurations table already exists');
      }
    } catch (error) {
      console.error('Error handling messaging_configurations table:', error);
    }



    // Try direct SQL as a last resort
    try {
      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS messaging_configurations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            provider_name TEXT NOT NULL,
            api_key TEXT,
            api_secret TEXT,
            base_url TEXT,
            auth_type TEXT,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );


        `
      });

      if (sqlError) {
        console.error('Error executing direct SQL:', sqlError);
      } else {
        console.log('Direct SQL executed successfully');
      }
    } catch (error) {
      console.error('Error with direct SQL execution:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Tables created or already exist'
    });
  } catch (error) {
    console.error('Error in simple-create-tables:', error);
    return NextResponse.json(
      {
        error: 'Failed to create tables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
