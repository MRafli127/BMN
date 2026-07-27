// ============================================================
//  Pengguna Terdaftar — halaman Super Admin untuk lihat semua user.
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
import { cn, ambilPesanError } from '@/lib/utils';
import { userManagementService, type UserItem } from '@/services/userManagement.service';
import { TableSkeleton, FilterSkeleton } from '@/components/shared/SuperAdminSkeleton';

// ============================================================
//  Memoized Badge Role Component
// ============================================================
const BadgeRole = memo(function BadgeRole({ role }: { role: string }) {
  if (role === 'SUPER_ADMIN') return <Badge className="bg-purple-500 text-white">Super Admin</Badge>;
  if (role === 'ADMIN') return <Badge className="bg-blue-500 text-white">Admin</Badge>;
  return <Badge variant="secondary">Peminjam</Badge>;
});

// ============================================================
//  Memoized Action Buttons
// ============================================================
const ActionButtons = memo(function ActionButtons({
  user,
  onPromote,
  onRevoke,
  onReset,
  onDelete,
}: {
  user: UserItem;
  onPromote: () => void;
  onRevoke: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const isSuperAdmin = user.roles?.includes('SUPER_ADMIN');

  if (isSuperAdmin) {
    return <span className="text-xs text-gray-500">Super Admin</span>;
  }

  const isAdmin = user.roles?.includes('ADMIN');

  return (
    <div className="flex items-center gap-2">
      {!isAdmin ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onPromote}
          className="text-xs transition-transform active:scale-95"
        >
          <Icon name="arrow_upward" style={{ fontSize: 14 }} />
          Promosi
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onRevoke}
          className="text-xs text-orange-600 transition-transform hover:bg-orange-50 active:scale-95"
        >
          <Icon name="arrow_downward" style={{ fontSize: 14 }} />
          Cabut
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="text-xs text-blue-600 transition-transform hover:bg-blue-50 active:scale-95"
      >
        <Icon name="key" style={{ fontSize: 14 }} />
        Reset
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDelete}
        className="text-xs text-red-600 transition-transform hover:bg-red-50 active:scale-95"
      >
        <Icon name="delete" style={{ fontSize: 14 }} />
      </Button>
    </div>
  );
});

// ============================================================
//  Memoized Table Row
// ============================================================
const UserTableRow = memo(function UserTableRow({
  user,
  onPromote,
  onRevoke,
  onReset,
  onDelete,
}: {
  user: UserItem;
  onPromote: () => void;
  onRevoke: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow className="transition-colors hover:bg-gray-50">
      <TableCell className="font-medium">{user.nama}</TableCell>
      <TableCell className="font-mono text-sm">{user.nip}</TableCell>
      <TableCell className="text-sm">{user.email}</TableCell>
      <TableCell className="text-sm text-gray-500">{user.jabatan || '-'}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {(user.roles || []).map((role) => (
            <BadgeRole key={role} role={role} />
          ))}
        </div>
      </TableCell>
      <TableCell>
        <ActionButtons
          user={user}
          onPromote={onPromote}
          onRevoke={onRevoke}
          onReset={onReset}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
});

export default function PenggunaPage() {
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(20);
  const [cari, setCari] = useState('');
  const cariDeferred = useDeferredValue(cari);
  const [filterRole, setFilterRole] = useState('');
  const [pengguna, setPengguna] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalHalaman: 1 });
  const [memuat, setMemuat] = useState(true);
  const isMounted = useRef(true);

  // Dialog konfirmasi
  const [dialogKonfirmasi, setDialogKonfirmasi] = useState({
    terbuka: false,
    judul: '',
    pesan: '',
    aksi: async () => {},
  });
  const [sedangAksi, setSedangAksi] = useState(false);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [cariDeferred, filterRole, limit]);

  // Ambil data pengguna
  const muatPengguna = useCallback(async () => {
    setMemuat(true);
    try {
      const params: Record<string, unknown> = { page: halaman, limit };
      if (cariDeferred) params.q = cariDeferred;
      if (filterRole) params.role = filterRole;

      const data = await userManagementService.getSemua(params);
      if (isMounted.current) {
        setPengguna(data.data || []);
        setMeta(data.meta);
      }
    } catch (err) {
      console.error('Gagal memuat pengguna:', err);
      if (isMounted.current) {
        notify.gagal(ambilPesanError(err, 'Gagal memuat data.'));
      }
    } finally {
      if (isMounted.current) {
        setMemuat(false);
      }
    }
  }, [cariDeferred, filterRole, halaman, limit]);

  useEffect(() => {
    isMounted.current = true;
    muatPengguna();
    return () => { isMounted.current = false; };
  }, [muatPengguna]);

  // Refresh data after action
  const refreshData = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { page: halaman, limit };
      if (cariDeferred) params.q = cariDeferred;
      if (filterRole) params.role = filterRole;

      const data = await userManagementService.getSemua(params);
      if (isMounted.current) {
        setPengguna(data.data || []);
        setMeta(data.meta);
      }
    } catch (err) {
      console.error('Gagal refresh data:', err);
    }
  }, [cariDeferred, filterRole, halaman, limit]);

  // Promosikan ke Admin
  const promosikan = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Promosikan ke Admin',
      pesan: `Yakin ingin menjadikan ${user.nama} sebagai Admin?`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.tambahRole(user.id, 'ADMIN');
          notify.suksess(`${user.nama} berhasil dipromosikan.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal promosi.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Cabut Admin
  const cabutAdmin = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Cabut Akses Admin',
      pesan: `Yakin ingin mencabut akses Admin dari ${user.nama}?`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.hapusRole(user.id, 'ADMIN');
          notify.suksess(`Akses Admin ${user.nama} dicabut.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal mencabut.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Hapus pengguna
  const hapusPengguna = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Hapus Pengguna',
      pesan: `Yakin ingin menghapus ${user.nama}? Tindakan ini tidak dapat dibatalkan.`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.remove(user.id);
          notify.suksess(`${user.nama} berhasil dihapus.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal menghapus.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Reset password pengguna
  const resetPasswordPengguna = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Reset Password',
      pesan: `Reset password untuk ${user.nama}? Password baru akan direset ke: BMN@Reset123`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.resetPassword(user.id);
          notify.suksess(`Password ${user.nama} berhasil direset ke BMN@Reset123.`);
          await refreshData();
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
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white shadow-lg animate-page-in">
        <h1 className="text-2xl font-bold">Pengguna Terdaftar</h1>
        <p className="mt-1 text-blue-100">Kelola seluruh pengguna dalam sistem.</p>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-white p-4 shadow-md animate-page-in" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 20 }} />
            <Input
              placeholder="Cari nama, NIP, atau email..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
          >
            <option value="">Semua Role</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="PEMINJAM">Peminjam</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
          >
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl bg-white shadow-md animate-page-in" style={{ animationDelay: '100ms' }}>
        {memuat ? (
          <div className="p-6">
            <TableSkeleton columns={6} rows={8} />
          </div>
        ) : pengguna.length === 0 ? (
          <div className="p-6">
            <EmptyState
              ikon="group"
              judul="Tidak Ada Pengguna"
              deskripsi="Belum ada pengguna yang terdaftar."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pengguna.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    onPromote={() => promosikan(user)}
                    onRevoke={() => cabutAdmin(user)}
                    onReset={() => resetPasswordPengguna(user)}
                    onDelete={() => hapusPengguna(user)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!memuat && pengguna.length > 0 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Menampilkan {pengguna.length} dari {meta.total} pengguna
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
              <span className="px-2 text-sm">Halaman {halaman} / {meta.totalHalaman}</span>
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
