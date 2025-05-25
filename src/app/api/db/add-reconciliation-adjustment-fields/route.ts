import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('Running migration to add reconciliation adjustment fields');

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_reconciliation_adjustment_fields.sql');

    if (!fs.existsSync(sqlFilePath)) {
      console.error('Migration file not found:', sqlFilePath);
      return NextResponse.json(
        { error: 'Migration file not found', details: `File not found at ${sqlFilePath}` },
        { status: 500 }
      );
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    // Note: The parameter name should be sql_query, not sql
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });

    if (error) {
      console.error('Error executing migration:', error);
      return NextResponse.json(
        { error: 'Migration failed', details: error.message },
        { status: 500 }
      );
    }

    // Call the function to apply the migration
    const { error: funcError } = await supabase.rpc('apply_reconciliation_adjustment_fields');

    if (funcError) {
      console.error('Error calling migration function:', funcError);
      return NextResponse.json(
        { error: 'Migration function failed', details: funcError.message },
        { status: 500 }
      );
    }

    console.log('Migration completed successfully');
    return NextResponse.json({ success: true, message: 'Reconciliation adjustment fields added successfully' });
  } catch (error) {
    console.error('Exception in migration:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    );
  }
}
