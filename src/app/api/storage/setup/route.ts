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

export async function GET(request: NextRequest) {
  try {
    // Check for a secret key to prevent unauthorized access
    const { searchParams } = new URL(request.url);
    const secretKey = searchParams.get('key');
    
    if (!secretKey || secretKey !== process.env.NEXT_PUBLIC_API_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Define the buckets we need
    const buckets = [
      { name: 'members', public: true },
      { name: 'events', public: true },
      { name: 'documents', public: false }
    ];
    
    const results = [];
    
    // Get existing buckets
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json({ error: `Error listing buckets: ${listError.message}` }, { status: 500 });
    }
    
    // Create each bucket if it doesn't exist
    for (const bucket of buckets) {
      if (!existingBuckets || !existingBuckets.some(b => b.name === bucket.name)) {
        console.log(`Creating bucket: ${bucket.name}`);
        
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 5242880, // 5MB
        });
        
        if (createError) {
          results.push({ 
            bucket: bucket.name, 
            success: false, 
            error: createError.message 
          });
          continue;
        }
        
        // Set up RLS policies
        try {
          // Allow authenticated users to upload
          await supabaseAdmin.storage.from(bucket.name).createPolicy('authenticated_uploads', {
            name: 'authenticated_uploads',
            definition: {
              role: 'authenticated',
              operation: 'INSERT',
              match: {
                bucket_id: bucket.name
              }
            }
          });
          
          // Allow authenticated users to update their own uploads
          await supabaseAdmin.storage.from(bucket.name).createPolicy('authenticated_updates', {
            name: 'authenticated_updates',
            definition: {
              role: 'authenticated',
              operation: 'UPDATE',
              match: {
                bucket_id: bucket.name
              }
            }
          });
          
          // Set read access based on bucket publicity
          if (bucket.public) {
            // Allow public read access
            await supabaseAdmin.storage.from(bucket.name).createPolicy('public_read', {
              name: 'public_read',
              definition: {
                role: '*',
                operation: 'SELECT',
                match: {
                  bucket_id: bucket.name
                }
              }
            });
          } else {
            // Allow only authenticated users to read
            await supabaseAdmin.storage.from(bucket.name).createPolicy('authenticated_read', {
              name: 'authenticated_read',
              definition: {
                role: 'authenticated',
                operation: 'SELECT',
                match: {
                  bucket_id: bucket.name
                }
              }
            });
          }
          
          results.push({ 
            bucket: bucket.name, 
            success: true, 
            message: 'Created with policies' 
          });
        } catch (policyError) {
          results.push({ 
            bucket: bucket.name, 
            success: false, 
            error: `Created but failed to set policies: ${(policyError as Error).message}` 
          });
        }
      } else {
        results.push({ 
          bucket: bucket.name, 
          success: true, 
          message: 'Already exists' 
        });
      }
    }
    
    return NextResponse.json({ 
      message: 'Storage setup complete',
      results
    });
  } catch (error) {
    console.error('Unexpected error setting up storage:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
