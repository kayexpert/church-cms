import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check if the column already exists by trying to select it
    const columnCheckResult = await supabase.from('income_entries').select('member_id').limit(1);
    const columnExists = !columnCheckResult.error;

    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: "Member ID column already exists in income_entries table"
      });
    }

    // Since we can't use direct SQL execution with the JavaScript client,
    // we'll use a workaround by creating a temporary stored procedure

    // First, create a temporary stored procedure to execute our migration
    const createProcedureResult = await supabase.rpc('create_member_id_migration_procedure', {});

    if (createProcedureResult.error) {
      console.error('Error creating migration procedure:', createProcedureResult.error);

      // Try an alternative approach - create the procedure directly
      await supabase.from('_migrations_temp').insert({
        name: 'create_member_id_procedure',
        sql: `
          CREATE OR REPLACE FUNCTION execute_member_id_migration()
          RETURNS void AS $$
          BEGIN
            -- Add member_id column if it doesn't exist
            ALTER TABLE IF EXISTS income_entries
            ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

            -- Create an index on member_id for faster queries
            CREATE INDEX IF NOT EXISTS income_entries_member_id_idx ON income_entries(member_id);

            -- Add comment to the column
            COMMENT ON COLUMN income_entries.member_id IS 'Reference to the member who made the payment (for tithes, welfare, etc.)';
          END;
          $$ LANGUAGE plpgsql;
        `
      });
    }

    // Now execute the procedure
    const executeProcedureResult = await supabase.rpc('execute_member_id_migration', {});

    if (executeProcedureResult.error) {
      console.error('Error executing migration procedure:', executeProcedureResult.error);

      // If the procedure execution fails, try a simpler approach
      // We'll use the REST API to modify the table structure

      // Create a new table with the desired structure
      const { error: createTableError } = await supabase.rpc('create_temp_income_table_with_member_id', {});

      if (createTableError) {
        console.error('Error creating temporary table:', createTableError);
        return NextResponse.json({
          success: false,
          error: `Failed to execute migration: ${createTableError.message}. Please run the migration from the admin page.`
        }, { status: 500 });
      }
    }

    // Verify the column was added
    const verificationResult = await supabase.from('income_entries').select('member_id').limit(1);
    const success = !verificationResult.error;

    if (!success) {
      // If verification fails, we need to inform the user to use the admin interface
      return NextResponse.json({
        success: false,
        message: 'Migration requires admin privileges',
        error: 'This migration requires admin privileges. Please contact your administrator or use the Supabase dashboard to run the migration SQL directly.'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added member_id column to income_entries table'
    });
  } catch (error) {
    console.error('Unexpected error executing migration:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        message: 'This migration requires admin privileges. Please use the Supabase dashboard to run the migration SQL directly.'
      },
      { status: 500 }
    );
  }
}
