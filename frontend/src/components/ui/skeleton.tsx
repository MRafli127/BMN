// ============================================================
//  Skeleton Components — placeholder untuk loading states.
//  Consistent dengan desain sistem BMN dengan shimmer animation.
//  Mobile-optimized dengan touch-friendly placeholder sizes.
// ============================================================

'use client';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

// Shimmer animation keyframes
const shimmerClass = `
  bg-gradient-to-r from-muted via-muted/70 to-muted
  bg-[length:200%_100%]
  animate-[shimmer_1.5s_infinite]
`;

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant shape */
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'line';
  /** Width */
  width?: string | number;
  /** Height */
  height?: string | number;
  /** Custom animation class */
  animation?: 'shimmer' | 'pulse' | 'wave';
}

function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'shimmer',
  style,
  ...props
}: SkeletonProps) {
  const animationClass = animation === 'shimmer' ? shimmerClass : animation === 'wave' ? 'animate-pulse' : 'animate-pulse';

  return (
    <div
      className={cn(
        'bg-muted',
        animationClass,
        {
          'h-4 w-full rounded': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-xl': variant === 'card',
          'h-2 rounded-full': variant === 'line',
        },
        className
      )}
      style={{
        width: width ?? (variant === 'circular' ? 40 : '100%'),
        height: height ?? (variant === 'text' ? 16 : variant === 'line' ? 8 : 40),
        ...style,
      }}
      {...props}
    />
  );
}

// ============================================================
//  Mobile Card Skeleton — untuk mobile list view
// ============================================================
interface SkeletonMobileCardProps {
  showImage?: boolean;
  lines?: number;
  className?: string;
}

function SkeletonMobileCard({ showImage = true, lines = 2, className }: SkeletonMobileCardProps) {
  return (
    <div className={cn('flex items-center gap-2 border-b border-gray-100 bg-white px-1 py-2.5', className)}>
      {showImage && (
        <Skeleton variant="rectangular" className="h-11 w-11 shrink-0 rounded-lg" />
      )}
      <div className="flex-1 space-y-1.5">
        <Skeleton variant="text" className="w-3/4" style={{ height: 12 }} />
        <Skeleton variant="text" className="w-1/2" style={{ height: 10 }} />
      </div>
    </div>
  );
}

// ============================================================
//  Mobile List Skeleton — untuk mobile list view
// ============================================================
interface SkeletonMobileListProps {
  count?: number;
  showImage?: boolean;
  lines?: number;
  className?: string;
}

function SkeletonMobileList({ count = 3, showImage = true, lines = 2, className }: SkeletonMobileListProps) {
  return (
    <div className={cn('-mx-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMobileCard key={i} showImage={showImage} lines={lines} />
      ))}
    </div>
  );
}

// ============================================================
//  Table Row Skeleton — untuk desktop table
// ============================================================
interface SkeletonTableRowProps {
  columns?: number;
  showImage?: boolean;
  className?: string;
}

function SkeletonTableRow({ columns = 5, showImage = true, className }: SkeletonTableRowProps) {
  return (
    <div className={cn('flex items-center gap-4 border-b border-border p-4', className)}>
      {showImage && (
        <Skeleton variant="rectangular" className="h-10 w-10 shrink-0 rounded-md" />
      )}
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" className="flex-1" />
      ))}
    </div>
  );
}

// ============================================================
//  Card Skeleton — untuk grid/card view
// ============================================================
interface SkeletonCardProps {
  variant?: 'default' | 'compact';
  className?: string;
}

function SkeletonCard({ variant = 'default', className }: SkeletonCardProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('rounded-xl border bg-card p-3', className)}>
        <Skeleton variant="rectangular" className="mb-2 h-20 w-full rounded-lg" />
        <Skeleton variant="text" className="mb-1 w-3/4" style={{ height: 14 }} />
        <Skeleton variant="text" className="w-1/2" style={{ height: 12 }} />
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      <Skeleton variant="rectangular" className="mb-3 h-32 w-full rounded-lg" />
      <Skeleton variant="text" className="mb-2 w-3/4" style={{ height: 18 }} />
      <Skeleton variant="text" className="mb-2 w-1/2" style={{ height: 14 }} />
      <div className="mt-3 flex gap-2">
        <Skeleton variant="rectangular" className="h-8 w-20 rounded-full" />
        <Skeleton variant="rectangular" className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

// ============================================================
//  List Item Skeleton — untuk list dengan avatar
// ============================================================
interface SkeletonListItemProps {
  showAvatar?: boolean;
  showAction?: boolean;
  className?: string;
}

