import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint to apply the days_before migration
 * POST /api/db/apply-days-before-migration
 */
export async function POST() {
  try {
    console.log('Applying days_before migration');

    // Get the path to the migration file
    const filePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_days_before_to_messages.sql');
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Migration file not found' },
        { status: 404 }
      );
    }
    
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error applying days_before migration:', error);
      return NextResponse.json(
        { error: 'Failed to apply migration', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Days before migration applied successfully' });
  } catch (error) {
    console.error('Error in apply-days-before-migration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to apply days_before migration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
