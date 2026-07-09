// ============================================================
//  Responsive Table — Tabel yang berubah jadi Card View di mobile.
//  Desktop: Tabel normal.
//  Mobile (< md): Card untuk setiap row.
// ============================================================

'use client';

import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

// ============================================================
//  Responsive Table Container
// ============================================================
interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  /** Container className untuk wrapper scroll */
  containerClassName?: string;
}

export function ResponsiveTable({ children, className, containerClassName }: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: Stack cards vertically
    return <div className={cn('flex flex-col gap-3', containerClassName)}>{children}</div>;
  }

  // Desktop: Normal table wrapper with scroll
  return (
    <div className={cn('relative w-full overflow-auto', containerClassName)}>
      <table className={cn('w-full caption-bottom text-sm', className)}>{children}</table>
    </div>
  );
}

// ============================================================
//  Table Header — hanya visible di desktop
// ============================================================
interface ResponsiveTableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTableHead({ children, className }: ResponsiveTableHeadProps) {
  const isMobile = useIsMobile();

  if (isMobile) return null; // Hide table header on mobile

  return (
    <thead className={cn('[&_tr]:border-b bg-muted/50', className)}>
      {children}
    </thead>
  );
}

interface ResponsiveTableRowHeadProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTableRowHead({ children, className }: ResponsiveTableRowHeadProps) {
  const isMobile = useIsMobile();
  if (isMobile) return null;

  return <tr className={cn('border-b transition-all hover:bg-primary/[0.04]', className)}>{children}</tr>;
}

interface ResponsiveTableCellHeadProps {
  children: React.ReactNode;
  className?: string;
  /** Hide on mobile */
  hideOnMobile?: boolean;
}

export function ResponsiveTableCellHead({ children, className, hideOnMobile }: ResponsiveTableCellHeadProps) {
  const isMobile = useIsMobile();
  if (isMobile) return null;

  return (
    <th className={cn('h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}>
      {children}
    </th>
  );
}

// ============================================================
//  Table Body — berbeda di mobile vs desktop
// ============================================================
interface ResponsiveTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTableBody({ children, className }: ResponsiveTableBodyProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: div wrapper
    return <div className={cn('flex flex-col gap-3', className)}>{children}</div>;
  }

  // Desktop: tbody
  return <tbody className={cn('[&_tr:last-child]:border-0', className)}>{children}</tbody>;
}

// ============================================================
//  Table Row — wrapper yang berbeda di mobile vs desktop
// ============================================================
interface ResponsiveTableRowProps {
  children: React.ReactNode;
  className?: string;
  /** Additional click handler */
  onClick?: () => void;
}

export function ResponsiveTableRow({ children, className, onClick }: ResponsiveTableRowProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-card p-4 shadow-sm transition-all',
          'hover:shadow-md active:scale-[0.99]',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <tr
      className={cn(
        'border-b transition-all hover:bg-primary/[0.04] hover:shadow-[inset_3px_0_0_hsl(222,100%,28%)]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// ============================================================
//  Table Cell — berbeda di mobile vs desktop
// ============================================================
interface ResponsiveTableCellProps {
  children: React.ReactNode;
  className?: string;
  /** Label untuk mobile card view */
  label?: string;
  /** Hide on mobile */
  hideOnMobile?: boolean;
  /** For desktop td/th */
  as?: 'td' | 'th';
}

export function ResponsiveTableCell({
  children,
  className,
  label,
  hideOnMobile,
  as = 'td'
}: ResponsiveTableCellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    if (hideOnMobile) return null;

    // Mobile: Show as label-value pair or just content
    if (label) {
      return (
        <div className={cn('flex justify-between gap-2', className)}>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="text-right font-medium text-foreground">{children}</span>
        </div>
      );
    }

    return <div className={cn(className)}>{children}</div>;
  }

  // Desktop: normal td/th
  const Component = as;
  return <Component className={cn('px-4 py-3 align-middle', className)}>{children}</Component>;
}

// ============================================================
//  Mobile Card Components
// ============================================================
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  /** For card header/title */
  title?: React.ReactNode;
  /** Subtitle */
  subtitle?: React.ReactNode;
  /** Badge/status */
  badge?: React.ReactNode;
  /** Actions (buttons) */
  actions?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
}

export function MobileCard({ children, className, title, subtitle, badge, actions, onClick }: MobileCardProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    // On desktop, render children as normal (or wrap in div)
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm',
        onClick && 'cursor-pointer transition-all hover:shadow-md active:scale-[0.99]',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      {(title || subtitle || badge) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {title && <h3 className="font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}

      {/* Content */}
      <div className="space-y-1.5">{children}</div>

      {/* Actions */}
      {actions && (
        <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">{actions}</div>
      )}
    </div>
  );
}

// ============================================================
//  Mobile Detail Row — detail row dalam mobile card
// ============================================================
interface MobileDetailRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileDetailRow({ label, children, className }: MobileDetailRowProps) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  return (
    <div className={cn('flex justify-between gap-2 text-sm', className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

// ============================================================
//  Simple Responsive Grid — untuk mobile cards yang perlu grid
// ============================================================
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  /** Columns for desktop */
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Gap */
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6',
};

export function ResponsiveGrid({ children, className, cols = 3, gap = 'md' }: ResponsiveGridProps) {
  return (
    <div className={cn('grid', colClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
}

// ============================================================
//  Responsive Stack — untuk vertical stacking
// ============================================================
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  /** Direction */
  direction?: 'row' | 'col';
  /** Gap size */
  gap?: 'sm' | 'md' | 'lg';
  /** Responsive: stack vertically on mobile */
  stackOnMobile?: boolean;
}

const directionClasses = {
  row: 'flex-row',
  col: 'flex-col',
};

export function ResponsiveStack({
  children,
  className,
  direction = 'col',
  gap = 'md',
  stackOnMobile = true,
}: ResponsiveStackProps) {
  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        gapClasses[gap],
        stackOnMobile && 'flex-col sm:flex-row',
        className
      )}
    >
      {children}
    </div>
  );
}
