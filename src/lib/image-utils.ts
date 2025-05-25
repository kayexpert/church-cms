'use client';

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
  maxWidth: number = 800,
  quality: number = 0.8,
  format: string = 'image/webp'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if the file is already small enough
    if (file.size < 100 * 1024 && file.type === format) {
      // If file is already small (< 100KB) and in the right format, return it as is
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw the image on the canvas
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
 * Check if an image meets minimum dimensions
 * @param file The image file
 * @param minWidth The minimum width required
 * @param minHeight The minimum height required
 * @returns A promise that resolves to a boolean indicating if the image meets the minimum dimensions
 */
export async function checkImageDimensions(
  file: File,
  minWidth: number = 200,
  minHeight: number = 200
): Promise<boolean> {
  try {
    const { width, height } = await getImageDimensions(file);
    return width >= minWidth && height >= minHeight;
  } catch (error) {
    console.error('Error checking image dimensions:', error);
    return false;
  }
}
