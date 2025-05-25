import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // SQL to add member_id column to income_entries table
    const migrationSQL = `
      -- Add member_id column to income_entries table
      ALTER TABLE IF EXISTS income_entries
      ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
      
      -- Create an index on member_id for faster queries
      CREATE INDEX IF NOT EXISTS income_entries_member_id_idx ON income_entries(member_id);
      
      -- Add comment to the column
      COMMENT ON COLUMN income_entries.member_id IS 'Reference to the member who made the payment (for tithes, welfare, etc.)';
    `;

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      console.error('Error executing migration:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error executing migration:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
