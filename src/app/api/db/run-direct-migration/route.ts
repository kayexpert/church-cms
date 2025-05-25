import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('Running direct migration script');

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'direct_migration.sql');

    if (!fs.existsSync(sqlFilePath)) {
      console.error('Migration file not found:', sqlFilePath);
      return NextResponse.json(
        { error: 'Migration file not found', details: `File not found at ${sqlFilePath}` },
        { status: 500 }
      );
    }

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('Migration SQL:', sql);

    // Execute each statement separately
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    const results = [];

    for (const statement of statements) {
      try {
        console.log('Executing statement:', statement.trim());
        const { error: stmtError } = await supabase.rpc('exec_sql', {
          sql_query: statement.trim() + ';'
        });

        if (stmtError) {
          console.error('Error executing statement:', statement, stmtError);
          results.push({
            statement: statement.trim(),
            success: false,
            error: stmtError.message
          });
        } else {
          results.push({
            statement: statement.trim(),
            success: true
          });
        }
      } catch (stmtError) {
        console.error('Exception executing statement:', statement, stmtError);
        results.push({
          statement: statement.trim(),
          success: false,
          error: stmtError instanceof Error ? stmtError.message : 'Unknown error'
        });
      }
    }

    // Verify the columns were added
    let verificationResults = [];

    try {
      const { error: budgetItemError } = await supabase
        .from('budget_items')
        .select('account_id')
        .limit(1);

      verificationResults.push({
        table: 'budget_items',
        column: 'account_id',
        success: !budgetItemError,
        error: budgetItemError ? budgetItemError.message : null
      });
    } catch (error) {
      verificationResults.push({
        table: 'budget_items',
        column: 'account_id',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      const { error: expenditureError } = await supabase
        .from('expenditure_entries')
        .select('budget_item_id')
        .limit(1);

      verificationResults.push({
        table: 'expenditure_entries',
        column: 'budget_item_id',
        success: !expenditureError,
        error: expenditureError ? expenditureError.message : null
      });
    } catch (error) {
      verificationResults.push({
        table: 'expenditure_entries',
        column: 'budget_item_id',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      const { error: memberIdError } = await supabase
        .from('income_entries')
        .select('member_id')
        .limit(1);

      verificationResults.push({
        table: 'income_entries',
        column: 'member_id',
        success: !memberIdError,
        error: memberIdError ? memberIdError.message : null
      });
    } catch (error) {
      verificationResults.push({
        table: 'income_entries',
        column: 'member_id',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const allSuccessful = results.every(r => r.success) &&
                          verificationResults.every(r => r.success);

    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful
        ? 'Successfully ran all migration statements'
        : 'Some migration statements failed',
      results,
      verification: verificationResults
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
