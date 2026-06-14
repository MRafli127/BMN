// ============================================================
//  Jam berjalan realtime (diperbarui tiap detik).
//  Format: "Sabtu, 13 Juni 2026, 14:30:05 WIB"
// ============================================================

'use client';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Icon } from '@/components/ui/icon';
import { useJamRealtime } from '@/hooks/useJamRealtime';
import { cn } from '@/lib/utils';

export function JamRealtime({ className }: { className?: string }) {
  const waktu = useJamRealtime();

  return (
    <div className={cn('flex items-center gap-2 font-jakarta text-sm font-bold text-primary', className)}>
      <Icon name="schedule" className="text-[20px]" />
      {waktu ? (
        <span className="tabular-nums">
          {format(waktu, 'EEEE, dd MMMM yyyy', { locale: id })}
          <span className="mx-1 text-secondary">•</span>
          {format(waktu, 'HH:mm:ss', { locale: id })} WIB
        </span>
      ) : (
        // Placeholder agar tidak terjadi mismatch hidrasi
        <span className="text-primary/40">Memuat waktu...</span>
      )}
    </div>
  );
}
