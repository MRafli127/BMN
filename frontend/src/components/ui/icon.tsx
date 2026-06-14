// ============================================================
//  Ikon Material Symbols Outlined.
//  Pemakaian: <Icon name="dashboard" /> atau <Icon name="check" fill />
// ============================================================

import { cn } from '@/lib/utils';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Nama ikon Material Symbols (mis. "dashboard", "inventory_2") */
  name: string;
  /** Isi penuh (varian FILL 1) */
  fill?: boolean;
}

export function Icon({ name, fill = false, className, ...props }: IconProps) {
  return (
    <span
      aria-hidden
      className={cn('material-symbols-outlined', fill && 'fill', className)}
      {...props}
    >
      {name}
    </span>
  );
}
