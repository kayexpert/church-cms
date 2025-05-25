/**
 * Add Missing Indexes Script
 * 
 * This script adds missing indexes for frequently used queries.
 * It should be run once to optimize the database.
 */

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
 * Add missing indexes to the database
 */
async function addMissingIndexes() {
  try {
    console.log('Adding missing indexes...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'add-missing-indexes.sql');
    console.log(`Reading SQL file: ${sqlFilePath}`);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    console.log('Executing SQL...');
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql }).catch(() => {
      // If exec_sql doesn't exist, try another method
      return { error: { message: 'exec_sql function not available' } };
    });

    if (error) {
      console.error('Error executing SQL:', error.message || error);

      // Try alternative method with individual statements
      console.log('Trying alternative method with individual statements...');

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
              return supabaseAdmin.from('_temp_indexes').insert({
                name: `temp_index_${Date.now()}`,
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

      console.log(`Alternative method completed. Success: ${successCount}, Failures: ${failureCount}`);

      if (successCount > 0) {
        console.log('Some indexes were successfully added.');
      }

      if (failureCount > 0) {
        console.log('Some indexes failed to be added. Check the logs for details.');
      }

      return;
    }

    console.log('Missing indexes added successfully!');
  } catch (error) {
    console.error('Error adding missing indexes:', error.message || error);
  }
}

// Run the script
addMissingIndexes()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in script:', error);
    process.exit(1);
  });
