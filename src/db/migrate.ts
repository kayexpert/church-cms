import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

// Function to execute SQL directly
async function executeSql(query: string) {
  try {
    // First try using the SQL API
    const { error } = await supabaseAdmin.rpc('execute_sql', { query });

    if (error) {
      // If that fails, try the alternative method
      console.log('First method failed, trying alternative method...');

      // Try using the _sql table if it exists
      const { error: sqlError } = await supabaseAdmin.rpc('execute', { query });

      if (sqlError) {
        console.error('Alternative method also failed:', sqlError);
        throw sqlError;
      }
    }

    return { error: null };
  } catch (error) {
    console.error('Error executing SQL:', error);
    return { error };
  }
}

/**
 * Set up the migrations table if it doesn't exist
 */
async function setupMigrationTable() {
  try {
    console.log('Setting up migrations table...');

    // Create migrations table if it doesn't exist
    const { error } = await executeSql(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    if (error) {
      throw error;
    }

    console.log('Migrations table setup complete.');
  } catch (error) {
    console.error('Error setting up migrations table:', error);
    throw error;
  }
}

/**
 * Get a list of migrations that have already been applied
 */
async function getAppliedMigrations(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('migrations')
      .select('name')
      .order('id', { ascending: true });

    if (error) throw error;
    return data?.map(m => m.name) || [];
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    throw error;
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(fileName: string, sql: string): Promise<void> {
  try {
    console.log(`Applying migration: ${fileName}`);

    // Execute the migration
    const { error } = await executeSql(sql);

    if (error) {
      console.error(`Error executing migration ${fileName}:`, error);
      throw error;
    }

    // Record the migration
    const { error: recordError } = await supabaseAdmin
      .from('migrations')
      .insert({ name: fileName });

    if (recordError) {
      console.error(`Error recording migration ${fileName}:`, recordError);
      throw recordError;
    }

    console.log(`Successfully applied migration: ${fileName}`);
  } catch (error) {
    console.error(`Failed to apply migration ${fileName}:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function migrate() {
  try {
    // Set up the migrations table
    await setupMigrationTable();

    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log('Already applied migrations:', appliedMigrations);

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('Available migration files:', migrationFiles);

    // Apply new migrations
    let appliedCount = 0;
    for (const file of migrationFiles) {
      if (appliedMigrations.includes(file)) {
        console.log(`Migration ${file} already applied, skipping`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        console.log(`Applying migration: ${file}`);
        await applyMigration(file, sql);
        console.log(`Successfully applied migration: ${file}`);
        appliedCount++;
      } catch (error) {
        console.error(`Migration failed for ${file}: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Stopping migration process.');
        process.exit(1);
      }
    }

    if (appliedCount === 0) {
      console.log('No new migrations to apply.');
    } else {
      console.log(`Successfully applied ${appliedCount} migration(s).`);
    }
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrate().catch(console.error);
