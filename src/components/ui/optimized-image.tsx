"use client";

import { useState, useCallback, memo, forwardRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  showLoadingSpinner?: boolean;
  loadingClassName?: string;
  errorClassName?: string;
  onLoadComplete?: () => void;
  onError?: () => void;
}

const OptimizedImageComponent = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    fallbackSrc = '/images/placeholder.png',
    showLoadingSpinner = true,
    loadingClassName = 'animate-pulse bg-gray-200',
    errorClassName = 'bg-gray-100 flex items-center justify-center text-gray-400',
    className,
    onLoadComplete,
    onError,
    ...props
  }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);

    const handleLoad = useCallback(() => {
      setIsLoading(false);
      setHasError(false);
      onLoadComplete?.();
    }, [onLoadComplete]);

    const handleError = useCallback(() => {
      setIsLoading(false);
      setHasError(true);
      
      // Try fallback if available and not already using it
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setIsLoading(true);
        setHasError(false);
      } else {
        onError?.();
      }
    }, [fallbackSrc, currentSrc, onError]);

    if (hasError && (!fallbackSrc || currentSrc === fallbackSrc)) {
      return (
        <div 
          className={cn(
            'relative overflow-hidden',
            errorClassName,
            className
          )}
          style={{ 
            width: props.width || '100%', 
            height: props.height || 'auto',
            aspectRatio: props.width && props.height ? `${props.width}/${props.height}` : undefined
          }}
        >
          <span className="text-sm">Failed to load image</span>
        </div>
      );
    }

    return (
      <div className={cn('relative overflow-hidden', className)}>
        {isLoading && showLoadingSpinner && (
          <div 
            className={cn(
              'absolute inset-0 z-10',
              loadingClassName
            )}
            style={{ 
              width: props.width || '100%', 
              height: props.height || 'auto',
              aspectRatio: props.width && props.height ? `${props.width}/${props.height}` : undefined
            }}
          />
        )}
        
        <Image
          ref={ref}
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          // Performance optimizations
          priority={props.priority}
          quality={props.quality || 85}
          placeholder={props.placeholder || 'blur'}
          blurDataURL={props.blurDataURL || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImageComponent.displayName = 'OptimizedImage';

export const OptimizedImage = memo(OptimizedImageComponent);

// Avatar component with optimized image loading
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackInitials?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-lg',
};

export const OptimizedAvatar = memo(({ 
  src, 
  alt, 
  size = 'md', 
  fallbackInitials,
  className 
}: OptimizedAvatarProps) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (!src || hasError) {
    return (
      <div 
        className={cn(
          'rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600',
          sizeClasses[size],
          className
        )}
      >
        {fallbackInitials || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 96}
      height={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 96}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      onError={handleError}
      showLoadingSpinner={false}
      errorClassName="rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600"
    />
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

// Icon component with lazy loading
interface OptimizedIconProps {
  name: string;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}

export const OptimizedIcon = memo(({ 
  name, 
  size = 24, 
  className,
  fallback 
}: OptimizedIconProps) => {
  const [IconComponent, setIconComponent] = useState<React.ComponentType<any> | null>(null);
  const [hasError, setHasError] = useState(false);

  useState(() => {
    // Dynamically import the icon
    import('lucide-react')
      .then((icons) => {
        const Icon = (icons as any)[name];
        if (Icon) {
          setIconComponent(() => Icon);
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        setHasError(true);
      });
  });

  if (hasError || !IconComponent) {
    return fallback || <div className={cn('w-6 h-6 bg-gray-200 rounded', className)} />;
  }

  return <IconComponent size={size} className={className} />;
});

OptimizedIcon.displayName = 'OptimizedIcon';
