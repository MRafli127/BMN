// ============================================================
//  Super Admin - Manajemen Admin
//  CRUD admin dan atur satker akses
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { userManagementService } from '@/services/userManagement.service';
import { satkerService, type Satker } from '@/services/satker.service';
import { useQuery, useMutation, useQueryClient } from '@/lib/cache';
import { notify } from '@/components/ui/toast';
import { ambilPesanError } from '@/lib/utils';

export default function SuperAdminAdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [dialogSatkerOpen, setDialogSatkerOpen] = useState(false);
  const [dialogRoleOpen, setDialogRoleOpen] = useState(false);
  const [selectedSatker, setSelectedSatker] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState<'ADMIN' | 'PEMINJAM'>('ADMIN');

  // Ambil daftar admin
  const { data: adminData, isLoading } = useQuery(
    `admins:${search}:${page}`,
    () => userManagementService.getSemua({ q: search, role: 'ADMIN', page, limit: 10 })
  );

  // Ambil daftar satker
  const { data: satkerData } = useQuery('satker-list', () => satkerService.getSemua({ limit: 100 }));

  // Mutation: update satker akses
  const updateSatkerMutation = useMutation(
    (satkerList: string[]) => userManagementService.updateSatkerAkses(selectedAdmin!.id, satkerList),
    {
      onSuccess: () => {
        notify.suksess('Satker akses berhasil diperbarui');
        setDialogSatkerOpen(false);
        queryClient.invalidateQueries('admins');
      },
      onError: (error) => {
        notify.gagal(ambilPesanError(error, 'Gagal memperbarui satker akses'));
      },
    }
  );

  // Mutation: promote/demote
  const roleMutation = useMutation(
    (action: 'promote' | 'demote') => {
      if (action === 'promote') {
        return userManagementService.tambahRole(selectedAdmin!.id, targetRole);
      } else {
        return userManagementService.hapusRole(selectedAdmin!.id, targetRole);
      }
    },
    {
      onSuccess: (_, action) => {
        notify.suksess(action === 'promote' ? 'Role berhasil ditambahkan' : 'Role berhasil dicabut');
        setDialogRoleOpen(false);
        queryClient.invalidateQueries('admins');
      },
      onError: (error) => {
        notify.gagal(ambilPesanError(error, 'Gagal mengubah role'));
      },
    }
  );

  const handleBukaSatker = (admin: any) => {
    setSelectedAdmin(admin);
    setSelectedSatker(admin.satkerAkses || []);
    setDialogSatkerOpen(true);
  };

  const handleSimpanSatker = () => {
    updateSatkerMutation.mutate(selectedSatker);
  };

  const handleBukaRole = (admin: any, action: 'promote' | 'demote') => {
    setSelectedAdmin(admin);
    setTargetRole('ADMIN');
    setDialogRoleOpen(true);
  };

  if (isLoading) return <LoadingSpinner layarPenuh />;

  const admins = adminData?.data || [];
  const meta = adminData?.meta || { total: 0, page: 1, totalHalaman: 1 };

  return (
    <div className="space-y-gutter">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-jakarta text-headline-lg-mobile font-bold text-primary sm:text-headline-lg">
            Manajemen Administrator
          </h1>
          <p className="mt-1 text-muted-foreground">
            Kelola admin, atur akses satker, dan Promosi/Demosi peran
          </p>
        </div>
      </section>

      {/* Search */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari nama, NIP, atau email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">NIP</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Roles</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Satker Akses</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <EmptyState judul="Tidak ada admin" deskripsi="Belum ada administrator yang ditemukan" />
                  </td>
                </tr>
              ) : (
                admins.map((admin: any) => (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{admin.nama}</p>
                        <p className="text-sm text-slate-500">{admin.jabatan || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{admin.nip}</td>
                    <td className="px-4 py-3 text-sm">{admin.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {admin.roles.map((role: string) => (
                          <Badge key={role} variant={role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {admin.satkerAkses?.length > 0 ? (
                          admin.satkerAkses.slice(0, 2).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s.slice(-6)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-emerald-600 font-medium">Semua Satker</span>
                        )}
                        {(admin.satkerAkses?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(admin.satkerAkses?.length || 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBukaSatker(admin)}
                          title="Atur Satker"
                        >
                          <Icon name="location_city" className="h-4 w-4" />
                        </Button>
                        {admin.roles.includes('ADMIN') && !admin.roles.includes('SUPER_ADMIN') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBukaRole(admin, 'demote')}
                            title="Cabut Admin"
                            className="text-error hover:text-error"
                          >
                            <Icon name="person_remove" className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalHalaman > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-500">
              Halaman {meta.page} dari {meta.totalHalaman} ({meta.total} data)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalHalaman}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Atur Satker */}
      <Dialog open={dialogSatkerOpen} onOpenChange={setDialogSatkerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atur Satker Akses - {selectedAdmin?.nama}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2 py-4">
            <p className="text-sm text-slate-600">
              Pilih satker yang boleh dikelola oleh admin ini. Kosongkan untuk memberikan akses ke semua satker.
            </p>
            {satkerData?.data?.map((satker: Satker) => (
              <label
                key={satker.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
              >
                <input
                  type="checkbox"
                  checked={selectedSatker.includes(satker.kode)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSatker([...selectedSatker, satker.kode]);
                    } else {
                      setSelectedSatker(selectedSatker.filter((s) => s !== satker.kode));
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{satker.nama}</p>
                  <p className="text-xs text-slate-500 font-mono">{satker.kode}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSatkerOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSimpanSatker} loading={updateSatkerMutation.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Role */}
      <Dialog open={dialogRoleOpen} onOpenChange={setDialogRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Ubah Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Apakah Anda yakin ingin mencabut role ADMIN dari <strong>{selectedAdmin?.nama}</strong>?
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Admin tidak akan bisa lagi mengakses area administrator. Sesi login-nya akan diinvalidasi.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRoleOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => roleMutation.mutate('demote')}
              loading={roleMutation.isPending}
            >
              Cabut Role Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
