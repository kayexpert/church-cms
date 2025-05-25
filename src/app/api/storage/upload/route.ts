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
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const memberId = formData.get('memberId') as string;
    const userId = formData.get('userId') as string;
    const bucketName = formData.get('bucketName') as string || 'members';

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!userId && !memberId) {
      return NextResponse.json({ error: 'Either userId or memberId is required' }, { status: 400 });
    }

    // Generate file name and path
    const fileExt = file.name.split('.').pop();
    const id = userId || memberId;
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Check if bucket exists, create if it doesn't
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();

    if (!buckets || !buckets.find(bucket => bucket.name === bucketName)) {
      console.log(`Creating bucket: ${bucketName}`);

      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });

      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
        return NextResponse.json({
          error: `Failed to create storage bucket: ${createBucketError.message}`
        }, { status: 500 });
      }

      // Set up RLS policies
      try {
        // Allow authenticated users to upload
        await supabaseAdmin.storage.from(bucketName).createPolicy('authenticated_uploads', {
          name: 'authenticated_uploads',
          definition: {
            role: 'authenticated',
            operation: 'INSERT'
          }
        });

        // Allow public read access
        await supabaseAdmin.storage.from(bucketName).createPolicy('public_read', {
          name: 'public_read',
          definition: {
            role: '*',
            operation: 'SELECT'
          }
        });
      } catch (policyError) {
        console.error('Error setting up policies:', policyError);
        // Continue anyway, we'll use admin access
      }
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload the file using admin privileges
    const { error: uploadError, data: uploadData } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({
        error: `Failed to upload image: ${uploadError.message}`
      }, { status: 500 });
    }

    // Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      return NextResponse.json({
        error: 'Failed to get public URL for uploaded image'
      }, { status: 500 });
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Unexpected error uploading image:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
