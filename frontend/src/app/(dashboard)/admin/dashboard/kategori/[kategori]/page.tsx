'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, Trash2, X, Users, ShieldCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { TabelDaftarPeminjam, type PeminjamRow } from '@/components/peminjaman/TabelDaftarPeminjam';
import { KartuDaftarPeminjam } from '@/components/peminjaman/KartuDaftarPeminjam';
import { ImportPegawaiDialog } from '@/components/peminjaman/ImportPegawaiDialog';
import { TambahPeminjamDialog } from '@/components/peminjaman/TambahPeminjamDialog';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { notify } from '@/components/ui/toast';
import { cn, urlFile, ambilPesanError } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { dashboardService, type KategoriDashboard, type ResponseKategori, type FilterRole } from '@/services/dashboard.service';
import { userManagementService } from '@/services/userManagement.service';
import { useQuery, invalidasiCacheDenganNama } from '@/lib/cache';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';
import type { Peminjaman } from '@/types/peminjaman.type';

// Info kategori untuk judul dan ikon
const INFO_KATEGORI: Record<string, { judul: string; ikon: string; deskripsi: string }> = {
  semua: { judul: 'Semua Peminjaman', ikon: 'inventory_2', deskripsi: 'Daftar seluruh peminjaman' },
  barang: { judul: 'Daftar Barang', ikon: 'inventory', deskripsi: 'Seluruh aset terdaftar' },
  pengajuan_menunggu: { judul: 'Pengajuan Menunggu', ikon: 'pending_actions', deskripsi: 'Menunggu persetujuan admin' },
  peminjaman_aktif: { judul: 'Peminjaman Aktif', ikon: 'sync_alt', deskripsi: 'Barang sedang digunakan' },
  barang_terlambat: { judul: 'Barang Terlambat', ikon: 'report', deskripsi: 'Melebihi batas tempo pengembalian' },
  peminjam: { judul: 'Pengguna Terdaftar', ikon: 'group', deskripsi: 'Pengguna terdaftar' },
};

