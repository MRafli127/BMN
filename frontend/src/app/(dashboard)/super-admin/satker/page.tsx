// ============================================================
//  Super Admin - Manajemen Satker
//  CRUD satker dan sinkronisasi dari data barang
// ============================================================

'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { satkerService, type Satker } from '@/services/satker.service';
import { useQuery } from '@/lib/cache';
import { invalidasiCache } from '@/lib/cache';
import { notify } from '@/components/ui/toast';
import { ambilPesanError } from '@/lib/utils';

export default function SuperAdminSatkerPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAktif, setShowAktif] = useState(true);
  const [dialogTambahOpen, setDialogTambahOpen] = useState(false);
  const [dialogEditOpen, setDialogEditOpen] = useState(false);
  const [dialogHapusOpen, setDialogHapusOpen] = useState(false);
  const [selectedSatker, setSelectedSatker] = useState<Satker | null>(null);

  // Form state
  const [formData, setFormData] = useState({ kode: '', nama: '', singkat: '', aktif: true });
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [sedangMenghapus, setSedangMenghapus] = useState(false);
  const [sedangSinkron, setSedangSinkron] = useState(false);

  // Query key
  const queryKey = `satker:${search}:${page}:${showAktif}`;

  // Query: daftar satker
  const { data: satkerData, isLoading, refetch } = useQuery(
    queryKey,
    () => satkerService.getSemua({ q: search, page, limit: 10, aktif: showAktif })
  );

  // Tambah satker
  const handleTambah = async () => {
    setSedangMenyimpan(true);
    try {
      await satkerService.create(formData);
      notify.suksess('Satker berhasil ditambahkan');
      setDialogTambahOpen(false);
      setFormData({ kode: '', nama: '', singkat: '', aktif: true });
      invalidasiCache('satker');
      refetch();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menambahkan satker'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Update satker
  const handleUpdate = async () => {
    if (!selectedSatker) return;
    setSedangMenyimpan(true);
    try {
      await satkerService.update(selectedSatker.id, formData);
      notify.suksess('Satker berhasil diperbarui');
      setDialogEditOpen(false);
      invalidasiCache('satker');
      refetch();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memperbarui satker'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Hapus satker
  const handleHapus = async () => {
    if (!selectedSatker) return;
    setSedangMenghapus(true);
    try {
      await satkerService.remove(selectedSatker.id);
      notify.suksess('Satker berhasil dihapus');
      setDialogHapusOpen(false);
      invalidasiCache('satker');
      refetch();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus satker'));
    } finally {
      setSedangMenghapus(false);
    }
  };

  // Sinkron dari barang
  const handleSync = async () => {
    setSedangSinkron(true);
    try {
      const result = await satkerService.sync();
      notify.suksess(`Sinkronisasi selesai: ${result.dibuat} dibuat, ${result.dilewati} dilewati`);
      invalidasiCache('satker');
      refetch();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal sinkronisasi'));
    } finally {
      setSedangSinkron(false);
    }
  };

  const handleBukaEdit = (satker: Satker) => {
    setSelectedSatker(satker);
    setFormData({
      kode: satker.kode,
      nama: satker.nama,
      singkat: satker.singkat || '',
      aktif: satker.aktif,
    });
    setDialogEditOpen(true);
  };

  const handleBukaHapus = (satker: Satker) => {
    setSelectedSatker(satker);
    setDialogHapusOpen(true);
  };

  if (isLoading) return <LoadingSpinner layarPenuh />;

  const satkers: Satker[] = satkerData?.data || [];
  const meta = satkerData?.meta || { total: 0, page: 1, totalHalaman: 1 };

  return (
    <div className="space-y-gutter">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-jakarta text-headline-lg-mobile font-bold text-primary sm:text-headline-lg">
            Manajemen Satker
          </h1>
          <p className="mt-1 text-muted-foreground">
            Kelola satuan kerja (satker) dan akses admin
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            loading={sedangSinkron}
          >
            <Icon name="sync" className="mr-2 h-4 w-4" />
            Sync dari Barang
          </Button>
          <Button onClick={() => setDialogTambahOpen(true)}>
            <Icon name="add" className="mr-2 h-4 w-4" />
            Tambah Satker
          </Button>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari kode atau nama satker..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showAktif ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAktif(true)}
          >
            Aktif
          </Button>
          <Button
            variant={!showAktif ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAktif(false)}
          >
            Semua
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Satker</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{meta.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {satkers.filter((s: Satker) => s.aktif).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Non-Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-400">
              {satkers.filter((s: Satker) => !s.aktif).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Kode</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Singkat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satkers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <EmptyState judul="Tidak ada satker" deskripsi="Tambahkan satker baru atau sinkronkan dari data barang" />
                  </td>
                </tr>
              ) : (
                satkers.map((satker: Satker) => (
                  <tr key={satker.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono">{satker.kode}</code>
                    </td>
                    <td className="px-4 py-3 font-medium">{satker.nama}</td>
                    <td className="px-4 py-3 text-slate-500">{satker.singkat || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={satker.aktif ? 'success' : 'secondary'}>
                        {satker.aktif ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleBukaEdit(satker)}>
                          <Icon name="edit" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBukaHapus(satker)}
                          className="text-error hover:text-error"
                        >
                          <Icon name="delete" className="h-4 w-4" />
                        </Button>
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
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      {/* Dialog Tambah */}
      <Dialog open={dialogTambahOpen} onOpenChange={setDialogTambahOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Satker Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kode Satker</label>
              <Input
                placeholder="Contoh: 015110199411868000KP"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Satker</label>
              <Input
                placeholder="Nama lengkap satker"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Singkat (opsional)</label>
              <Input
                placeholder="Singkatan nama satker"
                value={formData.singkat}
                onChange={(e) => setFormData({ ...formData, singkat: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTambahOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleTambah}
              loading={sedangMenyimpan}
              disabled={!formData.kode || !formData.nama}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={dialogEditOpen} onOpenChange={setDialogEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Satker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kode Satker</label>
              <Input value={formData.kode} disabled className="bg-slate-50" />
              <p className="text-xs text-slate-500">Kode satker tidak dapat diubah</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Satker</label>
              <Input
                placeholder="Nama lengkap satker"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Singkat (opsional)</label>
              <Input
                placeholder="Singkatan nama satker"
                value={formData.singkat}
                onChange={(e) => setFormData({ ...formData, singkat: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} loading={sedangMenyimpan} disabled={!formData.nama}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus */}
      <Dialog open={dialogHapusOpen} onOpenChange={setDialogHapusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Satker</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus satker <strong>{selectedSatker?.nama}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-error/20 bg-error/5 p-4">
              <p className="text-sm text-error">
                Perhatian: Satker tidak dapat dihapus jika masih memiliki barang terkait.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogHapusOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleHapus}
              loading={sedangMenghapus}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
