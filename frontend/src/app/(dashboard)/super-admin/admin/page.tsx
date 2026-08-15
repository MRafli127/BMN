// ============================================================
//  Manajemen Admin — halaman Super Admin untuk kelola admin.
//  Optimized: useDeferredValue, memo, skeleton loading
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef, memo, useDeferredValue } from 'react';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { notify } from '@/components/ui/toast';
import { LABEL_ROLE } from '@/constants/roles';
import { cn, ambilPesanError } from '@/lib/utils';
import { userManagementService, type UserItem } from '@/services/userManagement.service';
import { TableSkeleton, FilterSkeleton, HeaderSkeleton } from '@/components/shared/SuperAdminSkeleton';

// ============================================================
//  Memoized Badge Component
// ============================================================
const BadgeRole = memo(function BadgeRole({ roles }: { roles?: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles?.map((role) => (
        <Badge
          key={role}
          className={cn(
            role === 'SUPER_ADMIN' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'
          )}
        >
          {LABEL_ROLE[role as keyof typeof LABEL_ROLE]}
        </Badge>
      ))}
    </div>
  );
});

// ============================================================
//  Memoized Action Buttons
// ============================================================
const ActionButtons = memo(function ActionButtons({
  admin,
  onReset,
  onDemote,
}: {
  admin: UserItem;
  onReset: () => void;
  onDemote: () => void;
}) {
  if (admin.roles?.includes('SUPER_ADMIN')) {
    return <span className="text-xs text-gray-500">Super Admin</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="text-xs transition-transform active:scale-95"
      >
        <Icon name="key" style={{ fontSize: 14 }} />
        Reset
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDemote}
        className="text-xs text-red-600 transition-transform hover:bg-red-50 active:scale-95"
      >
        <Icon name="person_remove" style={{ fontSize: 14 }} />
        Cabut
      </Button>
    </div>
  );
});

// ============================================================
//  Memoized Table Row
// ============================================================
const AdminTableRow = memo(function AdminTableRow({
  admin,
  onReset,
  onDemote,
}: {
  admin: UserItem;
  onReset: () => void;
  onDemote: () => void;
}) {
  return (
    <TableRow className="transition-colors hover:bg-gray-50">
      <TableCell>
        <div>
          <p className="font-medium text-gray-900">{admin.nama}</p>
          {admin.jabatan && <p className="text-xs text-gray-500">{admin.jabatan}</p>}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{admin.nip}</TableCell>
      <TableCell className="text-sm">{admin.eselon2 || '-'}</TableCell>
      <TableCell>
        <BadgeRole roles={admin.roles} />
      </TableCell>
      <TableCell>
        <ActionButtons admin={admin} onReset={onReset} onDemote={onDemote} />
      </TableCell>
    </TableRow>
  );
});