// Mini kartu statistik — gradient berbeda tiap kartu
interface MiniStatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string; // kelas tailwind untuk background gradient
  ring: string;
  delay?: number;
}
function MiniStat({ label, value, icon, gradient, ring, delay = 0 }: MiniStatProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/60 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated animate-page-in'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md ring-2',
            gradient,
            ring
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="truncate font-jakarta text-2xl font-bold leading-tight text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function KategoriDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const kategori = params.kategori as KategoriDashboard;

  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(12);
  const [cari, setCari] = useState('');
  const [cariDebounced, setCariDebounced] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('');
  // Tampilan daftar pegawai: card (default) atau tabel.
  const [tampilanCard, setTampilanCard] = useState(true);

  // State fitur hapus peminjam (mengikuti pola Manajemen Peminjaman): hapus
  // per-baris ditangani di dalam tabel, hapus massal lewat seleksi checkbox.
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [dialogMassal, setDialogMassal] = useState(false);
  const [sedangMassal, setSedangMassal] = useState(false);
  // Konfirmasi perubahan peran (admin) via switch di kartu.
  const [dialogRole, setDialogRole] = useState<{
    terbuka: boolean;
    user: PeminjamRow | null;
    aksi: 'promote' | 'demote';
  }>({ terbuka: false, user: null, aksi: 'promote' });
  const [sedangRole, setSedangRole] = useState(false);

  const info = INFO_KATEGORI[kategori] || INFO_KATEGORI.semua;
  const adalahBarang = kategori === 'barang';
  const adalahPeminjam = kategori === 'peminjam';

  // Debounce input pencarian agar tidak memanggil API tiap ketukan.
  useEffect(() => {
    const t = setTimeout(() => setCariDebounced(cari), 350);
    return () => clearTimeout(t);
  }, [cari]);

  // Kembali ke halaman 1 saat filter/ukuran data berubah.
  useEffect(() => {
    setHalaman(1);
  }, [cariDebounced, limit, filterRole, kategori]);

  const qCari = adalahPeminjam ? cariDebounced : '';
  const key = useMemo(
    () => `kategori:${kategori}:${halaman}:${limit}:${qCari}:${filterRole}`,
    [kategori, halaman, limit, qCari, filterRole]
  );
  const { data, sedangMemuat: memuat, error, refetch } = useQuery<ResponseKategori>(
    key,
    () => dashboardService.ambilKategori(kategori, halaman, limit, qCari, filterRole)
  );

  // Gagal memuat → kembali ke dashboard.
  useEffect(() => {
    if (error) router.push(RUTE.adminDashboard);
  }, [error, router]);

  // Reset pilihan setiap kali data dimuat ulang / halaman berubah.
  useEffect(() => {
    setTerpilih([]);
  }, [data]);

  // Bersihkan cache Daftar Pegawai & statistik dashboard, lalu muat ulang.
  const segarkanData = () => {
    invalidasiCacheDenganNama('kategori:peminjam', 'dashboard-admin');
    refetch();
  };

  // Promote/demote admin untuk satu peminjam. Melempar ulang error agar dialog
  // konfirmasi di dalam tabel tetap terbuka saat gagal (mis. admin terakhir).
  const ubahRole = async (id: string, aksi: 'promote' | 'demote') => {
    try {
      if (aksi === 'promote') await userManagementService.jadikanAdmin(id);
      else await userManagementService.cabutAdmin(id);
      notify.suksess(aksi === 'promote' ? 'Akun berhasil dijadikan admin.' : 'Peran admin berhasil dicabut.');
      segarkanData();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengubah peran akun.'));
      throw error;
    }
  };

  /** Buka dialog konfirmasi saat switch peran admin ditekan di tampilan kartu. */
  const mintaKonfirmasiRole = (id: string, aksi: 'promote' | 'demote') => {
    const user = itemsPeminjam.find((u) => u.id === id) || null;
    setDialogRole({ terbuka: true, user, aksi });
  };

  /** Eksekusi perubahan peran setelah konfirmasi. */
  const konfirmasiUbahRole = async () => {
    if (!dialogRole.user) return;
    setSedangRole(true);
    try {
      await ubahRole(dialogRole.user.id, dialogRole.aksi);
      setDialogRole({ terbuka: false, user: null, aksi: 'promote' });
    } catch {
      // ubahRole sudah menampilkan notifikasi gagal; biarkan dialog terbuka.
    } finally {
      setSedangRole(false);
    }
  };

  // Reset password pegawai ke BMN@Reset123
  const resetPasswordPegawai = async (id: string) => {
    try {
      await userManagementService.resetPassword(id);
      notify.suksess('Password berhasil direset ke BMN@Reset123.');
      segarkanData();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal reset password.'));
      throw error;
    }
  };

  // Hapus peminjam terpilih sekaligus (yang punya peminjaman aktif dilewati).
  const hapusMassal = async () => {
    setSedangMassal(true);
    try {
      const { dihapus, dilewati } = await userManagementService.hapusMassal(terpilih);
      if (dilewati > 0) {
        notify.info(`${dihapus} peminjam dihapus, ${dilewati} dilewati karena masih punya peminjaman aktif.`);
      } else {
        notify.suksess(`${dihapus} peminjam berhasil dihapus.`);
      }
      setDialogMassal(false);
      setTerpilih([]);
      segarkanData();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus peminjam terpilih.'));
    } finally {
      setSedangMassal(false);
    }
  };

  // Spinner layar penuh hanya saat pemuatan awal; saat mencari, biarkan
  // toolbar tetap terpasang agar fokus input tidak hilang.
  if (memuat && !data) return <LoadingSpinner layarPenuh />;

  const meta = data?.meta;
  const items = data?.items || [];
  const totalHalaman = meta?.totalHalaman || 1;

  // Hitung jumlah admin/non-admin dari daftar pegawai (tampilan page saat ini)
  const itemsPeminjam = adalahPeminjam ? (items as PeminjamRow[]) : [];
  const jumlahAdmin = itemsPeminjam.filter((u) => (u.roles || []).includes('ADMIN')).length;
  const jumlahNonAdmin = itemsPeminjam.filter((u) => !(u.roles || []).includes('ADMIN')).length;

  return (
    <div className="space-y-gutter">
      {/* Hero Header — gradient + dekorasi blob */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-700/20 animate-page-in sm:p-8">
        {/* Dekorasi blob & grid pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
              <Icon name={info.ikon} fill className="text-[24px]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-jakarta text-2xl font-bold tracking-tight sm:text-3xl">
                  {info.judul}
                </h1>
                {adalahPeminjam && meta && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur-md">
                    <Users className="h-3.5 w-3.5" />
                    {meta.total} total
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-white/85">{info.deskripsi}</p>
            </div>
          </div>

          {/* Tambah manual + import data pegawai */}
          {adalahPeminjam && (
            <div className="flex flex-wrap gap-2">
              <ImportPegawaiDialog onSelesai={segarkanData} />
              <TambahPeminjamDialog onSelesai={segarkanData} />
            </div>
          )}
        </div>

        {/* Mini Stat Cards — muncul hanya untuk halaman Daftar Pegawai */}
        {adalahPeminjam && meta && (
          <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat
              label="Total Pegawai"
              value={meta.total}
              icon={<Users className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              ring="ring-blue-300/40"
              delay={80}
            />
            <MiniStat
              label="Ditampilkan"
              value={`${itemsPeminjam.length} / ${meta.total}`}
              icon={<UserPlus className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-cyan-500 to-teal-600"
              ring="ring-cyan-300/40"
              delay={140}
            />
            <MiniStat
              label={filterRole === 'ADMIN' ? 'Admin di Halaman' : filterRole === 'NON_ADMIN' ? 'Non-Admin di Halaman' : 'Admin / Non-Admin'}
              value={
                filterRole === 'ADMIN'
                  ? jumlahAdmin
                  : filterRole === 'NON_ADMIN'
                    ? jumlahNonAdmin
                    : `${jumlahAdmin} / ${jumlahNonAdmin}`
              }
              icon={<ShieldCheck className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              ring="ring-blue-300/40"
              delay={200}
            />
          </div>
        )}
      </section>

      {/* Toolbar pencarian, filter peran, & ukuran halaman (khusus Daftar Pegawai) */}
      {adalahPeminjam && (
        <section className="rounded-2xl border border-outline-variant bg-white p-3 shadow-card animate-page-in sm:p-4" style={{ animationDelay: '60ms' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
              />
              <input
                type="text"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama, NIP, Eselon III / IV..."
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter peran — chip-style segmented */}
              <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1">
                {[
                  { value: '', label: 'Semua' },
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'NON_ADMIN', label: 'Non Admin' },
                ].map((opt) => {
                  const aktif = filterRole === opt.value;
                  return (
                    <button
                      key={opt.value || 'semua'}
                      onClick={() => setFilterRole(opt.value as FilterRole)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                        aktif
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Ukuran halaman */}
              <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5">
                <span className="text-xs text-on-surface-variant">Tampilkan</span>
                <select
                  id="ukuran-halaman"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-transparent text-sm font-semibold text-on-surface outline-none"
                >
                  {[12, 64, 256, 512].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Switch: Tampilan Tabel <-> Tampilan Card — pill control */}
              <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1">
                <button
                  onClick={() => setTampilanCard(true)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    tampilanCard
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                  aria-pressed={tampilanCard}
                  title="Tampilan card"
                >
                  <Icon name="view_module" className="text-[16px]" />
                  Card
                </button>
                <button
                  onClick={() => setTampilanCard(false)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    !tampilanCard
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                  aria-pressed={!tampilanCard}
                  title="Tampilan tabel"
                >
                  <Icon name="table_rows" className="text-[16px]" />
                  Tabel
                </button>
              </div>
            </div>
          </div>

          {/* Indikator filter aktif */}
          {(cariDebounced || filterRole) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3 text-xs">
              <span className="text-on-surface-variant">Filter aktif:</span>
              {cariDebounced && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  Pencarian: &ldquo;{cariDebounced}&rdquo;
                  <button
                    onClick={() => setCari('')}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterRole && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-700">
                  Peran: {filterRole === 'ADMIN' ? 'Admin' : 'Non Admin'}
                  <button
                    onClick={() => setFilterRole('')}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-violet-200"
                    aria-label="Hapus filter peran"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* Konten berdasarkan kategori */}
      {items.length === 0 ? (
        <EmptyState judul="Tidak ada data" deskripsi={`Tidak ada data untuk kategori "${info.judul}".`} />
      ) : adalahBarang ? (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>Kode / Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items as Barang[]).map((barang) => {
                const kondisi = KONDISI_BARANG[barang.kondisi];
                return (
                  <TableRow key={barang.id}>
                    <TableCell>
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                        {barang.fotoUrl ? (
                          <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{barang.nama}</p>
                      <p className="font-mono text-xs break-all text-muted-foreground">{barang.kodeBarang}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <span className={barang.jumlahTersedia > 0 ? 'text-green-700' : 'text-red-600'}>
                        {barang.jumlahTersedia}
                      </span>
                      <span className="text-muted-foreground"> / {barang.jumlahTotal}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{barang.lokasiPenyimpanan || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={RUTE.adminBarangDetail(barang.id)}>
                          Detail
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : adalahPeminjam ? (
        <div className="space-y-3">
          {/* Bilah aksi massal — muncul saat ada baris terpilih */}
          {terpilih.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-primary/5 p-3">
              <span className="text-sm font-medium text-on-surface">{terpilih.length} peminjam dipilih</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setTerpilih([])}>
                  <X className="h-4 w-4" /> Batal
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDialogMassal(true)}>
                  <Trash2 className="h-4 w-4" /> Hapus Terpilih
                </Button>
              </div>
            </div>
          )}
          {tampilanCard ? (
            <KartuDaftarPeminjam
              data={items as PeminjamRow[]}
              terpilih={terpilih}
              onUbahTerpilih={setTerpilih}
              onUbahRole={mintaKonfirmasiRole}
              onEdit={segarkanData}
              onResetPassword={resetPasswordPegawai}
            />
          ) : (
            <TabelDaftarPeminjam
              data={items as PeminjamRow[]}
              nomorAwal={(halaman - 1) * limit}
              terpilih={terpilih}
              onUbahTerpilih={setTerpilih}
              onUbahRole={ubahRole}
              onEdit={segarkanData}
              onResetPassword={resetPasswordPegawai}
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4">
          <TabelPeminjaman
            data={items as Peminjaman[]}
            hrefDetail={RUTE.adminPeminjamanDetail}
            tampilkanPeminjam
          />
        </div>
      )}

      {/* Pagination */}
      {totalHalaman > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setHalaman((h) => Math.max(1, h - 1))}
            disabled={halaman === 1}
            className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-label-md transition-all hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 font-label-md text-on-surface-variant">
            Halaman {halaman} dari {totalHalaman}
          </span>
          <button
            onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
            disabled={halaman === totalHalaman}
            className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-label-md transition-all hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Dialog konfirmasi hapus massal peminjam terpilih */}
      <KonfirmasiDialog
        terbuka={dialogMassal}
        onUbahTerbuka={(o) => !o && setDialogMassal(false)}
        judul="Hapus Peminjam Terpilih"
        deskripsi={`Hapus ${terpilih.length} peminjam yang dipilih? Seluruh riwayat peminjamannya ikut terhapus. Peminjam yang masih memiliki peminjaman aktif akan dilewati. Tindakan ini tidak dapat dibatalkan.`}
        teksKonfirmasi={`Ya, Hapus ${terpilih.length} Peminjam`}
        variantKonfirmasi="destructive"
        sedangProses={sedangMassal}
        onKonfirmasi={hapusMassal}
      />

      {/* Dialog konfirmasi perubahan peran (admin) — dipicu dari switch di kartu. */}
      <KonfirmasiDialog
        terbuka={dialogRole.terbuka}
        onUbahTerbuka={(o) => !o && setDialogRole((d) => ({ ...d, terbuka: false }))}
        judul={dialogRole.aksi === 'promote' ? 'Jadikan Admin?' : 'Cabut Akses Admin?'}
        deskripsi={
          dialogRole.aksi === 'promote'
            ? `Yakin ingin menjadikan "${dialogRole.user?.nama}" (NIP ${dialogRole.user?.nip}) sebagai Admin? Pengguna ini akan mendapat hak akses admin.`
            : `Yakin ingin mencabut akses Admin dari "${dialogRole.user?.nama}" (NIP ${dialogRole.user?.nip})? Pengguna akan kembali menjadi Peminjam biasa.`
        }
        teksKonfirmasi={dialogRole.aksi === 'promote' ? 'Ya, Jadikan Admin' : 'Ya, Cabut Akses'}
        variantKonfirmasi={dialogRole.aksi === 'promote' ? 'default' : 'destructive'}
        sedangProses={sedangRole}
        onKonfirmasi={konfirmasiUbahRole}
      />
    </div>
  );
}
