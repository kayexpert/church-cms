/**
 * Performance optimization utilities for the Church CMS
 * Provides reusable functions for improving React component performance
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Debounce hook for optimizing expensive operations
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 * @param deps Dependencies array
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Throttle hook for limiting function execution frequency
 * @param callback Function to throttle
 * @param delay Delay in milliseconds
 * @param deps Dependencies array
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastExecuted.current >= delay) {
        lastExecuted.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastExecuted.current = Date.now();
          callback(...args);
        }, delay - (now - lastExecuted.current));
      }
    },
    [callback, delay, ...deps]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Memoized stable callback hook
 * Prevents unnecessary re-renders by providing a stable callback reference
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Intersection Observer hook for lazy loading and visibility detection
 * @param options Intersection Observer options
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  const isIntersecting = useRef(false);
  const callbacks = useRef<Set<(isIntersecting: boolean) => void>>(new Set());

  const observe = useCallback((callback: (isIntersecting: boolean) => void) => {
    callbacks.current.add(callback);

    if (!observerRef.current && elementRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isIntersecting.current = entry.isIntersecting;
          callbacks.current.forEach(cb => cb(entry.isIntersecting));
        },
        options
      );

      observerRef.current.observe(elementRef.current);
    }

    // Return cleanup function
    return () => {
      callbacks.current.delete(callback);
      if (callbacks.current.size === 0 && observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = undefined;
      }
    };
  }, [options]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { elementRef, observe, isIntersecting: isIntersecting.current };
}

/**
 * Optimized list rendering hook for large datasets
 * Implements virtual scrolling concepts
 */
export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.start + index) * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    containerProps: {
      style: { height: containerHeight, overflow: 'auto' },
      onScroll: handleScroll,
    },
  };
}

/**
 * Error boundary hook for better error handling
 */
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    console.error('Error captured by error boundary:', error);
    setError(error);
  }, []);

  useEffect(() => {
    if (error) {
      // Log error to monitoring service
      console.error('Component error:', error);
    }
  }, [error]);

  return { error, resetError, captureError };
}

/**
 * Performance monitoring hook
 * Measures component render times and performance metrics
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>();
  const renderCount = useRef(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;

      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`);

        // Warn about slow renders
        if (renderTime > 16) {
          console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }
    }
  });

  return { renderCount: renderCount.current };
}
