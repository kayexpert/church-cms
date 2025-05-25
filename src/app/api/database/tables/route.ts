import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/database/tables
 * Get all tables in the database
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Get database tables endpoint called');

    // Create a Supabase client with service role for more permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Try different approaches to get the tables
    
    // Approach 1: Try using information_schema
    const { data: infoSchemaTables, error: infoSchemaError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (!infoSchemaError && infoSchemaTables) {
      console.log('Found tables using information_schema:', infoSchemaTables.map(t => t.table_name).join(', '));
      return NextResponse.json({
        success: true,
        tables: infoSchemaTables.map(t => t.table_name)
      });
    }

    console.log('Error getting tables using information_schema:', infoSchemaError);

    // Approach 2: Try using pg_tables
    const { data: pgTables, error: pgTablesError } = await supabaseAdmin
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (!pgTablesError && pgTables) {
      console.log('Found tables using pg_tables:', pgTables.map(t => t.tablename).join(', '));
      return NextResponse.json({
        success: true,
        tables: pgTables.map(t => t.tablename)
      });
    }

    console.log('Error getting tables using pg_tables:', pgTablesError);

    // Approach 3: Try using a SQL query
    const { data: sqlTables, error: sqlError } = await supabaseAdmin
      .rpc('get_tables');

    if (!sqlError && sqlTables) {
      console.log('Found tables using SQL query:', sqlTables.join(', '));
      return NextResponse.json({
        success: true,
        tables: sqlTables
      });
    }

    console.log('Error getting tables using SQL query:', sqlError);

    // Approach 4: Try a direct SQL query
    const { data: directSqlTables, error: directSqlError } = await supabaseAdmin
      .from('_metadata')
      .select('tables');

    if (!directSqlError && directSqlTables) {
      console.log('Found tables using _metadata:', directSqlTables);
      return NextResponse.json({
        success: true,
        tables: directSqlTables
      });
    }

    console.log('Error getting tables using _metadata:', directSqlError);

    // If all approaches fail, return a hardcoded list of common tables
    const commonTables = [
      'members',
      'covenant_families',
      'groups',
      'messages',
      'message_recipients',
      'message_logs',
      'sms_configurations'
    ];

    console.log('Using hardcoded list of common tables:', commonTables.join(', '));
    
    return NextResponse.json({
      success: true,
      tables: commonTables,
      note: 'Using hardcoded list of common tables as fallback'
    });
  } catch (error) {
    console.error('Error in get database tables endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get database tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
