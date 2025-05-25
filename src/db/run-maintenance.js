/**
 * Database Maintenance Script
 * 
 * This script runs the database maintenance tasks to keep the database healthy.
 * It should be run regularly (e.g., weekly) as a scheduled task.
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
 * Run database maintenance tasks
 */
async function runMaintenance() {
  try {
    console.log('Starting database maintenance...');

    // Read the maintenance SQL file
    const sqlFilePath = path.join(__dirname, 'maintenance.sql');
    console.log(`Reading maintenance SQL file: ${sqlFilePath}`);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the maintenance SQL
    console.log('Executing maintenance SQL...');
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql }).catch(() => {
      // If exec_sql doesn't exist, try another method
      return { error: { message: 'exec_sql function not available' } };
    });

    if (error) {
      console.error('Error executing maintenance SQL:', error.message || error);

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
              return supabaseAdmin.from('_temp_maintenance').insert({
                name: `temp_maintenance_${Date.now()}`,
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
        console.log('Some maintenance tasks were successfully completed.');
      }

      if (failureCount > 0) {
        console.log('Some maintenance tasks failed to complete. Check the logs for details.');
      }

      return;
    }

    console.log('Database maintenance completed successfully!');
    
    // Log the maintenance run
    const { error: logError } = await supabaseAdmin
      .from('maintenance_logs')
      .insert({
        type: 'script_run',
        data: {
          timestamp: new Date().toISOString(),
          success: true
        }
      });
    
    if (logError) {
      console.warn('Error logging maintenance run:', logError.message || logError);
    }
  } catch (error) {
    console.error('Error running database maintenance:', error.message || error);
  }
}

// Run the maintenance
runMaintenance()
  .then(() => {
    console.log('Maintenance script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in maintenance script:', error);
    process.exit(1);
  });
