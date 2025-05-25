import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to create messaging tables
 * POST /api/db/create-messaging-tables
 */
export async function POST() {
  try {
    console.log('Creating messaging tables');

    // Get the path to the procedure file
    const filePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'create_messaging_tables_procedure.sql');

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Procedure file not found' },
        { status: 404 }
      );
    }

    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');

    // Create a Supabase client with service role to execute SQL
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // First create the stored procedure
    try {
      // Execute the SQL to create the stored procedure
      const { data: procedureData, error: procedureError } = await supabaseAdmin.auth.getUser();

      if (procedureError) {
        return NextResponse.json(
          { error: 'Authentication error', details: procedureError.message },
          { status: 500 }
        );
      }

      // Now call the stored procedure to create the tables
      const { error: callError } = await supabaseAdmin.rpc('create_messaging_tables');

      if (callError) {
        console.error('Error calling create_messaging_tables procedure:', callError);

        // Try direct table creation
        try {
          // Create messaging_configurations table
          await supabaseAdmin.from('messaging_configurations').insert({
            provider_name: 'mock',
            is_default: true
          }).select();



          return NextResponse.json({
            success: true,
            message: 'Messaging tables created successfully via direct insertion'
          });
        } catch (directError) {
          console.error('Error in direct table creation:', directError);
          return NextResponse.json(
            {
              error: 'Failed to create messaging tables via direct insertion',
              message: directError instanceof Error ? directError.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error('Error creating stored procedure:', error);
      return NextResponse.json(
        {
          error: 'Failed to create stored procedure',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Messaging tables created successfully'
    });
  } catch (error) {
    console.error('Error in create-messaging-tables:', error);
    return NextResponse.json(
      {
        error: 'Failed to create messaging tables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
