// ============================================================
//  BottomSheet — mobile-optimized bottom sheet component.
//  Swipe up/down untuk dismiss. Ergonomis dengan snap points.
//  Material Design-inspired dengan iOS smooth animations.
// ============================================================

'use client';

import { useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { useIsMobile } from '@/hooks/useIsMobile';

interface BottomSheetProps {
  /** Apakah sheet terbuka */
  isOpen: boolean;
  /** Callback untuk menutup */
  onClose: () => void;
  /** Konten sheet */
  children: ReactNode;
  /** Judul sheet */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Snap points: [partial, half, full] */
  snapPoints?: ('partial' | 'half' | 'full')[];
  /** Default snap point saat terbuka */
  defaultSnap?: 'partial' | 'half' | 'full';
  /** ClassName untuk content area */
  contentClassName?: string;
  /** Allow drag to dismiss */
  dragToDismiss?: boolean;
  /** Custom handle */
  customHandle?: ReactNode;
  /** Show backdrop */
  showBackdrop?: boolean;
  /** Backdrop click to close */
  backdropClickClose?: boolean;
}

const SNAP_HEIGHTS = {
  partial: 'auto', // Content height atau 30vh
  half: '50vh',
  full: '90vh',
} as const;

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  snapPoints = ['partial', 'half', 'full'],
  defaultSnap = 'partial',
  contentClassName,
  dragToDismiss = true,
  customHandle,
  showBackdrop = true,
  backdropClickClose = true,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [currentSnap, setCurrentSnap] = useState(defaultSnap);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isDragActiveRef = useRef<boolean>(false);
  const contentHeightRef = useRef<number>(0);

  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setTranslateY(0);
      });
    } else {
      setTranslateY(100);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Get content height for partial snap
  useEffect(() => {
    if (sheetRef.current) {
      contentHeightRef.current = sheetRef.current.scrollHeight;
    }
  }, [children, isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!dragToDismiss) return;
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
    isDragActiveRef.current = true;
    setIsDragging(true);
  }, [dragToDismiss]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragActiveRef.current || !dragToDismiss) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - startYRef.current;

    // Hanya izinkan drag ke bawah (delta > 0)
    if (delta > 0) {
      setTranslateY(delta);
      currentYRef.current = currentY;
    }
  }, [dragToDismiss]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragActiveRef.current) return;
    isDragActiveRef.current = false;
    setIsDragging(false);

    const velocity = currentYRef.current - startYRef.current;

    // Dismiss jika drag cukup jauh atau velocity tinggi
    if (translateY > 100 || velocity > 300) {
      onClose();
    } else {
      setTranslateY(0);
    }
  }, [translateY, onClose]);

  const handleBackdropClick = useCallback(() => {
    if (backdropClickClose) {
      onClose();
    }
  }, [backdropClickClose, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isVisible) return null;

  // Responsive: Jika bukan mobile, fallback ke centered modal
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;

  const sheetContent = (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end justify-center',
        showBackdrop && !isMobileDevice ? 'pointer-events-none' : ''
      )}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0',
            backdropClickClose && isMobileDevice ? 'cursor-pointer' : 'pointer-events-none'
          )}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'relative w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          isMobileDevice ? '' : 'mx-4 mb-4 max-w-md',
          'max-h-[90vh] flex flex-col'
        )}
        style={{
          transform: `translateY(${translateY}px)`,
          maxHeight: isMobileDevice ? '90vh' : 'calc(100vh - 32px)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Content */}
        <div className={cn('flex-1 overflow-y-auto px-4 pb-safe', contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}

// ============================================================
//  BottomSheetSection — section dalam bottom sheet
// ============================================================
interface BottomSheetSectionProps {
  children: ReactNode;
  className?: string;
}

export function BottomSheetSection({ children, className }: BottomSheetSectionProps) {
  return (
    <div className={cn('py-2', className)}>
      {children}
    </div>
  );
}

// ============================================================
//  BottomSheetAction — action button dalam sheet
// ============================================================
interface BottomSheetActionProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: string;
  iconPosition?: 'left' | 'right';
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  className?: string;
}

export function BottomSheetAction({
  children,
  onClick,
  icon,
  iconPosition = 'left',
  variant = 'default',
  disabled = false,
  className,
}: BottomSheetActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center px-4 py-3 text-[13px] transition-colors',
        variant === 'destructive'
          ? 'text-red-500'
          : 'text-blue-500',
        disabled && 'opacity-40',
        className
      )}
    >
      {icon && iconPosition === 'left' && (
        <Icon name={icon} className="mr-3" style={{ fontSize: 18 }} />
      )}
      <span className="flex-1">{children}</span>
      {icon && iconPosition === 'right' && (
        <Icon name={icon} className="ml-3" style={{ fontSize: 18 }} />
      )}
    </button>
  );
}

// ============================================================
//  BottomSheetDivider — divider dalam sheet
// ============================================================
interface BottomSheetDividerProps {
  className?: string;
}

export function BottomSheetDivider({ className }: BottomSheetDividerProps) {
  return (
    <div className={cn('h-px bg-gray-200', className)} />
  );
}

// ============================================================
//  BottomSheetFooter — footer dengan action buttons
// ============================================================
interface BottomSheetFooterProps {
  children: ReactNode;
  className?: string;
}

export function BottomSheetFooter({ children, className }: BottomSheetFooterProps) {
  return (
    <div className={cn(
      'sticky bottom-0 border-t border-gray-200 bg-white',
      'px-4 py-3 pb-safe',
      className
    )}>
      {children}
    </div>
  );
}

// ============================================================
//  ActionSheet — iOS-style action sheet
// ============================================================
interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    icon?: string;
    variant?: 'default' | 'destructive';
  }>;
  cancelLabel?: string;
}

export function ActionSheet({
  isOpen,
  onClose,
  title,
  message,
  actions,
  cancelLabel = 'Batal',
}: ActionSheetProps) {
  if (!isOpen) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showBackdrop={true}
      backdropClickClose={true}
    >
      <div className="rounded-xl bg-white">
        {/* Title & Message */}
        {(title || message) && (
          <div className="border-b border-gray-100 px-4 py-3 text-center">
            {title && (
              <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
            )}
            {message && (
              <p className="mt-1 text-[11px] text-gray-500">{message}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="py-1">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => { action.onClick(); onClose(); }}
              className={cn(
                'flex w-full items-center justify-center px-4 py-3 text-[13px]',
                action.variant === 'destructive' ? 'text-red-500 font-medium' : 'text-blue-500'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cancel */}
      <button
        onClick={onClose}
        className="mt-1 w-full rounded-xl bg-white py-3 text-[13px] font-medium text-blue-500"
      >
        {cancelLabel}
      </button>
    </BottomSheet>
  );
}

// ============================================================
//  ConfirmationSheet — konfirmasi bottom sheet
// ============================================================
interface ConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmationSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  confirmVariant = 'primary',
  isLoading = false,
}: ConfirmationSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showBackdrop={true}
      backdropClickClose={true}
      defaultSnap="partial"
    >
      <div className="px-4 py-2">
        <div className="text-center">
          <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-[11px] text-gray-500">{message}</p>
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'flex w-full items-center justify-center rounded-lg py-2.5 text-[13px] font-medium',
              'text-white transition-colors',
              confirmVariant === 'destructive'
                ? 'bg-red-500'
                : 'bg-blue-500',
              isLoading && 'opacity-70'
            )}
          >
            {isLoading ? 'Memuat...' : confirmLabel}
          </button>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full rounded-lg bg-gray-100 py-2.5 text-[13px] font-medium text-gray-900"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
