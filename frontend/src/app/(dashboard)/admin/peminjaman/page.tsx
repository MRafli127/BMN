// ============================================================
//  Admin — Manajemen Peminjaman (daftar + filter status).
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Trash2, X, CheckCheck } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { ImportPeminjamDialog } from '@/components/peminjaman/ImportPeminjamDialog';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { peminjamanService, type FilterPeminjaman } from '@/services/peminjaman.service';
import { useQuery } from '@/lib/cache';
import { ambilPesanError } from '@/lib/utils';
import { OPSI_STATUS } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

// Pilihan jumlah baris yang ditampilkan per halaman
const OPSI_LIMIT = [12, 50, 100, 200];

export default function AdminPeminjamanPage() {
  const [filter, setFilter] = useState<FilterPeminjaman>({ page: 1, limit: 12 });
  const [cari, setCari] = useState('');
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [dialogMassal, setDialogMassal] = useState(false);
  const [sedangMassal, setSedangMassal] = useState(false);
  const [dialogSetujui, setDialogSetujui] = useState(false);
  const [sedangSetujui, setSedangSetujui] = useState(false);

  const key = useMemo(() => `peminjaman:${JSON.stringify(filter)}`, [filter]);

  // muat (refetch) memaksa pemuatan ulang sambil tetap menampilkan data lama.
  const { data: hasil, sedangMemuat: memuat, refetch: muat } = useQuery<{ data: Peminjaman[]; meta: MetaPagination | null }>(
    key,
    () => peminjamanService.getSemua(filter)
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

  const hapus = async (id: string) => {
    try {
      await peminjamanService.hapus(id);
      notify.sukses('Data peminjaman berhasil dihapus.');
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
        notify.sukses(
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

  const hapusMassal = async () => {
    setSedangMassal(true);
    try {
      const jumlah = await peminjamanService.hapusMassal(terpilih);
      notify.sukses(`${jumlah} data peminjaman berhasil dihapus.`);
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
        <ImportPeminjamDialog onSelesai={muat} />
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
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama barang / nama peminjam..." className="pl-10" />
          </div>
          <Select
            value={filter.status || ''}
            onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as never, page: 1 }))}
          >
            <option value="">Semua Status</option>
            {OPSI_STATUS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
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
            <TabelPeminjaman
              data={data}
              hrefDetail={RUTE.adminPeminjamanDetail}
              tampilkanPeminjam
              tampilkanMerk
              onHapus={hapus}
              terpilih={terpilih}
              onUbahTerpilih={setTerpilih}
            />
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
