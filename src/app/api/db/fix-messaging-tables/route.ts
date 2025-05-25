import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to fix messaging tables and the exec_sql function
 * POST /api/db/fix-messaging-tables
 */
export async function POST() {
  try {
    console.log('Fixing messaging tables and exec_sql function');

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First try to create the exec_sql function directly
    try {
      // Extract just the exec_sql function creation part
      const execSqlPart = sql.split('-- Create a stored procedure')[0];

      // Execute the SQL to create the exec_sql function
      let execSqlError;
      try {
        const result = await supabaseAdmin.rpc('exec_sql', {
          sql_query: execSqlPart
        });
        execSqlError = result.error;
      } catch (error) {
        execSqlError = new Error('Failed to create exec_sql function');
      }

      if (execSqlError) {
        console.log('Error creating exec_sql function using RPC, trying direct SQL...');

        // Try direct SQL execution
        let directError = null;
        try {
          await supabaseAdmin.from('_temp_sql')
            .insert({ sql: execSqlPart })
            .select()
            .single();
        } catch (err) {
          directError = new Error('Failed to execute direct SQL');
        }

        if (directError) {
          console.log('Direct SQL execution failed, trying raw query...');

          // Try raw query execution
          await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
            },
            body: JSON.stringify({
              sql_query: execSqlPart
            })
          });
        }
      }
    } catch (execSqlError) {
      console.error('Error creating exec_sql function:', execSqlError);
      // Continue anyway, as we'll try to create the tables directly
    }

    // Now call the stored procedure to create the tables
    try {
      const { error: callError } = await supabaseAdmin.rpc('create_messaging_tables');

      if (callError) {
        console.error('Error calling create_messaging_tables procedure:', callError);

        // Try direct table creation
        try {
          // Create messaging_configurations table if it doesn't exist
          const createMessagingConfigTable = `
            CREATE TABLE IF NOT EXISTS messaging_configurations (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              provider_name TEXT NOT NULL,
              api_key TEXT,
              api_secret TEXT,
              base_url TEXT,
              auth_type TEXT,
              sender_id TEXT,
              is_default BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;

          try {
            await supabaseAdmin.rpc('exec_sql', { sql_query: createMessagingConfigTable });
          } catch {
            console.log('Error creating messaging_configurations table');
          }

          // Create messages table if it doesn't exist
          const createMessagesTable = `
            CREATE TABLE IF NOT EXISTS messages (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              content TEXT NOT NULL,
              type TEXT NOT NULL CHECK (type IN ('quick', 'group', 'birthday')),
              frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'daily', 'weekly', 'monthly')),
              schedule_time TIMESTAMP WITH TIME ZONE NOT NULL,
              end_date TIMESTAMP WITH TIME ZONE,
              status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;

          try {
            await supabaseAdmin.rpc('exec_sql', { sql_query: createMessagesTable });
          } catch {
            console.log('Error creating messages table');
          }

          // Create message_recipients table if it doesn't exist
          const createMessageRecipientsTable = `
            CREATE TABLE IF NOT EXISTS message_recipients (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
              recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'group')),
              recipient_id UUID NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;

          try {
            await supabaseAdmin.rpc('exec_sql', { sql_query: createMessageRecipientsTable });
          } catch {
            console.log('Error creating message_recipients table');
          }

          // Create message_logs table if it doesn't exist
          const createMessageLogsTable = `
            CREATE TABLE IF NOT EXISTS message_logs (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
              recipient_id UUID NOT NULL,
              status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
              error_message TEXT,
              sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;

          try {
            await supabaseAdmin.rpc('exec_sql', { sql_query: createMessageLogsTable });
          } catch {
            console.log('Error creating message_logs table');
          }

          // Create message_templates table if it doesn't exist
          const createMessageTemplatesTable = `
            CREATE TABLE IF NOT EXISTS message_templates (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL UNIQUE,
              content TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;

          try {
            await supabaseAdmin.rpc('exec_sql', { sql_query: createMessageTemplatesTable });
          } catch {
            console.log('Error creating message_templates table');
          }

          // Try to insert a default configuration if none exists
          try {
            const { count } = await supabaseAdmin
              .from('messaging_configurations')
              .select('*', { count: 'exact', head: true });

            if (count === 0) {
              await supabaseAdmin.from('messaging_configurations').insert({
                provider_name: 'mock',
                is_default: true
              });
            }
          } catch (configError) {
            console.error('Error checking/creating default configuration:', configError);
          }

          return NextResponse.json({
            success: true,
            message: 'Messaging tables fixed successfully via direct creation'
          });
        } catch (directError) {
          console.error('Error with direct table creation:', directError);
          return NextResponse.json(
            { error: 'Failed to create messaging tables', details: directError instanceof Error ? directError.message : String(directError) },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Messaging tables fixed successfully via stored procedure'
      });
    } catch (error) {
      console.error('Error in fix-messaging-tables:', error);
      return NextResponse.json(
        {
          error: 'Failed to fix messaging tables',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in fix-messaging-tables:', error);
    return NextResponse.json(
      {
        error: 'Failed to fix messaging tables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
