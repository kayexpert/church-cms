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

        // Note: RLS policies need to be set up manually in the Supabase dashboard
        // or through SQL commands as the JS client doesn't support createPolicy
        results.push({
          bucket: bucket.name,
          success: true,
          message: 'Created (policies need manual setup)'
        });
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
