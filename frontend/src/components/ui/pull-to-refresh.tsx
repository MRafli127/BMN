// ============================================================
//  PullToRefresh — pull down to refresh untuk mobile.
//  Ergonomis dengan threshold 80px dan visual feedback.
//  Compatible dengan scrollable containers.
// ============================================================

'use client';

import { useRef, useState, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

interface PullToRefreshProps {
  children: ReactNode;
  /** Callback saat pull to refresh triggered */
  onRefresh: () => Promise<void>;
  /** Threshold distance untuk trigger refresh (px) */
  threshold?: number;
  /** Maksimum pull distance */
  maxPull?: number;
  /** Apakah refresh sedang berlangsung */
  disabled?: boolean;
  className?: string;
  /** Custom loading indicator */
  customLoader?: ReactNode;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
  className,
  customLoader,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const isPullActiveRef = useRef<boolean>(false);
  const isAtTopRef = useRef<boolean>(true);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Cek apakah di top of scroll
    const container = containerRef.current;
    if (container && container.scrollTop > 0) {
      isAtTopRef.current = false;
      return;
    }
    isAtTopRef.current = true;

    startYRef.current = e.touches[0].clientY;
    isPullActiveRef.current = true;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullActiveRef.current || disabled || isRefreshing) return;
    if (!isAtTopRef.current) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - startYRef.current;

    // Hanya pull ke bawah (delta > 0)
    if (delta > 0) {
      // Batasi pull distance
      const clampedDistance = Math.min(delta * 0.5, maxPull);
      setPullDistance(clampedDistance);

      // Prevent default scroll saat pulling
      if (delta > 10) {
        e.preventDefault();
      }
    }
  }, [disabled, isRefreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullActiveRef.current) return;
    isPullActiveRef.current = false;
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } finally {
        // Reset state
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  // Calculate pull percentage for animation
  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotation = pullProgress * 360;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-y-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-all',
          'text-primary',
          isRefreshing ? 'h-12' : pullDistance > 0 ? 'h-10' : 'h-0'
        )}
        style={{
          transform: `translateY(${isRefreshing ? 0 : -pullDistance / 2}px)`,
        }}
      >
        {customLoader ? (
          customLoader
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            {isRefreshing ? (
              <>
                <Icon
                  name="progress_activity"
                  className="animate-spin"
                  style={{ fontSize: 18 }}
                />
                <span className="text-[10px] font-medium">Memuat...</span>
              </>
            ) : (
              <>
                <Icon
                  name="expand_more"
                  className="transition-transform duration-150"
                  style={{
                    fontSize: 18,
                    transform: `rotate(${rotation}deg)`,
                    opacity: pullProgress,
                  }}
                />
                {pullProgress > 0.5 && (
                  <span className="text-[9px] font-medium opacity-60">
                    {pullProgress >= 1 ? 'Lepas' : 'Tarik'}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className="relative"
        style={{
          transform: `translateY(${isRefreshing ? '64px' : `${pullDistance}px`})`,
          transition: isRefreshing
            ? 'transform 0.3s ease-out'
            : isPulling
              ? 'none'
              : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================
//  RefreshTrigger — untuk use dengan hooks (non-wrapper style)
// ============================================================
interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  isPulling: boolean;
  pullProgress: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  indicator: ReactNode;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef<number>(0);
  const isPullActiveRef = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    isPullActiveRef.current = true;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullActiveRef.current) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - startYRef.current;

    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, threshold * 1.5));
      if (delta > 10) {
        e.preventDefault();
      }
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullActiveRef.current) return;
    isPullActiveRef.current = false;
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  const indicator = (
    <div
      className={cn(
        'flex items-center justify-center transition-all',
        isRefreshing ? 'h-16' : pullDistance > 0 ? 'h-12' : 'h-0'
      )}
    >
      {isRefreshing ? (
        <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 24 }} />
      ) : (
        <Icon
          name="expand_more"
          style={{
            fontSize: 24,
            transform: `rotate(${pullProgress * 360}deg)`,
            opacity: pullProgress,
          }}
        />
      )}
    </div>
  );

  return {
    isRefreshing,
    isPulling,
    pullProgress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    indicator,
  };
}
