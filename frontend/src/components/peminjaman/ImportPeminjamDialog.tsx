// ============================================================
//  Dialog Import Peminjam dari Excel/CSV.
//  Migrasi data pegawai yang SEDANG meminjam barang (data lama
//  di luar sistem): buat akun PEMINJAM + peminjaman aktif,
//  dicocokkan ke barang lewat kolom NUP Laptop.
// ============================================================

'use client';

import { useRef, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  UserPlus,
  PackageCheck,
  RefreshCw,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { peminjamImportService, type HasilImportPeminjam } from '@/services/peminjamImport.service';
import { ambilPesanError } from '@/lib/utils';

interface Props {
  onSelesai?: () => void; // dipanggil setelah import berhasil (untuk refetch)
}

export function ImportPeminjamDialog({ onSelesai }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const [hasil, setHasil] = useState<HasilImportPeminjam | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setHasil(null);
    setMengunggah(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const unduhTemplate = async () => {
    try {
      await peminjamImportService.unduhTemplate();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengunduh template.'));
    }
  };

  const proses = async () => {
    if (!file) return;
    setMengunggah(true);
    setHasil(null);
    try {
      const res = await peminjamImportService.importExcel(file);
      setHasil(res);
      const adaPerubahan =
        res.akunDitambahkan > 0 || res.akunDiperbarui > 0 || res.akunDihapus > 0 || res.peminjamanDibuat > 0;
      if (adaPerubahan) {
        notify.sukses(
          `Sinkron: +${res.akunDitambahkan} baru, ${res.akunDiperbarui} diperbarui, ${res.akunDihapus} dihapus.`
        );
        onSelesai?.();
      } else if (res.gagal === 0 && res.barangTidakDitemukan === 0) {
        notify.info('Data peminjam sudah sinkron dengan file. Tidak ada perubahan.');
      } else {
        notify.gagal('Tidak ada perubahan diterapkan. Periksa detail di bawah.');
      }
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengimpor file.'));
    } finally {
      setMengunggah(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Import Peminjam
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Data Peminjam dari Excel</DialogTitle>
          <DialogDescription>
            File menjadi <strong>sumber data</strong> peminjam: re-import akan{' '}
            <strong>menyinkronkan</strong> — baris baru <strong>ditambahkan</strong>, data yang berubah{' '}
            <strong>diperbarui</strong>, dan akun hasil import yang <strong>hilang dari file dihapus</strong>{' '}
            (kecuali yang punya riwayat peminjaman — dilindungi). Kolom <strong>Merk Laptop</strong> &amp;{' '}
            <strong>NUP Laptop</strong> dicocokkan ke barang (dicari merk-nya dahulu, lalu NUP); bila cocok &amp;
            stok tersedia, dibuatkan <strong>peminjaman aktif</strong>. Akun yang dibuat manual/registrasi tidak
            terpengaruh.
          </DialogDescription>
        </DialogHeader>

        {/* Langkah 1: template */}
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="mb-2 font-medium text-foreground">Belum punya format file?</p>
          <Button variant="secondary" size="sm" type="button" onClick={unduhTemplate}>
            <Download className="h-4 w-4" /> Unduh Template
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Kolom: Email, Nama, NIP, Eselon III, Eselon IV, Merk Laptop, Tipe Laptop, NUP Laptop. Kolom{' '}
            <strong>Email, Nama, NIP</strong> wajib diisi; <strong>Merk Laptop + NUP Laptop</strong> dipakai untuk
            mencocokkan barang yang dipinjam. Semua akun baru memakai password default <strong>Bmn@2026</strong> —
            sampaikan ke peminjam agar segera menggantinya.
          </p>
        </div>

        {/* Langkah 2: pilih file */}
        <div>
          <label
            htmlFor="file-import-peminjam"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background p-6 text-center transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            {file ? (
              <span className="text-sm font-medium text-foreground">{file.name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Klik untuk memilih file Excel/CSV</span>
            )}
          </label>
          <input
            id="file-import-peminjam"
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              setHasil(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
        </div>

        {/* Laporan hasil */}
        {hasil && (
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-green-700">
                <UserPlus className="h-4 w-4" /> {hasil.akunDitambahkan} ditambahkan
              </span>
              <span className="inline-flex items-center gap-1.5 text-blue-700">
                <RefreshCw className="h-4 w-4" /> {hasil.akunDiperbarui} diperbarui
              </span>
              <span className="inline-flex items-center gap-1.5 text-red-700">
                <Trash2 className="h-4 w-4" /> {hasil.akunDihapus} dihapus
              </span>
              <span className="inline-flex items-center gap-1.5 text-purple-700">
                <PackageCheck className="h-4 w-4" /> {hasil.peminjamanDibuat} peminjaman dibuat
              </span>
              {hasil.akunDilindungi > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <ShieldCheck className="h-4 w-4" /> {hasil.akunDilindungi} dilindungi
                </span>
              )}
              {hasil.barangTidakDitemukan > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> {hasil.barangTidakDitemukan} barang tidak cocok
                </span>
              )}
              {hasil.gagal > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="h-4 w-4" /> {hasil.gagal} baris gagal
                </span>
              )}
            </div>
            {hasil.detailDilindungi.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md bg-amber-50 p-2">
                <p className="mb-1 text-xs font-medium text-amber-800">
                  Tidak dihapus karena punya riwayat peminjaman:
                </p>
                <ul className="space-y-1 text-xs text-amber-800">
                  {hasil.detailDilindungi.map((u, i) => (
                    <li key={i}>
                      {u.nama} (NIP {u.nip})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasil.detailBarangTidakDitemukan.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md bg-amber-50 p-2">
                <p className="mb-1 text-xs font-medium text-amber-800">Merk / NUP tidak cocok / stok habis:</p>
                <ul className="space-y-1 text-xs text-amber-800">
                  {hasil.detailBarangTidakDitemukan.map((g, i) => (
                    <li key={i}>
                      <strong>Baris {g.baris}</strong> ({g.nama}, {g.merk || 'tanpa merk'} / NUP {g.nup || '-'}): {g.pesan}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasil.detailGagal.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md bg-red-50 p-2">
                <ul className="space-y-1 text-xs text-red-800">
                  {hasil.detailGagal.map((g, i) => (
                    <li key={i}>
                      <strong>Baris {g.baris}</strong> ({g.nama}): {g.pesan}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Tutup
          </Button>
          <Button type="button" onClick={proses} disabled={!file || mengunggah}>
            <Upload className="h-4 w-4" /> {mengunggah ? 'Mengimpor…' : 'Import Sekarang'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
