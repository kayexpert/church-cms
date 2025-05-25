/**
 * Optimized Image Utilities
 * 
 * This file consolidates image utility functions from multiple files:
 * - image-utils.ts
 * - components/settings/database/image-optimization.tsx
 * 
 * It provides a unified interface for image operations with:
 * - Improved error handling
 * - Better performance
 * - More consistent API
 */

import { supabase } from './supabase';
import { toast } from "sonner";

// Constants
const DEFAULT_MAX_WIDTH = 800;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_FORMAT = 'image/webp';
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

/**
 * Resize and optimize an image before upload
 * @param file The file to resize and optimize
 * @param maxWidth The maximum width of the resized image
 * @param quality The quality of the output image (0-1)
 * @param format The format of the output image ('image/jpeg', 'image/webp')
 * @returns A promise that resolves to a Blob containing the resized image
 */
export async function resizeAndOptimizeImage(
  file: File,
  maxWidth: number = DEFAULT_MAX_WIDTH,
  quality: number = DEFAULT_QUALITY,
  format: string = DEFAULT_FORMAT
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if the file is already small enough
    if (file.size < 100 * 1024 && file.type === format) {
      // If file is already small (< 100KB) and in the right format, return it as is
      resolve(file);
      return;
    }
    
    // Create an image element to load the file
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      // Create a canvas to draw the resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Apply some smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to specified format with given quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        format,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get the appropriate image format based on browser support
 * @returns The best supported image format ('image/webp' or 'image/jpeg')
 */
export function getBestSupportedImageFormat(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_FORMAT;
  }
  
  // Check if WebP is supported
  const canvas = document.createElement('canvas');
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'image/webp';
  }
  
  // Fall back to JPEG
  return 'image/jpeg';
}

/**
 * Get image dimensions from a file
 * @param file The image file
 * @returns A promise that resolves to an object containing the width and height of the image
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if a file is an image
 * @param file The file to check
 * @returns True if the file is an image, false otherwise
 */
export function isImageFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Optimize images in storage buckets
 * @returns Promise with the optimization result
 */
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
      toast.dismiss(progressToast);
      toast.error(`Failed to list buckets: ${bucketsError.message}`);
      return { 
        success: false, 
        totalImages: 0, 
        optimizedImages: 0, 
        totalSaved: 0,
        error: bucketsError.message
      };
    }
    
    if (!buckets || buckets.length === 0) {
      toast.dismiss(progressToast);
      toast.info("No storage buckets found to optimize");
      return { success: false, totalImages: 0, optimizedImages: 0, totalSaved: 0 };
    }
    
    // Filter buckets that might contain images
    const imageBuckets = buckets.filter(bucket => 
      bucket.name.includes('image') || 
      bucket.name.includes('media') || 
      bucket.name.includes('profile') ||
      bucket.name.includes('avatar') ||
      bucket.name.includes('upload')
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
          return ext && IMAGE_EXTENSIONS.includes(ext);
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
        return ext && IMAGE_EXTENSIONS.includes(ext);
      });
      
      // Process each image
      for (const file of imageFiles) {
        processedImages++;
        
        // Update progress every 5 images
        if (processedImages % 5 === 0 || processedImages === totalImages) {
          toast.loading(`Optimizing images (${processedImages}/${totalImages})...`, { id: progressToast });
        }
        
        try {
          // Download the image
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket.name)
            .download(file.name);
          
          if (downloadError || !fileData) {
            console.error(`Error downloading file ${file.name}:`, downloadError);
            continue;
          }
          
          // Get the original size
          const originalSize = fileData.size;
          
          // Optimize the image
          const bestFormat = getBestSupportedImageFormat();
          const optimizedImage = await resizeAndOptimizeImage(
            new File([fileData], file.name, { type: fileData.type }),
            1200, // Max width
            0.85, // Quality
            bestFormat
          );
          
          // Calculate size reduction
          const newSize = optimizedImage.size;
          const sizeReduction = originalSize - newSize;
          
          // Only upload if we saved at least 10%
          if (sizeReduction > originalSize * 0.1) {
            // Upload the optimized image
            const { error: uploadError } = await supabase.storage
              .from(bucket.name)
              .upload(file.name, optimizedImage, { upsert: true });
            
            if (uploadError) {
              console.error(`Error uploading optimized file ${file.name}:`, uploadError);
              continue;
            }
            
            // Count as optimized
            optimizedImages++;
            totalSaved += sizeReduction;
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
    }
    
    // Show completion toast
    toast.dismiss(progressToast);
    if (optimizedImages > 0) {
      const savedMB = (totalSaved / (1024 * 1024)).toFixed(2);
      toast.success(`Optimized ${optimizedImages} of ${totalImages} images, saved ${savedMB} MB`);
    } else {
      toast.info(`No images needed optimization out of ${totalImages} checked`);
    }
    
    return {
      success: true,
      totalImages,
      optimizedImages,
      totalSaved
    };
  } catch (error) {
    console.error('Error optimizing images:', error);
    toast.error(`Error optimizing images: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      totalImages: 0,
      optimizedImages: 0,
      totalSaved: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
