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
  MinusCircle,
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
        res.akunDitambahkan > 0 || res.akunDiperbarui > 0 || res.peminjamanDibuat > 0;
      if (adaPerubahan) {
        notify.suksess(
          `Sinkron: +${res.akunDitambahkan} akun baru, ${res.akunDiperbarui} diperbarui, ${res.peminjamanDibuat} peminjaman dibuat.`
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
        <Button variant="outline" className="bg-white text-primary hover:bg-white">
          <Upload className="h-4 w-4" /> Import Peminjam
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Data Peminjam dari Excel</DialogTitle>
          <DialogDescription className="space-y-1.5 pt-1">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Akun <strong>email, NIP, atau NIP+Nama</strong> yang sudah ada akan <strong>diperbarui</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Baris baru akan <strong>ditambahkan</strong> sebagai akun peminjam.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Import <strong>tidak pernah menghapus</strong> akun yang sudah ada.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Akun dari <strong>registrasi manual</strong> tidak terpengaruh.</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Catatan pencocokan: harus PERSIS sama (case-sensitive) */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="font-semibold text-amber-900 text-sm">Pencocokan Merk & NUP Laptop</p>

          <div className="space-y-1.5 text-xs text-amber-900">
            <p>Kolom <strong>Merk</strong> dan <strong>NUP Laptop</strong> di Excel harus <strong>persis sama</strong> dengan data di sistem.</p>
            <p>Termasuk: huruf besar/kecil, spasi, dan karakter lainnya.</p>
          </div>

          <div className="rounded bg-white p-2 text-xs">
            <p className="mb-1 font-medium text-amber-900">Contoh:</p>
            <p className="text-amber-900">
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">Dell</code>
              {' '}&neArr;{' '}
              <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-red-600 line-through">dell</code>
              {' '}&neArr;{' '}
              <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-red-600 line-through">DELL</code>
            </p>
            <p className="mt-1 text-amber-900">Jika berbeda satu karakter pun, baris masuk tab <strong>Gagal</strong>.</p>
          </div>

          <div className="rounded bg-white p-2 text-xs">
            <p className="mb-1 font-medium text-amber-900">Contoh yang benar:</p>
            <ul className="space-y-0.5 text-amber-900">
              <li>Merk: <strong>Asus</strong></li>
              <li>Tipe: <strong>Travelmate TMP214 Core i5</strong></li>
              <li>NUP: <strong>777</strong></li>
            </ul>
          </div>

          <div className="flex items-start gap-2 text-xs text-amber-900">
            <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>Baris <strong>tanpa NUP</strong> tetap dibuatkan akun, hanya <strong>tanpa peminjaman</strong>.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-amber-900">
            <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>Setiap baris dengan NUP berbeda = 1 peminjaman tersendiri.</span>
          </div>
        </div>

        {/* Template */}
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium text-foreground">Kolom Template Excel</p>
            <Button variant="secondary" size="sm" type="button" onClick={unduhTemplate}>
              <Download className="h-4 w-4" /> Unduh Template
            </Button>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {['Email', 'Nama', 'NIP', 'Eselon III', 'Eselon IV', 'Merk Laptop', 'Tipe Laptop', 'NUP Laptop'].map((k) => (
              <span key={k} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {k}
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Email, Nama, NIP</strong> wajib diisi.{' '}
            <strong>Merk, Tipe dan NUP Laptop</strong> dipakai untuk mencocokkan barang yang dipinjam.
          </p>

          {/* Password default */}
          <div className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-900">
            <p>
              Password default akun baru:{' '}
              <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono font-semibold">Bmn@2026</code>
            </p>
            <p className="mt-0.5">Minta peminjam mengganti password setelah pertama kali login.</p>
          </div>
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
              <span className="inline-flex items-center gap-1.5 text-purple-700">
                <PackageCheck className="h-4 w-4" /> {hasil.peminjamanDibuat} peminjaman dibuat
              </span>
              {hasil.dilewatiTanpaNup > 0 && (
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <MinusCircle className="h-4 w-4" /> {hasil.dilewatiTanpaNup} tanpa NUP (akun saja, tanpa peminjaman)
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

            {/* Rincian data yang berubah (dapat dibuka) */}
            {hasil.detailDitambahkan.length > 0 && (
              <details className="rounded-md bg-green-50 p-2" open>
                <summary className="cursor-pointer text-xs font-medium text-green-800">
                  Akun ditambahkan ({hasil.detailDitambahkan.length})
                </summary>
                <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-green-800">
                  {hasil.detailDitambahkan.map((u, i) => (
                    <li key={i}>
                      {u.nama} — NIP {u.nip} ({u.email})
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {hasil.detailDiperbarui.length > 0 && (
              <details className="rounded-md bg-primary/5 p-2">
                <summary className="cursor-pointer text-xs font-medium text-primary">
                  Akun diperbarui ({hasil.detailDiperbarui.length})
                </summary>
                <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-primary">
                  {hasil.detailDiperbarui.map((u, i) => (
                    <li key={i}>
                      {u.nama} — NIP {u.nip}
                      {u.perubahan.length > 0 ? ` (ubah: ${u.perubahan.join(', ')})` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {hasil.detailPeminjamanDibuat.length > 0 && (
              <details className="rounded-md bg-purple-50 p-2">
                <summary className="cursor-pointer text-xs font-medium text-purple-800">
                  Peminjaman dibuat ({hasil.detailPeminjamanDibuat.length})
                </summary>
                <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-purple-800">
                  {hasil.detailPeminjamanDibuat.map((p, i) => (
                    <li key={i}>
                      {p.nama} — {p.merk || 'tanpa merk'} / NUP {p.nup || '-'} ({p.kodeBarang})
                    </li>
                  ))}
                </ul>
              </details>
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
