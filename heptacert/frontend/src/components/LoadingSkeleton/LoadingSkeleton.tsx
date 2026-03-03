'use client';

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  width?: string;
  rounded?: boolean;
  className?: string;
}

export function LoadingSkeleton({
  count = 1,
  height = 'h-6',
  width = 'w-full',
  rounded = true,
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label="Loading content"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`
            animate-pulse bg-gray-200 dark:bg-gray-700
            ${rounded ? 'rounded-lg' : ''}
            ${height} ${width} ${className}
          `}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function TableLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {/* Header skeleton */}
      <LoadingSkeleton height="h-10" rounded className="mb-4" />
      
      {/* Row skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <LoadingSkeleton key={i} height="h-12" />
      ))}
    </div>
  );
}

export function CardLoadingSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3"
          role="status"
          aria-label="Loading card"
          aria-live="polite"
        >
          <LoadingSkeleton height="h-4" width="w-1/3" />
          <LoadingSkeleton height="h-8" width="w-1/2" />
          <LoadingSkeleton height="h-3" width="w-2/3" />
        </div>
      ))}
    </div>
  );
}
