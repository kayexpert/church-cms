"use client";

import Image from "next/image";
import { useState, useCallback, memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface OptimizedMemberImageProps {
  src?: string | null;
  alt: string;
  fallbackText: string | React.ReactNode;
  className?: string;
  size?: number;
}

/**
 * Optimized member image component using Next.js Image
 * - Uses Next.js Image for optimized loading
 * - Provides fallback for missing images
 * - Handles loading states
 * - Memoized for better performance
 */
const OptimizedMemberImageBase = ({
  src,
  alt,
  fallbackText,
  className = "",
  size = 80
}: OptimizedMemberImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle image load complete - memoized to prevent unnecessary re-renders
  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handle image load error - memoized to prevent unnecessary re-renders
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  return (
    <Avatar className={`${className} ${isLoading ? "animate-pulse" : ""}`}>
      {src && !hasError ? (
        <div className="relative w-full h-full overflow-hidden rounded-full">
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="object-cover"
            priority={false}
            onLoad={handleLoadComplete}
            onError={handleError}
            sizes={`(max-width: 640px) ${size}px, ${size}px`}
          />
        </div>
      ) : (
        <AvatarFallback className="text-xl bg-muted">
          {fallbackText}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

// Export a memoized version of the component to prevent unnecessary re-renders
export const OptimizedMemberImage = memo(OptimizedMemberImageBase);
