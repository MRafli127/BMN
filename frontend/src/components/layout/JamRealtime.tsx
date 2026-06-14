// ============================================================
//  Jam berjalan realtime (diperbarui tiap detik).
//  Format: "Sabtu, 13 Juni 2026, 14:30:05 WIB"
// ============================================================

'use client';

import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useJamRealtime } from '@/hooks/useJamRealtime';
import { cn } from '@/lib/utils';

export function JamRealtime({ className }: { className?: string }) {
  const waktu = useJamRealtime();

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Clock className="h-4 w-4 text-primary" />
      {waktu ? (
        <span className="font-medium tabular-nums">
          {format(waktu, 'EEEE, dd MMMM yyyy', { locale: id })}
          <span className="mx-1 text-primary">•</span>
          {format(waktu, 'HH:mm:ss', { locale: id })} WIB
        </span>
      ) : (
        // Placeholder agar tidak terjadi mismatch hidrasi
        <span className="font-medium text-muted-foreground/50">Memuat waktu...</span>
      )}
    </div>
  );
}
