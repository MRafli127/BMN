// ============================================================
//  Pengguna Terdaftar — halaman Super Admin untuk lihat semua user.
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

export default function PenggunaPage() {
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(20);
  const [cari, setCari] = useState('');
  const [cariDebounced, setCariDebounced] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [pengguna, setPengguna] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalHalaman: 1 });
  const [memuat, setMemuat] = useState(true);

  // Dialog konfirmasi
  const [dialogKonfirmasi, setDialogKonfirmasi] = useState({
    terbuka: false,
    judul: '',
    pesan: '',
    aksi: async () => {},
  });
  const [sedangAksi, setSedangAksi] = useState(false);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setCariDebounced(cari), 350);
    return () => clearTimeout(t);
  }, [cari]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [cariDebounced, filterRole, limit]);

  // Ambil data pengguna
  useEffect(() => {
    async function muatPengguna() {
      setMemuat(true);
      try {
        const params: any = { page: halaman, limit };
        if (cariDebounced) params.q = cariDebounced;
        if (filterRole) params.role = filterRole;

        const data = await userManagementService.getSemua(params);
        setPengguna(data.data || []);
        setMeta(data.meta);
      } catch (err) {
        console.error('Gagal memuat pengguna:', err);
      } finally {
        setMemuat(false);
      }
    }
    muatPengguna();
  }, [halaman, limit, cariDebounced, filterRole]);

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
          setPengguna((prev) => prev.map((u) => u.id === user.id ? { ...u, roles: [...(u.roles || []), 'ADMIN'] } : u));
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
          setPengguna((prev) => prev.map((u) => u.id === user.id ? { ...u, roles: (u.roles || []).filter((r) => r !== 'ADMIN') } : u));
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
          setPengguna((prev) => prev.filter((u) => u.id !== user.id));
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal menghapus.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Badge role
  const BadgeRole = ({ role }: { role: string }) => {
    if (role === 'SUPER_ADMIN') return <Badge className="bg-purple-500 text-white">Super Admin</Badge>;
    if (role === 'ADMIN') return <Badge className="bg-blue-500 text-white">Admin</Badge>;
    return <Badge variant="secondary">Peminjam</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Pengguna Terdaftar</h1>
        <p className="mt-1 text-blue-100">Kelola seluruh pengguna dalam sistem.</p>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-white p-4 shadow-md">
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
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Semua Role</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="PEMINJAM">Peminjam</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl bg-white shadow-md">
        {memuat ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : pengguna.length === 0 ? (
          <EmptyState
            ikon="group"
            judul="Tidak Ada Pengguna"
            deskripsi="Belum ada pengguna yang terdaftar."
          />
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
                  <TableRow key={user.id} className="hover:bg-gray-50">
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
                      <div className="flex items-center gap-2">
                        {!(user.roles || []).includes('SUPER_ADMIN') && (
                          <>
                            {!(user.roles || []).includes('ADMIN') ? (
                              <Button variant="outline" size="sm" onClick={() => promosikan(user)} className="text-xs">
                                <Icon name="arrow_upward" style={{ fontSize: 14 }} />
                                Promosi
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => cabutAdmin(user)} className="text-xs text-orange-600 hover:bg-orange-50">
                                <Icon name="arrow_downward" style={{ fontSize: 14 }} />
                                Cabut
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => hapusPengguna(user)} className="text-xs text-red-600 hover:bg-red-50">
                              <Icon name="delete" style={{ fontSize: 14 }} />
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
        {!memuat && pengguna.length > 0 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Menampilkan {pengguna.length} dari {meta.total} pengguna
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setHalaman((p) => Math.max(1, p - 1))} disabled={halaman === 1}>
                <Icon name="chevron_left" style={{ fontSize: 16 }} />
              </Button>
              <span className="px-2 text-sm">Halaman {halaman} / {meta.totalHalaman}</span>
              <Button variant="outline" size="sm" onClick={() => setHalaman((p) => Math.min(meta.totalHalaman, p + 1))} disabled={halaman >= meta.totalHalaman}>
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
