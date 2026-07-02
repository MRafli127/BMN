// ============================================================
//  Admin — Manajemen Peminjaman (daftar + filter status).
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Trash2, X, CheckCheck, List, FolderTree, PackageCheck, Undo2 } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { FolderPeminjaman } from '@/components/peminjaman/FolderPeminjaman';
import { ImportPeminjamDialog } from '@/components/peminjaman/ImportPeminjamDialog';
import { ExportModal } from '@/components/export/ExportModal';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { peminjamanService, type FilterPeminjaman } from '@/services/peminjaman.service';
import { useQuery } from '@/lib/cache';
import { ambilPesanError, cn } from '@/lib/utils';
import { OPSI_STATUS, FILTER_STATUS_AKTIF } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

// Pilihan jumlah baris yang ditampilkan per halaman
const OPSI_LIMIT = [12, 50, 100, 200];

export default function AdminPeminjamanPage() {
  const [filter, setFilter] = useState<FilterPeminjaman>({ page: 1, limit: 12 });
  const [cari, setCari] = useState('');
  const [mode, setMode] = useState<'list' | 'folder'>('list');
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [dialogMassal, setDialogMassal] = useState(false);
  const [sedangMassal, setSedangMassal] = useState(false);
  const [dialogSetujui, setDialogSetujui] = useState(false);
  const [sedangSetujui, setSedangSetujui] = useState(false);
  const [dialogSerahkan, setDialogSerahkan] = useState(false);
  const [sedangSerahkan, setSedangSerahkan] = useState(false);
  const [dialogKembalikan, setDialogKembalikan] = useState(false);
  const [sedangKembalikan, setSedangKembalikan] = useState(false);

  // Terapkan filter status dari query (?status=...) saat halaman dibuka — mis. ketika
  // datang dari kartu dashboard. Mendukung gabungan dipisah koma (Sedang Aktif).
  // Dibaca di useEffect agar render server & klien identik (aman dari hydration mismatch).
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status');
    if (status) setFilter((f) => ({ ...f, status: status as never, page: 1 }));
  }, []);

  const key = useMemo(() => `peminjaman:${JSON.stringify(filter)}`, [filter]);

  // muat (refetch) memaksa pemuatan ulang sambil tetap menampilkan data lama.
  const { data: hasil, sedangMemuat: memuat, refetch: muat } = useQuery<{ data: Peminjaman[]; meta: MetaPagination | null }>(
    key,
    () => peminjamanService.getSemua(filter),
    { tampilkanCache: true } // tampilkan data lama saat navigasi pagination
  );
  const data = hasil?.data ?? [];
  const meta = hasil?.meta ?? null;

  // Reset pilihan setiap kali data dimuat ulang
  useEffect(() => {
    setTerpilih([]);
  }, [hasil]);

  // Jumlah pengajuan berstatus MENUNGGU di antara yang dipilih (yang bisa di-ACC).
  const jumlahBisaSetujui = data.filter(
    (p) => terpilih.includes(p.id) && p.status === 'MENUNGGU'
  ).length;

  // Jumlah yang bisa ditandai diserahkan (DISETUJUI) & dikonfirmasi kembali (DIPINJAM/TERLAMBAT).
  const jumlahBisaSerahkan = data.filter(
    (p) => terpilih.includes(p.id) && p.status === 'DISETUJUI'
  ).length;
  const jumlahBisaKembalikan = data.filter(
    (p) => terpilih.includes(p.id) && (p.status === 'DIPINJAM' || p.status === 'TERLAMBAT')
  ).length;

  const hapus = async (id: string) => {
    try {
      await peminjamanService.hapus(id);
      notify.suksess('Data peminjaman berhasil dihapus.');
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus data peminjaman.'));
      throw error; // biar dialog tetap terbuka saat gagal
    }
  };

  const setujuiMassal = async () => {
    setSedangSetujui(true);
    try {
      const { disetujui, dilewati } = await peminjamanService.setujuiMassal(terpilih);
      if (disetujui > 0) {
        notify.suksess(
          dilewati > 0
            ? `${disetujui} pengajuan disetujui, ${dilewati} dilewati (stok kurang / bukan menunggu).`
            : `${disetujui} pengajuan berhasil disetujui.`
        );
      } else {
        notify.gagal('Tidak ada pengajuan yang dapat disetujui (stok kurang / bukan status menunggu).');
      }
      setDialogSetujui(false);
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menyetujui data terpilih.'));
    } finally {
      setSedangSetujui(false);
    }
  };

  const serahkanMassal = async () => {
    setSedangSerahkan(true);
    try {
      const { berhasil, dilewati } = await peminjamanService.serahkanMassal(terpilih);
      if (berhasil > 0) {
        notify.suksess(
          dilewati > 0
            ? `${berhasil} barang ditandai diserahkan, ${dilewati} dilewati (bukan status disetujui).`
            : `${berhasil} barang berhasil ditandai diserahkan.`
        );
      } else {
        notify.gagal('Tidak ada peminjaman yang dapat diserahkan (bukan status disetujui).');
      }
      setDialogSerahkan(false);
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menyerahkan barang terpilih.'));
    } finally {
      setSedangSerahkan(false);
    }
  };

  const kembalikanMassal = async () => {
    setSedangKembalikan(true);
    try {
      const { berhasil, dilewati } = await peminjamanService.kembalikanMassal(terpilih);
      if (berhasil > 0) {
        notify.suksess(
          dilewati > 0
            ? `${berhasil} pengembalian dikonfirmasi, ${dilewati} dilewati (tidak sedang dipinjam).`
            : `${berhasil} pengembalian berhasil dikonfirmasi.`
        );
      } else {
        notify.gagal('Tidak ada peminjaman yang dapat dikembalikan (tidak sedang dipinjam).');
      }
      setDialogKembalikan(false);
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengonfirmasi pengembalian terpilih.'));
    } finally {
      setSedangKembalikan(false);
    }
  };

  const hapusMassal = async () => {
    setSedangMassal(true);
    try {
      const jumlah = await peminjamanService.hapusMassal(terpilih);
      notify.suksess(`${jumlah} data peminjaman berhasil dihapus.`);
      setDialogMassal(false);
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus data terpilih.'));
    } finally {
      setSedangMassal(false);
    }
  };

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => setFilter((f) => ({ ...f, q: cari || undefined, page: 1 })), 400);
    return () => clearTimeout(timer);
  }, [cari]);

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-jakarta text-headline-lg text-primary">Manajemen Peminjaman</h1>
          <p className="text-on-surface-variant">Tinjau, setujui, atau tolak pengajuan peminjaman.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportModal />
          <ImportPeminjamDialog onSelesai={muat} />
        </div>
      </div>

      {/* Panel tabel */}
      <div className="glass-card overflow-hidden rounded-2xl border border-outline-variant">
        {/* Filter */}
        <div className="grid grid-cols-1 gap-3 border-b border-outline-variant p-stack-md sm:grid-cols-2">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama barang / merk / nama peminjam..." className="pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filter.status || ''}
              onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as never, page: 1 }))}
              className="flex-1"
            >
              <option value="">Semua Status</option>
              <option value={FILTER_STATUS_AKTIF}>Sedang Aktif</option>
              {OPSI_STATUS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            {/* Switch tampilan: list ↔ folder (folder dikelompokkan per peminjam) */}
            <button
              type="button"
              role="switch"
              aria-checked={mode === 'folder'}
              onClick={() => {
                setMode((m) => (m === 'list' ? 'folder' : 'list'));
                setTerpilih([]); // folder tak mendukung pilih massal
              }}
              title={mode === 'list' ? 'Beralih ke tampilan folder' : 'Beralih ke tampilan list'}
              className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-input bg-background px-3 transition-colors hover:bg-primary/5 sm:h-10"
            >
              <span className="whitespace-nowrap text-sm text-on-surface-variant">
                {mode === 'list' ? 'Tampilan list' : 'Tampilan folder'}
              </span>
              <span
                className={cn(
                  'relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  mode === 'folder' ? 'bg-primary' : 'bg-outline-variant'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform',
                    mode === 'folder' ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                >
                  {mode === 'folder' ? (
                    <FolderTree className="h-3 w-3 text-primary" />
                  ) : (
                    <List className="h-3 w-3 text-on-surface-variant" />
                  )}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Bilah aksi massal — muncul saat ada baris terpilih */}
        {!memuat && data.length > 0 && terpilih.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-primary/5 p-stack-md">
            <span className="text-sm font-medium text-on-surface">{terpilih.length} peminjaman dipilih</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setTerpilih([])}>
                <X className="h-4 w-4" /> Batal
              </Button>
              {jumlahBisaSetujui > 0 && (
                <Button variant="sukses" size="sm" onClick={() => setDialogSetujui(true)}>
                  <CheckCheck className="h-4 w-4" /> Setujui ({jumlahBisaSetujui})
                </Button>
              )}
              {jumlahBisaSerahkan > 0 && (
                <Button size="sm" onClick={() => setDialogSerahkan(true)}>
                  <PackageCheck className="h-4 w-4" /> Serahkan ({jumlahBisaSerahkan})
                </Button>
              )}
              {jumlahBisaKembalikan > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setDialogKembalikan(true)}>
                  <Undo2 className="h-4 w-4" /> Konfirmasi Pengembalian ({jumlahBisaKembalikan})
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => setDialogMassal(true)}>
                <Trash2 className="h-4 w-4" /> Hapus Terpilih
              </Button>
            </div>
          </div>
        )}

        {memuat ? (
          <div className="p-stack-lg">
            <LoadingSpinner />
          </div>
        ) : data.length === 0 ? (
          <div className="p-stack-lg">
            <EmptyState ikon={ClipboardList} judul="Belum ada peminjaman" deskripsi="Tidak ada data peminjaman yang cocok dengan filter." />
          </div>
        ) : (
          <div className="p-stack-md">
            {mode === 'list' ? (
              <TabelPeminjaman
                data={data}
                hrefDetail={RUTE.adminPeminjamanDetail}
                tampilkanPeminjam
                tampilkanMerk
                onHapus={hapus}
                terpilih={terpilih}
                onUbahTerpilih={setTerpilih}
              />
            ) : (
              <FolderPeminjaman data={data} hrefDetail={RUTE.adminPeminjamanDetail} onHapus={hapus} />
            )}
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span>Tampilkan</span>
                <Select
                  value={String(filter.limit ?? 12)}
                  onChange={(e) => setFilter((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
                  className="h-9 w-[4.5rem]"
                  aria-label="Jumlah peminjaman per halaman"
                >
                  {OPSI_LIMIT.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
                <span>per halaman{meta ? ` • ${meta.total} data` : ''}</span>
              </div>

              {meta && meta.totalHalaman > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant">
                    Halaman {meta.page} dari {meta.totalHalaman}
                  </span>
                  <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) - 1 }))}>
                    <ChevronLeft className="h-4 w-4" /> Sebelumnya
                  </Button>
                  <Button variant="outline" size="sm" disabled={meta.page >= meta.totalHalaman} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) + 1 }))}>
                    Berikutnya <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <KonfirmasiDialog
        terbuka={dialogSetujui}
        onUbahTerbuka={(o) => !o && setDialogSetujui(false)}
        judul="Setujui Pengajuan Terpilih"
        deskripsi={`Setujui ${jumlahBisaSetujui} pengajuan berstatus "Menunggu"? Stok barang akan dikurangi dan QR Code dibuat untuk tiap peminjaman. Pengajuan dengan stok tidak mencukupi akan dilewati.`}
        teksKonfirmasi={`Ya, Setujui ${jumlahBisaSetujui}`}
        variantKonfirmasi="sukses"
        sedangProses={sedangSetujui}
        onKonfirmasi={setujuiMassal}
      />

      <KonfirmasiDialog
        terbuka={dialogSerahkan}
        onUbahTerbuka={(o) => !o && setDialogSerahkan(false)}
        judul="Serahkan Barang Terpilih"
        deskripsi={`Tandai ${jumlahBisaSerahkan} peminjaman berstatus "Disetujui" sebagai telah diserahkan kepada peminjam? Peminjaman dengan status lain akan dilewati.`}
        teksKonfirmasi={`Ya, Serahkan ${jumlahBisaSerahkan}`}
        variantKonfirmasi="sukses"
        sedangProses={sedangSerahkan}
        onKonfirmasi={serahkanMassal}
      />

      <KonfirmasiDialog
        terbuka={dialogKembalikan}
        onUbahTerbuka={(o) => !o && setDialogKembalikan(false)}
        judul="Konfirmasi Pengembalian Terpilih"
        deskripsi={`Konfirmasi pengembalian ${jumlahBisaKembalikan} peminjaman yang sedang dipinjam? Stok barang akan dikembalikan otomatis ke sistem. Peminjaman dengan status lain akan dilewati.`}
        teksKonfirmasi={`Ya, Kembalikan ${jumlahBisaKembalikan}`}
        variantKonfirmasi="sukses"
        sedangProses={sedangKembalikan}
        onKonfirmasi={kembalikanMassal}
      />

      <KonfirmasiDialog
        terbuka={dialogMassal}
        onUbahTerbuka={(o) => !o && setDialogMassal(false)}
        judul="Hapus Peminjaman Terpilih"
        deskripsi={`Hapus ${terpilih.length} data peminjaman yang dipilih? Untuk barang yang masih dipinjam, stok dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.`}
        teksKonfirmasi={`Ya, Hapus ${terpilih.length} Data`}
        variantKonfirmasi="destructive"
        sedangProses={sedangMassal}
        onKonfirmasi={hapusMassal}
      />
    </div>
  );
}
