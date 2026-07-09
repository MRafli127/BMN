// ============================================================
//  NotificationDropdown — panel dropdown notifikasi
// ============================================================

'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { useNotificationStore } from '@/store/notificationStore';
import { IKON_NOTIFIKASI } from '@/types/notification.type';
import { jarakWaktu } from '@/lib/utils';
import { RUTE } from '@/constants/routes';

interface NotificationDropdownProps {
  terbuka: boolean;
  onTutup: () => void;
}

export function NotificationDropdown({ terbuka, onTutup }: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const store = useNotificationStore();
  const notifikasi = store.notifikasi ?? [];
  const jumlahBelumBaca = store.jumlahBelumBaca ?? 0;
  const sedangMemuat = store.sedangMemuat ?? false;
  const muatNotifikasi = store.muatNotifikasi;
  const tandaiSudahBaca = store.tandaiSudahBaca;
  const tandaiSemuaSudahBaca = store.tandaiSemuaSudahBaca;

  // Muat notifikasi saat dropdown dibuka
  useEffect(() => {
    if (terbuka) {
      muatNotifikasi();
    }
  }, [terbuka, muatNotifikasi]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    if (!terbuka) return;
    const tanganiKlikLuar = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onTutup();
      }
    };
    document.addEventListener('mousedown', tanganiKlikLuar);
    return () => document.removeEventListener('mousedown', tanganiKlikLuar);
  }, [terbuka, onTutup]);

  const handleKlikNotifikasi = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    await tandaiSudahBaca(id);
    // Notifikasi bisa diarahkan ke halaman terkait jika needed
  };

  if (!terbuka) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm origin-top-right animate-fade-up overflow-hidden rounded-2xl border border-outline-variant/60 bg-white shadow-xl sm:w-96"
      role="menu"
      aria-label="Notifikasi"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon name="notifications" className="text-on-surface-variant" />
          <h3 className="text-sm font-bold text-on-surface">Notifikasi</h3>
          {jumlahBelumBaca > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-xs font-bold text-white">
              {jumlahBelumBaca > 99 ? '99+' : jumlahBelumBaca}
            </span>
          )}
        </div>
        {jumlahBelumBaca > 0 && (
          <button
            onClick={() => tandaiSemuaSudahBaca()}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* Daftar notifikasi */}
      <div className="max-h-96 overflow-y-auto">
        {sedangMemuat ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !notifikasi || notifikasi.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
            <Icon name="notifications_off" className="mb-2 text-4xl opacity-50" />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          <ul className="p-1.5">
            {notifikasi.map((notif) => (
              <li key={notif.id}>
                <a
                  href="#"
                  onClick={(e) => handleKlikNotifikasi(notif.id, e)}
                  className={`group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-primary/5 ${
                    !notif.isBaca ? 'bg-primary/5' : ''
                  }`}
                  role="menuitem"
                >
                  {/* Indikator belum baca */}
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      !notif.isBaca ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  />

                  {/* Ikon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
                    <Icon
                      name={IKON_NOTIFIKASI[notif.tipe] || 'info'}
                      className="text-on-surface-variant"
                      style={{ fontSize: '18px' }}
                    />
                  </div>

                  {/* Konten */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!notif.isBaca ? 'font-semibold text-on-surface' : 'text-on-surface'}`}>
                        {notif.judul}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-2">
                      {notif.pesan}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant/70">
                      {jarakWaktu(notif.createdAt)}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-outline-variant/60 p-1.5">
        <Link
          href={RUTE.notifikasi}
          onClick={onTutup}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          role="menuitem"
        >
          <Icon name="open_in_new" style={{ fontSize: '16px' }} />
          Lihat Semua Notifikasi
        </Link>
      </div>
    </div>
  );
}