// ============================================================
//  Manajemen Admin — halaman Super Admin untuk kelola admin.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { notify } from '@/components/ui/toast';
import { ambilPesanError } from '@/lib/utils';
import { userManagementService, type UserItem } from '@/services/userManagement.service';

export default function ManajemenAdminPage() {
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(10);
  const [cari, setCari] = useState('');
  const [cariDebounced, setCariDebounced] = useState('');
  const [daftarAdmin, setDaftarAdmin] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalHalaman: 1 });
  const [memuat, setMemuat] = useState(true);

  // Dialog konfirmasi
  const [dialogKonfirmasi, setDialogKonfirmasi] = useState<{
    terbuka: boolean;
    judul: string;
    pesan: string;
    aksi: () => Promise<void>;
  }>({ terbuka: false, judul: '', pesan: '', aksi: async () => {} });
  const [sedangAksi, setSedangAksi] = useState(false);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setCariDebounced(cari), 350);
    return () => clearTimeout(t);
  }, [cari]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [cariDebounced, limit]);

  // Ambil data admin
  useEffect(() => {
    async function muatAdmin() {
      setMemuat(true);
      try {
        const hasil = await userManagementService.getSemua({
          q: cariDebounced,
          role: 'ADMIN',
          page: halaman,
          limit,
        });
        setDaftarAdmin(hasil.data || []);
        setMeta(hasil.meta);
      } catch (err) {
        console.error('Gagal memuat admin:', err);
        notify.gagal(ambilPesanError(err, 'Gagal memuat data.'));
      } finally {
        setMemuat(false);
      }
    }
    muatAdmin();
  }, [halaman, limit, cariDebounced]);

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
          // Refresh data
          const hasil = await userManagementService.getSemua({
            q: cariDebounced,
            role: 'ADMIN',
            page: halaman,
            limit,
          });
          setDaftarAdmin(hasil.data || []);
          setMeta(hasil.meta);
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
          // Refresh data
          const hasil = await userManagementService.getSemua({
            q: cariDebounced,
            role: 'ADMIN',
            page: halaman,
            limit,
          });
          setDaftarAdmin(hasil.data || []);
          setMeta(hasil.meta);
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
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Manajemen Admin</h1>
        <p className="mt-1 text-blue-100">Kelola akun Administrator dan Super Admin.</p>
      </div>

      {/* Filter & Pencarian */}
      <div className="rounded-2xl bg-white p-4 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 20 }} />
            <Input
              placeholder="Cari nama, NIP, atau email..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={10}>10 / halaman</option>
              <option value={25}>25 / halaman</option>
              <option value={50}>50 / halaman</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Admin */}
      <div className="rounded-2xl bg-white shadow-md">
        {memuat ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : daftarAdmin.length === 0 ? (
          <EmptyState
            ikon="admin_panel_settings"
            judul="Belum Ada Admin"
            deskripsi="Belum ada administrator yang terdaftar."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftarAdmin.map((admin) => (
                  <TableRow key={admin.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{admin.nama}</p>
                        {admin.jabatan && <p className="text-xs text-gray-500">{admin.jabatan}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{admin.nip}</TableCell>
                    <TableCell className="text-sm">{admin.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {admin.roles?.map((role) => (
                          <Badge
                            key={role}
                            variant={role === 'SUPER_ADMIN' ? 'default' : 'secondary'}
                            className={role === 'SUPER_ADMIN' ? 'bg-purple-500 text-white' : ''}
                          >
                            {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {admin.roles?.includes('SUPER_ADMIN') ? (
                          <span className="text-xs text-gray-500">Super Admin</span>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetPassword(admin)}
                              className="text-xs"
                            >
                              <Icon name="key" style={{ fontSize: 14 }} />
                              Reset
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => demosikan(admin)}
                              className="text-xs text-red-600 hover:bg-red-50"
                            >
                              <Icon name="person_remove" style={{ fontSize: 14 }} />
                              Cabut
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!memuat && daftarAdmin.length > 0 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Menampilkan {daftarAdmin.length} dari {meta.total} admin
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHalaman((p) => Math.max(1, p - 1))}
                disabled={halaman === 1}
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
        onBatal={() => setDialogKonfirmasi((d) => ({ ...d, terbuka: false }))}
        onKonfirmasi={dialogKonfirmasi.aksi}
        sedangMemuat={sedangAksi}
        teksKonfirmasi="Ya, Lanjutkan"
      />
    </div>
  );
}
