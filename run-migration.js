// Script to run the update_messages_table.sql migration
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Create a Supabase client with service role for more permissions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Running update_messages_table.sql migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', 'update_messages_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL using the Supabase RPC function
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: migrationSql });
    
    if (error) {
      console.error('Error running migration:', error);
      return;
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();
