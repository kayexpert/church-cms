import { ServiceResponse } from "@/types";

/**
 * Delete a file from Supabase storage
 * @param filePath The path of the file to delete
 * @param bucketName The name of the bucket (default: 'members')
 * @returns A promise that resolves to a ServiceResponse
 */
export async function deleteStorageFile(
  filePath: string,
  bucketName: string = 'members'
): Promise<ServiceResponse<boolean>> {
  try {
    // Extract the file path from the URL if it's a full URL
    let path = filePath;
    
    // If it's a full URL, extract just the path part
    if (filePath.includes('storage/v1/object/public/')) {
      const parts = filePath.split('storage/v1/object/public/');
      if (parts.length > 1) {
        const bucketAndPath = parts[1];
        const bucketAndPathParts = bucketAndPath.split('/');
        
        // If the URL contains the bucket name, update it and remove from path
        if (bucketAndPathParts.length > 1) {
          bucketName = bucketAndPathParts[0];
          path = bucketAndPath.substring(bucketName.length + 1); // +1 for the slash
        }
      }
    }

    // Call the API endpoint to delete the file
    const response = await fetch('/api/storage/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketName,
        filePath: path,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Error deleting file:', result.error);
      return {
        data: false,
        error: new Error(result.error || 'Failed to delete file'),
      };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Unexpected error deleting file:', error);
    return {
      data: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
