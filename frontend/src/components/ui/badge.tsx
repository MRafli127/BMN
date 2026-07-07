// ============================================================
//  Komponen Badge — label status berwarna.
// ============================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// Kelas warna dikirim lewat className (mis. dari konstanta status)
export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:scale-105',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
