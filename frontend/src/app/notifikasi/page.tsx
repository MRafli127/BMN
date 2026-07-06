// ============================================================
//  Halaman Notifikasi — menampilkan semua notifikasi user
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { useNotificationStore } from '@/store/notificationStore';
import { IKON_NOTIFIKASI, TIPE_NOTIFIKASI } from '@/types/notification.type';
import { jarakWaktu } from '@/lib/utils';
import { ambilUser } from '@/lib/auth';

export default function NotifikasiPage() {
  const router = useRouter();
  const store = useNotificationStore();
  const notifikasi = store.notifikasi ?? [];
  const jumlahBelumBaca = store.jumlahBelumBaca ?? 0;
  const sedangMemuat = store.sedangMemuat ?? false;
  const muatNotifikasi = store.muatNotifikasi;
  const tandaiSudahBaca = store.tandaiSudahBaca;
  const tandaiSemuaSudahBaca = store.tandaiSemuaSudahBaca;
  const hapusNotifikasi = store.hapusNotifikasi;
  const init = store.init;

  const [halaman, setHalaman] = useState(1);
  const [totalHalaman, setTotalHalaman] = useState(1);
  const [memuatLagi, setMemuatLagi] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const muat = async () => {
      await muatNotifikasi();
      setHalaman(1);
    };
    muat();
  }, [muatNotifikasi]);

  const handleLoadMore = async () => {
    setMemuatLagi(true);
    setHalaman((prev) => prev + 1);
    // Load more would be implemented here with pagination
    setMemuatLagi(false);
  };

  // Navigasi ke halaman terkait saat notifikasi diklik
  const handleKlikNotifikasi = async (notif: typeof notifikasi[0]) => {
    console.log('[Notifikasi] Diklik:', notif.tipe, notif.referenceId, notif.referenceType);

    // Tandai sudah dibaca
    if (!notif.isBaca) {
      tandaiSudahBaca(notif.id);
    }

    // Cek role user
    const user = ambilUser();
    const isAdmin = user?.role === 'ADMIN';

    // Navigasi berdasarkan tipe dan reference
    if (notif.referenceId && notif.referenceType === 'PEMINJAMAN') {
      const path = isAdmin ? `/admin/peminjaman/${notif.referenceId}` : `/peminjam/riwayat/${notif.referenceId}`;
      console.log('[Notifikasi] Navigasi ke:', path);
      router.push(path);
    } else if (notif.referenceType === 'PENSIUN') {
      const path = isAdmin ? '/admin/peminjaman' : '/peminjam/riwayat';
      console.log('[Notifikasi] Navigasi ke:', path);
      router.push(path);
    } else {
      console.log('[Notifikasi] Tidak ada navigasi untuk tipe ini');
    }
  };

  const getJudulTipe = (tipe: string) => {
    const judul: Record<string, string> = {
      [TIPE_NOTIFIKASI.PEMINJAMAN_BARU]: 'Pengajuan Baru',
      [TIPE_NOTIFIKASI.PEMINJAMAN_DISETUJUI]: 'Pengajuan Disetujui',
      [TIPE_NOTIFIKASI.PEMINJAMAN_DITOLAK]: 'Pengajuan Ditolak',
      [TIPE_NOTIFIKASI.PENGEMBALIAN]: 'Pengembalian',
      [TIPE_NOTIFIKASI.TERLAMBAT]: 'Terlambat',
      [TIPE_NOTIFIKASI.KERUSAKAN]: 'Kerusakan',
      [TIPE_NOTIFIKASI.KEHILANGAN]: 'Kehilangan',
      [TIPE_NOTIFIKASI.EXPORT_SELESAI]: 'Export Selesai',
      [TIPE_NOTIFIKASI.IMPORT_SELESAI]: 'Import Selesai',
      [TIPE_NOTIFIKASI.SISTEM]: 'Sistem',
      [TIPE_NOTIFIKASI.PENSIUN_MENDEKATI]: 'Pensiun Mendekati',
    };
    return judul[tipe] || 'Notifikasi';
  };

  const getWarnaPrioritas = (prioritas: string) => {
    switch (prioritas) {
      case 'TINGGI':
        return 'text-error';
      case 'SEDANG':
        return 'text-warning';
      default:
        return 'text-on-surface-variant';
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Notifikasi</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {jumlahBelumBaca > 0
              ? `${jumlahBelumBaca} notifikasi belum dibaca`
              : 'Semua notifikasi sudah dibaca'}
          </p>
        </div>
        {jumlahBelumBaca > 0 && (
          <button
            onClick={() => tandaiSemuaSudahBaca()}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {/* Loading State */}
      {sedangMemuat && notifikasi.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      ) : !notifikasi || notifikasi.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low py-16">
          <Icon name="notifications_off" className="text-5xl text-on-surface-variant/50" />
          <h3 className="mt-4 text-lg font-semibold text-on-surface">Tidak ada notifikasi</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Notifikasi akan muncul di sini saat ada aktivitas terbaru.
          </p>
        </div>
      ) : (
        /* Notification List */
        <div className="space-y-3">
          {notifikasi.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleKlikNotifikasi(notif)}
              className={`group relative cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
                !notif.isBaca
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-outline-variant/60 bg-white'
              }`}
            >
              <div className="flex gap-4">
                {/* Indikator */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${!notif.isBaca ? 'bg-primary/10' : 'bg-surface-container-high'}`}
                  >
                    <Icon
                      name={IKON_NOTIFIKASI[notif.tipe] || 'info'}
                      className={getWarnaPrioritas(notif.prioritas)}
                      style={{ fontSize: '20px' }}
                    />
                  </div>
                  {!notif.isBaca && (
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>

                {/* Konten */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`text-base font-semibold ${!notif.isBaca ? 'text-on-surface' : 'text-on-surface'}`}>
                        {notif.judul}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-primary">
                        {getJudulTipe(notif.tipe)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-on-surface-variant">
                      {jarakWaktu(notif.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-on-surface-variant">
                    {notif.pesan}
                  </p>

                  {/* Aksi - stop propagation agar tidak trigger navigasi */}
                  <div className="mt-3 flex items-center gap-2">
                    {!notif.isBaca && (
                      <button
                        onClick={(e) => { e.stopPropagation(); tandaiSudahBaca(notif.id); }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); hapusNotifikasi(notif.id); }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Load More */}
          {halaman < totalHalaman && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={memuatLagi}
                className="rounded-lg border border-outline-variant px-6 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
              >
                {memuatLagi ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
