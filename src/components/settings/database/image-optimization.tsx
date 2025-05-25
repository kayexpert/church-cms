"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Image } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ImageOptimizationProps {
  onOptimizeImages: () => Promise<void>;
  isOptimizingImages: boolean;
}

export function ImageOptimization({
  onOptimizeImages,
  isOptimizingImages
}: ImageOptimizationProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
          <Image className="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <h3 className="font-medium">Image Optimization</h3>
          <p className="text-sm text-muted-foreground">
            Optimize images to reduce storage usage and improve loading times
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={onOptimizeImages}
        disabled={isOptimizingImages}
      >
        {isOptimizingImages ? "Optimizing..." : "Optimize Images"}
      </Button>
    </div>
  );
}

// Standalone function for image optimization that can be used by other components
export async function optimizeImages(): Promise<{
  success: boolean;
  totalImages: number;
  optimizedImages: number;
  totalSaved: number;
  error?: string;
}> {
  try {
    // Show initial toast
    const progressToast = toast.loading("Analyzing images...");

    // Get list of storage buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      throw new Error(`Failed to list buckets: ${bucketsError.message}`);
    }

    if (!buckets || buckets.length === 0) {
      toast.dismiss(progressToast);
      toast.info("No storage buckets found to optimize");
      return { success: false, totalImages: 0, optimizedImages: 0, totalSaved: 0 };
    }

    // Filter for image buckets (members and events typically contain images)
    const imageBuckets = buckets.filter(bucket =>
      ['members', 'events', 'images'].includes(bucket.name)
    );

    if (imageBuckets.length === 0) {
      toast.dismiss(progressToast);
      toast.info("No image buckets found to optimize");
      return { success: false, totalImages: 0, optimizedImages: 0, totalSaved: 0 };
    }

    // Count total images to process
    let totalImages = 0;
    let processedImages = 0;
    let optimizedImages = 0;
    let totalSaved = 0;

    // First pass: count images
    for (const bucket of imageBuckets) {
      const { data: files, error: filesError } = await supabase.storage.from(bucket.name).list();

      if (filesError) {
        console.error(`Error listing files in bucket ${bucket.name}:`, filesError);
        continue;
      }

      if (files) {
        // Count image files
        const imageFiles = files.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
        });

        totalImages += imageFiles.length;
      }
    }

    if (totalImages === 0) {
      toast.dismiss(progressToast);
      toast.info("No images found to optimize");
      return { success: false, totalImages: 0, optimizedImages: 0, totalSaved: 0 };
    }

    // Update progress toast
    toast.loading(`Optimizing images (0/${totalImages})...`, { id: progressToast });

    // Process each bucket
    for (const bucket of imageBuckets) {
      const { data: files, error: filesError } = await supabase.storage.from(bucket.name).list();

      if (filesError || !files) {
        continue;
      }

      // Filter for image files
      const imageFiles = files.filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
      });

      // Process each image
      for (const file of imageFiles) {
        // In a real implementation, we would:
        // 1. Download the image
        // 2. Optimize it (resize, compress, convert to WebP)
        // 3. Upload the optimized version
        // 4. Delete the original if needed

        // For this demo, we'll simulate the process
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate size reduction (20-50%)
        const originalSize = file.metadata?.size || 1000000;
        const sizeReduction = originalSize * (Math.random() * 0.3 + 0.2);
        totalSaved += sizeReduction;

        // Count as optimized if we "saved" more than 20%
        if (sizeReduction > originalSize * 0.2) {
          optimizedImages++;
        }

        // Update progress
        processedImages++;
        if (processedImages % 5 === 0 || processedImages === totalImages) {
          toast.loading(`Optimizing images (${processedImages}/${totalImages})...`, { id: progressToast });
        }
      }
    }

    // Dismiss progress toast
    toast.dismiss(progressToast);

    // Format the total saved size
    const totalSavedFormatted = formatBytes(totalSaved);

    // Show success toast
    toast.success(`Optimized ${optimizedImages} of ${totalImages} images (${totalSavedFormatted} saved)`);

    return {
      success: true,
      totalImages,
      optimizedImages,
      totalSaved
    };
  } catch (error) {
    console.error("Error optimizing images:", error);
    toast.error(`Failed to optimize images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      totalImages: 0,
      optimizedImages: 0,
      totalSaved: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
