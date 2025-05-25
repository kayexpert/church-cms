"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface ImageSkeletonProps extends React.ComponentProps<"div"> {
  /**
   * Whether the image is loading
   */
  isLoading?: boolean;

  /**
   * Whether to show a pulse animation
   */
  pulse?: boolean;

  /**
   * The shape of the skeleton
   */
  shape?: "rectangle" | "circle" | "rounded";

  /**
   * The width of the skeleton
   */
  width?: number | string;

  /**
   * The height of the skeleton
   */
  height?: number | string;
}

/**
 * A skeleton component specifically designed for images
 * with enhanced loading state handling
 */
export function ImageSkeleton({
  className,
  isLoading = true,
  pulse = true,
  shape = "rectangle",
  width,
  height,
  ...props
}: ImageSkeletonProps) {
  // State to track if we should show the skeleton
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  // Update showSkeleton when isLoading changes
  useEffect(() => {
    if (isLoading) {
      // Only set to true if it's not already true to avoid re-renders
      if (!showSkeleton) {
        setShowSkeleton(true);
      }
    } else {
      // Reduce the delay to make transitions smoother
      // This helps prevent the perception of a "refresh" when loading completes
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 150); // Reduced from 300ms to 150ms

      return () => clearTimeout(timer);
    }
  }, [isLoading, showSkeleton]);

  // If we shouldn't show the skeleton, return null
  if (!showSkeleton) return null;

  // Determine the shape class
  const shapeClass =
    shape === "circle"
      ? "rounded-full"
      : shape === "rounded"
        ? "rounded-lg"
        : "rounded-md";

  // Determine the style based on width and height
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <Skeleton
      className={cn(
        shapeClass,
        pulse ? "animate-pulse" : "",
        className
      )}
      style={style}
      {...props}
    />
  );
}
