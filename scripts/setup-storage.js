// This script sets up the storage buckets and policies in Supabase
// Run this script once to set up the storage infrastructure
// Usage: node scripts/setup-storage.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local file manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      envVars[key.trim()] = value;
      // Also set as process.env for convenience
      process.env[key.trim()] = value;
    }
  });

  return envVars;
}

// Load environment variables
const env = loadEnv();

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function setupStorage() {
  try {
    console.log('Setting up storage buckets and policies...');

    // Define the buckets we need
    const buckets = [
      { name: 'members', public: true },
      { name: 'events', public: true },
      { name: 'documents', public: false }
    ];

    // Get existing buckets
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
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
          console.error(`Error creating bucket ${bucket.name}:`, createError);
          continue;
        }

        // Set up RLS policies
        console.log(`Setting up policies for bucket: ${bucket.name}`);

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

        console.log(`Bucket ${bucket.name} created with policies`);
      } else {
        console.log(`Bucket ${bucket.name} already exists`);
      }
    }

    console.log('Storage setup complete!');
  } catch (error) {
    console.error('Unexpected error setting up storage:', error);
  }
}

// Run the setup
setupStorage();
