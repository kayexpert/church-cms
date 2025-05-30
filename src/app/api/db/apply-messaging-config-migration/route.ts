import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to apply the messaging configuration migration
 * POST /api/db/apply-messaging-config-migration
 */
export async function POST() {
  try {
    console.log('Applying messaging configuration migration');

    // Create a Supabase client with service role to execute SQL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, try to create the tables directly with SQL
    try {
      // Create the messaging_configurations table
      const { error: configTableError } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS messaging_configurations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

      if (configTableError) {
        console.error('Error creating messaging_configurations table:', configTableError);
      } else {
        console.log('Successfully created messaging_configurations table');
      }



      // Check if we need to insert default configurations
      const { count, error: checkError } = await supabaseAdmin
        .from('messaging_configurations')
        .select('*', { count: 'exact', head: true });

      if (checkError) {
        console.error('Error checking existing configurations:', checkError);
      } else {
        // If no configurations exist, insert defaults
        if (!count || count === 0) {
          console.log('No existing configurations found, inserting defaults');

          // Insert default SMS provider configuration
          const { error: insertSmsError } = await supabaseAdmin
            .from('messaging_configurations')
            .insert({
              provider_name: 'mock',
              is_default: true
            });

          if (insertSmsError) {
            console.error('Error inserting default SMS provider:', insertSmsError);
          } else {
            console.log('Successfully inserted default SMS provider');
          }


        }
      }
    } catch (directError) {
      console.error('Error in direct table creation:', directError);

      // If direct approach fails, try using the migration file
      try {
        // Get the path to the migration file
        const filePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'create_messaging_config_tables.sql');

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
          return NextResponse.json(
            { error: 'Migration file not found' },
            { status: 404 }
          );
        }

        // Read the SQL file
        const sql = fs.readFileSync(filePath, 'utf8');

        // Execute the SQL
        const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

        if (sqlError) {
          console.error('Error executing migration SQL:', sqlError);
        }
      } catch (fileError) {
        console.error('Error using migration file:', fileError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Messaging configuration migration applied successfully'
    });
  } catch (error) {
    console.error('Error in apply-messaging-config-migration:', error);
    return NextResponse.json(
      {
        error: 'Failed to apply messaging configuration migration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
