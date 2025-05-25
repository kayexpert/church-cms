import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/db/sql-script
 * Get the SQL script for creating the messaging tables
 */
export async function GET() {
  try {
    // Get the path to the SQL file
    const filePath = path.join(process.cwd(), 'src', 'db', 'migrations', 'simple_messaging_tables.sql');
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'SQL file not found' },
        { status: 404 }
      );
    }
    
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    return NextResponse.json({ sql });
  } catch (error) {
    console.error('Error in GET /api/db/sql-script:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get SQL script',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
