const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Set up the database tables and initial data using consolidated migration files
 * This function applies each consolidated migration file in the correct order
 */
async function setupDatabase() {
  try {
    console.log('Setting up database tables using consolidated migration files...');

    // Define the consolidated migration files in the order they should be applied
    const migrationFiles = [
      'consolidated_core_tables.sql',
      'consolidated_messaging_tables.sql',
      'consolidated_budget_expenditure.sql',
      'consolidated_indexes.sql'
    ];

    // Process each migration file
    for (const migrationFile of migrationFiles) {
      console.log(`\nApplying migration: ${migrationFile}`);

      // Read the SQL file
      const sqlFilePath = path.join(__dirname, 'migrations', migrationFile);
      console.log(`Reading SQL file: ${sqlFilePath}`);

      if (!fs.existsSync(sqlFilePath)) {
        console.warn(`Migration file not found: ${sqlFilePath}`);
        continue;
      }

      const sql = fs.readFileSync(sqlFilePath, 'utf8');

      // First attempt: Execute the SQL directly as a single batch
      console.log(`Attempting to apply ${migrationFile} as a single batch...`);
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql }).catch(() => {
        // If exec_sql doesn't exist, try another method
        return { error: { message: 'exec_sql function not available' } };
      });

      if (error) {
        console.error(`Error applying ${migrationFile} as a single batch:`, error.message || error);

        // Second attempt: Try alternative method with individual statements
        console.log(`Trying alternative method with individual statements for ${migrationFile}...`);

        // Split the SQL into individual statements
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
        console.log(`Found ${statements.length} SQL statements to execute individually`);

        // Track success/failure counts
        let successCount = 0;
        let failureCount = 0;

        // Execute each statement separately
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.trim()) {
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            try {
              const { error: stmtError } = await supabaseAdmin.rpc('exec_sql', {
                sql_query: statement + ';'
              }).catch(() => {
                // If exec_sql doesn't exist, try direct query
                return supabaseAdmin.from('_temp_migrations').insert({
                  name: `temp_migration_${Date.now()}`,
                  sql: statement + ';'
                });
              });

              if (stmtError) {
                console.error(`Error executing statement ${i + 1}: ${statement.substring(0, 100)}...`, stmtError.message || stmtError);
                failureCount++;
                // Continue with other statements even if one fails
              } else {
                successCount++;
              }
            } catch (stmtExecError) {
              console.error(`Exception executing statement ${i + 1}:`, stmtExecError);
              failureCount++;
            }
          }
        }

        console.log(`Alternative method completed for ${migrationFile}. Success: ${successCount}, Failures: ${failureCount}`);

        if (successCount > 0) {
          console.log(`Some statements in ${migrationFile} were successfully applied.`);
        }

        if (failureCount > 0) {
          console.log(`Some statements in ${migrationFile} failed to apply. Check the logs for details.`);
        }
      } else {
        console.log(`Migration ${migrationFile} applied successfully!`);
      }
    }

    console.log('\nDatabase setup completed!');
    console.log('If you encountered any errors, you may need to apply some migrations manually using the Supabase SQL Editor.');
  } catch (error) {
    console.error('Error setting up database:', error.message || error);
    console.log('You may need to set up the database manually using the Supabase SQL Editor.');
  }
}

setupDatabase();
