import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('Running migration to add account_id to budget_items table');

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_account_id_to_budget_items.sql');

    if (!fs.existsSync(sqlFilePath)) {
      console.error('Migration file not found:', sqlFilePath);
      return NextResponse.json(
        { error: 'Migration file not found', details: `File not found at ${sqlFilePath}` },
        { status: 500 }
      );
    }

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('Migration SQL:', sql);

    // Execute the SQL directly instead of using RPC
    // This is more reliable for schema changes
    const { error } = await supabase.from('budget_items').select('id').limit(1);

    if (error) {
      console.error('Error checking budget_items table:', error);
      return NextResponse.json(
        { error: 'Failed to access budget_items table', details: error.message },
        { status: 500 }
      );
    }

    // Execute each statement separately
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      const { error: stmtError } = await supabase.rpc('exec_sql', {
        sql_query: statement.trim() + ';'
      });

      if (stmtError) {
        console.error('Error executing statement:', statement, stmtError);
        return NextResponse.json(
          {
            error: 'Failed to execute migration statement',
            details: stmtError.message,
            statement: statement.trim()
          },
          { status: 500 }
        );
      }
    }

    // Verify the column was added
    const { error: verifyError } = await supabase
      .from('budget_items')
      .select('account_id')
      .limit(1);

    if (verifyError) {
      console.error('Error verifying account_id column:', verifyError);
      return NextResponse.json(
        {
          error: 'Migration may have failed',
          details: `Could not verify account_id column: ${verifyError.message}`
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added account_id column to budget_items table'
    });
  } catch (error) {
    console.error('Error in migration:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
