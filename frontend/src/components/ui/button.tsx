// ============================================================
//  Komponen Button (gaya shadcn/ui) — dengan efek riak (ripple)
//  dari titik klik dan hover terangkat halus di semua varian.
// ============================================================

'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { buatRipple } from '@/lib/ripple';

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-brand [--ripple-c:rgba(255,255,255,0.28)]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-card [--ripple-c:rgba(255,255,255,0.28)]',
        outline:
          'border border-input bg-background shadow-soft hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:text-accent-foreground hover:shadow-card [--ripple-c:rgba(0,40,142,0.08)]',
        secondary:
          'bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/90 hover:shadow-card [--ripple-c:rgba(255,255,255,0.28)]',
        ghost: 'hover:bg-accent hover:text-accent-foreground [--ripple-c:rgba(0,40,142,0.08)]',
        link: 'text-primary underline-offset-4 hover:underline',
        sukses:
          'bg-hijau-600 text-white shadow-soft hover:-translate-y-0.5 hover:bg-hijau-700 hover:shadow-card [--ripple-c:rgba(255,255,255,0.28)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    // Riak menyebar dari titik klik (kecuali varian link — tanpa riak),
    // lalu handler asli tetap dijalankan.
    const tanganiKlik = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant !== 'link') buatRipple(e);
      onClick?.(e);
    };
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={tanganiKlik}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