export default function ManajemenAdminPage() {
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(10);
  const [cari, setCari] = useState('');
  const cariDeferred = useDeferredValue(cari);
  const [daftarAdmin, setDaftarAdmin] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalHalaman: 1 });
  const [memuat, setMemuat] = useState(true);
  const isMounted = useRef(true);

  // Dialog konfirmasi
  const [dialogKonfirmasi, setDialogKonfirmasi] = useState<{
    terbuka: boolean;
    judul: string;
    pesan: string;
    aksi: () => Promise<void>;
  }>({ terbuka: false, judul: '', pesan: '', aksi: async () => {} });
  const [sedangAksi, setSedangAksi] = useState(false);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [cariDeferred, limit]);

  // Ambil data admin
  const muatAdmin = useCallback(async () => {
    setMemuat(true);
    try {
      const hasil = await userManagementService.getSemua({
        q: cariDeferred,
        role: 'ADMIN',
        page: halaman,
        limit,
      });
      if (isMounted.current) {
        setDaftarAdmin(hasil.data || []);
        setMeta(hasil.meta);
      }
    } catch (err) {
      console.error('Gagal memuat admin:', err);
      if (isMounted.current) {
        notify.gagal(ambilPesanError(err, 'Gagal memuat data.'));
      }
    } finally {
      if (isMounted.current) {
        setMemuat(false);
      }
    }
  }, [cariDeferred, halaman, limit]);

  useEffect(() => {
    isMounted.current = true;
    muatAdmin();
    return () => { isMounted.current = false; };
  }, [muatAdmin]);

  // Refresh data after action
  const refreshData = useCallback(async () => {
    try {
      const hasil = await userManagementService.getSemua({
        q: cariDeferred,
        role: 'ADMIN',
        page: halaman,
        limit,
      });
      if (isMounted.current) {
        setDaftarAdmin(hasil.data || []);
        setMeta(hasil.meta);
      }
    } catch (err) {
      console.error('Gagal refresh data:', err);
    }
  }, [cariDeferred, halaman, limit]);

  // Promote user jadi ADMIN
  const promosikan = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Promosikan ke Admin',
      pesan: `Yakin ingin menjadikan ${user.nama} sebagai Admin?`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.tambahRole(user.id, 'ADMIN');
          notify.suksess(`${user.nama} berhasil dipromosikan ke Admin.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal mempromosikan.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Demote admin jadi PEMINJAM
  const demosikan = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Cabut Akses Admin',
      pesan: `Yakin ingin mencabut akses Admin dari ${user.nama}?`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.hapusRole(user.id, 'ADMIN');
          notify.suksess(`Akses Admin ${user.nama} berhasil dicabut.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal mencabut akses.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Reset password admin
  const resetPassword = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Reset Password',
      pesan: `Reset password untuk ${user.nama}? Password baru akan ditampilkan setelah reset.`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          const hasil = await userManagementService.resetPassword(user.id);
          notify.suksess(`Password berhasil direset. Password baru: ${hasil.passwordBaru}`);
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal reset password.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header - gradient ungu modern */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-violet-600 to-fuchsia-500 p-6 text-white shadow-lg shadow-violet-700/20 animate-page-in sm:p-8">
        {/* Dekorasi blob & grid pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
          <div className="absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-violet-400/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        </div>

        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
            <Icon name="admin_panel_settings" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-jakarta text-2xl font-bold tracking-tight sm:text-3xl">
              Manajemen Admin
            </h1>
            <p className="mt-0.5 text-sm text-white/85">
              Kelola akun Administrator dan Super Admin.
            </p>
          </div>
        </div>
      </section>

      {/* Filter & Pencarian */}
      <div className="rounded-2xl bg-white p-4 shadow-md animate-page-in" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 20 }} />
            <Input
              placeholder="Cari nama, NIP, atau Eselon II..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="pl-10 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={10}>10 / halaman</option>
              <option value={25}>25 / halaman</option>
              <option value={50}>50 / halaman</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Admin */}
      <div className="rounded-2xl bg-white shadow-md animate-page-in" style={{ animationDelay: '100ms' }}>
        {memuat ? (
          <div className="p-6">
            <TableSkeleton columns={5} rows={5} />
          </div>
        ) : daftarAdmin.length === 0 ? (
          <div className="p-6">
            <EmptyState
              ikon="admin_panel_settings"
              judul="Belum Ada Admin"
              deskripsi="Belum ada administrator yang terdaftar."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Eselon II</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftarAdmin.map((admin) => (
                  <AdminTableRow
                    key={admin.id}
                    admin={admin}
                    onReset={() => resetPassword(admin)}
                    onDemote={() => demosikan(admin)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!memuat && daftarAdmin.length > 0 && (
          <div className="flex items-center justify-between border-t p-4 transition-all">
            <p className="text-sm text-gray-500">
              Menampilkan {daftarAdmin.length} dari {meta.total} admin
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHalaman((p) => Math.max(1, p - 1))}
                disabled={halaman === 1}
                className="transition-transform active:scale-95"
              >
                <Icon name="chevron_left" style={{ fontSize: 16 }} />
              </Button>
              <span className="px-2 text-sm">
                Halaman {halaman} / {meta.totalHalaman}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHalaman((p) => Math.min(meta.totalHalaman, p + 1))}
                disabled={halaman >= meta.totalHalaman}
                className="transition-transform active:scale-95"
              >
                <Icon name="chevron_right" style={{ fontSize: 16 }} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Konfirmasi */}
      <KonfirmasiDialog
        terbuka={dialogKonfirmasi.terbuka}
        judul={dialogKonfirmasi.judul}
        pesan={dialogKonfirmasi.pesan}
        onUbahTerbuka={(terbuka) => setDialogKonfirmasi((d) => ({ ...d, terbuka }))}
        onKonfirmasi={dialogKonfirmasi.aksi}
        sedangMemuat={sedangAksi}
        teksKonfirmasi="Ya, Lanjutkan"
      />
    </div>
  );
}