function SkeletonListItem({ showAvatar = true, showAction = false, className }: SkeletonListItemProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      {showAvatar && (
        <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
      )}
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" style={{ height: 14 }} />
        <Skeleton variant="text" className="w-1/2" style={{ height: 12 }} />
      </div>
      {showAction && (
        <Skeleton variant="rectangular" className="h-8 w-16 rounded-lg" />
      )}
    </div>
  );
}

// ============================================================
//  Form Skeleton — untuk form loading
// ============================================================
interface SkeletonFormProps {
  fields?: number;
  showSubmit?: boolean;
  className?: string;
}

function SkeletonForm({ fields = 4, showSubmit = true, className }: SkeletonFormProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="w-24" style={{ height: 14 }} />
          <Skeleton variant="rectangular" className="h-11 w-full rounded-lg" />
        </div>
      ))}
      {showSubmit && (
        <Skeleton variant="rectangular" className="mt-6 h-12 w-full rounded-xl" />
      )}
    </div>
  );
}

// ============================================================
//  Stats Card Skeleton — untuk dashboard stats
// ============================================================
interface SkeletonStatCardProps {
  className?: string;
}

function SkeletonStatCard({ className }: SkeletonStatCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      <div className="mb-2 flex items-center gap-2">
        <Skeleton variant="circular" className="h-8 w-8" />
        <Skeleton variant="text" className="w-20" style={{ height: 14 }} />
      </div>
      <Skeleton variant="text" className="mb-1" style={{ height: 28, width: '60%' }} />
      <Skeleton variant="line" className="w-16" />
    </div>
  );
}

// ============================================================
//  Page Skeleton — untuk full page loading
// ============================================================
interface SkeletonPageProps {
  showHeader?: boolean;
  showStats?: boolean;
  statsCount?: number;
  showList?: boolean;
  listCount?: number;
  className?: string;
}

function SkeletonPage({
  showHeader = true,
  showStats = true,
  statsCount = 4,
  showList = true,
  listCount = 5,
  className,
}: SkeletonPageProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn('space-y-4 p-4', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton variant="text" className="w-32" style={{ height: 24 }} />
            <Skeleton variant="text" className="w-48" style={{ height: 14 }} />
          </div>
          <Skeleton variant="rectangular" className="h-10 w-24 rounded-lg" />
        </div>
      )}

      {/* Stats */}
      {showStats && (
        <div className={cn(
          'grid gap-3',
          isMobile ? 'grid-cols-2' : 'grid-cols-4'
        )}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      )}

      {/* List/Cards */}
      {showList && (
        <div className="space-y-3">
          <Skeleton variant="text" className="w-40" style={{ height: 18 }} />
          <SkeletonMobileList count={listCount} showImage={!isMobile} />
        </div>
      )}
    </div>
  );
}

// ============================================================
//  Folder Skeleton — untuk folder/grouped items
// ============================================================
interface SkeletonFolderProps {
  folderCount?: number;
  itemsPerFolder?: number;
  className?: string;
}

function SkeletonFolder({ folderCount = 3, itemsPerFolder = 3, className }: SkeletonFolderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: folderCount }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          {/* Folder header */}
          <div className="flex items-center gap-3 p-3 border-b">
            <Skeleton variant="rectangular" className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton variant="text" className="w-24" style={{ height: 14 }} />
              <Skeleton variant="text" className="w-32" style={{ height: 12 }} />
            </div>
            <Skeleton variant="rectangular" className="h-6 w-12 rounded-full" />
          </div>
          {/* Folder items */}
          <div className="p-3 space-y-2">
            {Array.from({ length: itemsPerFolder }).map((_, j) => (
              <SkeletonMobileCard key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
//  Inline Skeleton — untuk inline loading (buttons, etc)
// ============================================================
interface SkeletonInlineProps {
  width?: string | number;
  className?: string;
}

function SkeletonInline({ width = '60%', className }: SkeletonInlineProps) {
  return (
    <Skeleton
      variant="text"
      className={cn('inline-block align-middle', className)}
      style={{ height: 16, width }}
    />
  );
}

// ============================================================
//  Button Skeleton — untuk loading button state
// ============================================================
interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function SkeletonButton({ size = 'md', className }: SkeletonButtonProps) {
  const heights = { sm: 32, md: 40, lg: 48 };
  return (
    <Skeleton
      variant="rectangular"
      className={cn('rounded-lg', className)}
      style={{ height: heights[size], width: 100 }}
    />
  );
}

// Main export
export {
  Skeleton,
  SkeletonMobileCard,
  SkeletonMobileList,
  SkeletonTableRow,
  SkeletonCard,
  SkeletonListItem,
  SkeletonForm,
  SkeletonStatCard,
  SkeletonPage,
  SkeletonFolder,
  SkeletonInline,
  SkeletonButton,
};
