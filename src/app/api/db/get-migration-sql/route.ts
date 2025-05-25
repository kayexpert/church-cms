import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Get the file parameter from the URL
    const searchParams = request.nextUrl.searchParams;
    const file = searchParams.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'Missing file parameter' },
        { status: 400 }
      );
    }
    
    // Validate the file name to prevent directory traversal attacks
    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid file name' },
        { status: 400 }
      );
    }
    
    // Only allow SQL files
    if (!file.endsWith('.sql')) {
      return NextResponse.json(
        { error: 'Only SQL files are allowed' },
        { status: 400 }
      );
    }
    
    // Get the path to the migration file
    const filePath = path.join(process.cwd(), 'src', 'db', 'migrations', file);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Read the file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Return the SQL content
    return new NextResponse(sql, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error getting migration SQL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
