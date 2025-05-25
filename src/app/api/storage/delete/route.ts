import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * API endpoint to delete a file from Supabase storage
 * POST /api/storage/delete
 * 
 * Request body:
 * {
 *   bucketName: string, // The name of the bucket (default: 'members')
 *   filePath: string    // The path of the file to delete
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { bucketName = 'members', filePath } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Check if the file exists before attempting to delete
    const { data: fileExists, error: checkError } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', {
        search: filePath
      });

    if (checkError) {
      console.error('Error checking file existence:', checkError);
      return NextResponse.json({
        error: `Failed to check if file exists: ${checkError.message}`
      }, { status: 500 });
    }

    // If the file doesn't exist, return success (idempotent operation)
    if (!fileExists || fileExists.length === 0) {
      console.log(`File ${filePath} not found in bucket ${bucketName}, skipping deletion`);
      return NextResponse.json({ 
        success: true, 
        message: 'File not found, no deletion needed' 
      });
    }

    // Delete the file
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([filePath]);

    if (deleteError) {
      console.error('Error deleting file:', deleteError);
      return NextResponse.json({
        error: `Failed to delete file: ${deleteError.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `File ${filePath} deleted successfully from bucket ${bucketName}`
    });
  } catch (error) {
    console.error('Unexpected error in file deletion API:', error);
    return NextResponse.json({
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
