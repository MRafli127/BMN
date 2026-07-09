// ============================================================
//  SwipeableRow — swipe actions untuk mobile.
//  Compact design dengan touch targets 44px.
// ============================================================

'use client';

import { useRef, useState, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

interface SwipeAction {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'primary';
  className?: string;
}

interface SwipeableRowProps {
  children: ReactNode;
  actions?: SwipeAction[];
  actionWidth?: number;
  disabled?: boolean;
  onSwipeOpen?: () => void;
  onSwipeClose?: () => void;
  className?: string;
  threshold?: number;
}

export function SwipeableRow({
  children,
  actions = [],
  actionWidth = 56,
  disabled = false,
  onSwipeOpen,
  onSwipeClose,
  className,
  threshold = 50,
}: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);

  const startXRef = useRef<number>(0);
  const isSwipeActiveRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalActionWidth = actions.length * actionWidth;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    isSwipeActiveRef.current = true;
    setIsSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwipeActiveRef.current || disabled) return;

    const currentX = e.touches[0].clientX;
    const delta = startXRef.current - currentX;

    if (delta > 0) {
      const clampedTranslate = Math.min(delta, totalActionWidth + 20);
      setTranslateX(clampedTranslate);
    }
  }, [disabled, totalActionWidth]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwipeActiveRef.current) return;
    isSwipeActiveRef.current = false;
    setIsSwiping(false);

    if (translateX >= threshold) {
      setTranslateX(totalActionWidth);
      setIsActionOpen(true);
      onSwipeOpen?.();
    } else {
      setTranslateX(0);
      setIsActionOpen(false);
      onSwipeClose?.();
    }
  }, [translateX, threshold, totalActionWidth, onSwipeOpen, onSwipeClose]);

  const handleActionClick = useCallback((action: SwipeAction) => {
    action.onClick();
    setTranslateX(0);
    setIsActionOpen(false);
  }, []);

  const closeSwipe = useCallback(() => {
    setTranslateX(0);
    setIsActionOpen(false);
    onSwipeClose?.();
  }, [onSwipeClose]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (isActionOpen && !containerRef.current?.contains(e.target as Node)) {
      closeSwipe();
    }
  }, [isActionOpen, closeSwipe]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Actions Background */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: totalActionWidth }}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleActionClick(action)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 transition-all active:scale-95',
              'min-h-[40px]',
              action.variant === 'destructive'
                ? 'bg-error text-white'
                : action.variant === 'primary'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700',
              action.className
            )}
            style={{ width: actionWidth }}
          >
            <Icon name={action.icon} style={{ fontSize: 14 }} />
            <span className="text-[8px] font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Swipeable Content */}
      <div
        className={cn(
          'relative z-10 bg-white transition-transform',
          isSwiping ? 'transition-none' : 'transition-transform duration-200 ease-out',
          disabled && 'opacity-50'
        )}
        style={{ transform: `translateX(-${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        tabIndex={disabled ? -1 : 0}
        role="button"
      >
        {children}
      </div>

      {/* Overlay untuk menutup swipe saat klik di luar */}
      {isActionOpen && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={handleContainerClick}
        />
      )}
    </div>
  );
}

// ============================================================
//  SwipeableList — wrapper untuk list dengan swipe items
// ============================================================
interface SwipeableListProps {
  children: ReactNode;
  className?: string;
}

export function SwipeableList({ children, className }: SwipeableListProps) {
  return (
    <div className={cn('flex flex-col', className)} role="list">
      {children}
    </div>
  );
}
