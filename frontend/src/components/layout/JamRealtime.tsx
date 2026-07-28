// ============================================================
//  Jam berjalan realtime (diperbarui tiap detik).
//  Ergonomis: format ringkas di tablet (md-lg), format lengkap di xl+.
// ============================================================

'use client';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Icon } from '@/components/ui/icon';
import { useJamRealtime } from '@/hooks/useJamRealtime';
import { useMinBreakpoint } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

export function JamRealtime({ className }: { className?: string }) {
  const waktu = useJamRealtime();
  const isXlOrUp = useMinBreakpoint('xl');

  return (
    <div className={cn('flex items-center gap-2 font-jakarta text-sm font-bold text-primary', className)}>
      <Icon name="schedule" className="text-[20px]" />
      {waktu ? (
        <span className="tabular-nums">
          {isXlOrUp ? (
            // Desktop xl+: format lengkap
            <>
              {format(waktu, 'EEEE, dd MMMM yyyy', { locale: id })}
              <span className="mx-1 text-secondary">•</span>
              {format(waktu, 'HH:mm:ss', { locale: id })} WIB
            </>
          ) : (
            // Tablet md-lg: format ringkas
            <>
              {format(waktu, 'EEE, dd MMM', { locale: id })}
              <span className="mx-1 text-secondary">•</span>
              {format(waktu, 'HH:mm', { locale: id })}
            </>
          )}
        </span>
      ) : (
        // Placeholder agar tidak terjadi mismatch hidrasi
        <span className="text-primary/40">Memuat waktu...</span>
      )}
    </div>
  );
}
