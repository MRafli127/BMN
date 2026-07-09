// ============================================================
//  Sheet Component — drawer/slide-over untuk mobile.
//  Full-screen di mobile, side drawer di desktop.
// ============================================================

'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

// Sheet Overlay
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Sheet Content - Responsive: full screen di mobile, side drawer di desktop
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'top' | 'bottom' | 'left' | 'right';
  }
>(({ className, children, side = 'left', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 gap-4 bg-white shadow-2xl transition ease-in-out',
        // Mobile: full screen dari bawah
        'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        // Desktop: side drawer
        'hidden md:block md:inset-y-0',
        side === 'left' && 'md:left-0 md:top-0 md:w-80 md:max-w-full',
        side === 'right' && 'md:right-0 md:top-0 md:w-80 md:max-w-full',
        side === 'top' && 'md:inset-x-0 md:top-0 md:h-auto',
        side === 'bottom' && 'md:inset-x-0 md:bottom-0 md:h-auto',
        // Mobile-specific positioning
        side === 'left' && 'left-0',
        side === 'right' && 'right-0',
        side === 'top' && 'top-0',
        side === 'bottom' && 'bottom-0',
        className
      )}
      {...props}
    >
      {/* Mobile handle */}
      <div className="mx-auto mt-3 h-1 w-10 flex-shrink-0 rounded-full bg-outline-variant md:hidden" />

      {/* Close button - top right for desktop, swipe down hint for mobile */}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:pointer-events-none md:top-4">
        <Icon name="close" className="h-5 w-5" />
        <span className="sr-only">Tutup</span>
      </DialogPrimitive.Close>

      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

// Sheet Header
const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col gap-1.5 p-4 pb-0', className)}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

// Sheet Footer
const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end',
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

// Sheet Title
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-on-surface', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

// Sheet Description
const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-on-surface-variant', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

// Sheet Close
const SheetClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    className={cn(
      'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
      'hover:bg-surface-container-high',
      'focus:outline-none focus:ring-2 focus:ring-primary/20',
      className
    )}
    {...props}
  />
));
SheetClose.displayName = DialogPrimitive.Close.displayName;

// Sheet Trigger
const SheetTrigger = DialogPrimitive.Trigger;

// Main Sheet component
const Sheet = DialogPrimitive.Root;
const SheetPortal = DialogPrimitive.Portal;
const SheetCloseTrigger = DialogPrimitive.Close;

// Sheet scroller for content
const SheetScroller = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto p-4', className)}
    {...props}
  />
));
SheetScroller.displayName = 'SheetScroller';

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetCloseTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetScroller,
};
