// ============================================================
//  Komponen Input kata sandi dengan toggle visibility.
// ============================================================

'use client';

import * as React from 'react';
import { Input, type InputProps } from './input';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

export type PasswordInputProps = Omit<InputProps, 'type'>;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false);

    return (
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          className={cn('pe-10', className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          tabIndex={-1}
        >
          <Icon name={show ? 'visibility_off' : 'visibility'} className="!text-xl" />
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
