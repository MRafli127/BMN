// ============================================================
//  Indikator memuat (loading spinner).
// ============================================================

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  teks?: string;
  layarPenuh?: boolean;
  className?: string;
}

export function LoadingSpinner({ teks = 'Memuat...', layarPenuh = false, className }: Props) {
  const konten = (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-muted-foreground', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {teks && <p className="text-sm">{teks}</p>}
    </div>
  );

  if (layarPenuh) {
    return <div className="flex min-h-[60vh] w-full items-center justify-center">{konten}</div>;
  }
  return <div className="py-10">{konten}</div>;
}
