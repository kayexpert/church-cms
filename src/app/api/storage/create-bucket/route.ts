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

export async function POST(request: NextRequest) {
  try {
    // Only allow this endpoint to be called from the server
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bucketName } = await request.json();

    if (!bucketName) {
      return NextResponse.json({ error: 'Bucket name is required' }, { status: 400 });
    }

    // Check if bucket already exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (bucketExists) {
      return NextResponse.json({ message: `Bucket ${bucketName} already exists` });
    }

    // Create the bucket with public access
    const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Set up RLS policy to allow authenticated users to upload
    await supabaseAdmin.storage.from(bucketName).createPolicy('authenticated_uploads', {
      name: 'authenticated_uploads',
      definition: {
        role: 'authenticated',
        operation: 'INSERT',
        match: {
          bucket_id: bucketName
        }
      }
    });

    // Set up RLS policy to allow public read access
    await supabaseAdmin.storage.from(bucketName).createPolicy('public_read', {
      name: 'public_read',
      definition: {
        role: '*',
        operation: 'SELECT',
        match: {
          bucket_id: bucketName
        }
      }
    });

    return NextResponse.json({ 
      message: `Bucket ${bucketName} created successfully with public access and authenticated uploads` 
    });
  } catch (error) {
    console.error('Unexpected error creating bucket:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
