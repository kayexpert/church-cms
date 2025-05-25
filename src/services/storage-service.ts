import { supabase } from "@/lib/supabase";
import { ServiceResponse } from "@/types";

/**
 * Ensures that a storage bucket exists
 * This function will try to create the bucket if it doesn't exist
 */
export async function ensureBucketExists(bucketName: string): Promise<ServiceResponse<boolean>> {
  try {
    // First check if the bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return { data: false, error: listError };
    }

    // If the bucket already exists, return success
    if (buckets && buckets.some(bucket => bucket.name === bucketName)) {
      return { data: true, error: null };
    }

    // If the bucket doesn't exist, try to create it via the API
    // This uses the service role key which has admin privileges
    const response = await fetch(`/api/storage/setup?key=${process.env.NEXT_PUBLIC_API_SECRET_KEY || 'secret-key'}`);

    // The setup API will create all required buckets, including the one we need

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating bucket via API:', errorData);
      return {
        data: false,
        error: new Error(`Failed to create bucket: ${errorData.error || response.statusText}`)
      };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Unexpected error ensuring bucket exists:', error);
    return {
      data: false,
      error: new Error(`Unexpected error ensuring bucket exists: ${(error as Error).message}`)
    };
  }
}
