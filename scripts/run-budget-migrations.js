// Script to run budget-expenditure integration migrations
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or service role key not found in environment variables.');
  console.error('Make sure you have a .env.local file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running budget-expenditure integration migrations...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'src', 'db', 'migrations', 'direct_migration.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('Migration file not found:', sqlFilePath);
      process.exit(1);
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
      const { data: budgetItemData, error: budgetItemError } = await supabase
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
      const { data: expenditureData, error: expenditureError } = await supabase
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
    
    const allSuccessful = results.every(r => r.success) && 
                          verificationResults.every(r => r.success);

    console.log('Migration results:', {
      success: allSuccessful,
      message: allSuccessful 
        ? 'Successfully ran all migration statements' 
        : 'Some migration statements failed',
      results,
      verification: verificationResults
    });

    if (allSuccessful) {
      console.log('✅ All migrations completed successfully!');
    } else {
      console.error('❌ Some migrations failed. See details above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

runMigration();
