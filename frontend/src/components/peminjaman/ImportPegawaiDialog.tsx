// ============================================================
//  Dialog Import Data Pegawai (Daftar Pegawai).
//  Mengisi & menyinkronkan DATA DIRI peminjam dari file master
//  pegawai (mis. Data-Pegawai-BPPK.xlsx). Field yang diisi sama
//  dengan halaman Pengaturan Akun: Nama, NIP, Jabatan, Email,
//  Unit Kerja, Eselon II, Eselon III, Eselon IV.
//    - NIP belum ada  -> dibuatkan akun peminjam baru.
//    - NIP sudah ada    -> field kosong diisi, yang berubah diperbarui.
//    - Sel kosong        -> tidak menimpa data lama.
//    - Tidak pernah menghapus (hapus hanya manual oleh admin).
// ============================================================

'use client';

import { useRef, useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertTriangle, UserPlus, RefreshCw, MinusCircle } from 'lucide-react';
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
import { pegawaiImportService, type HasilImportPegawai } from '@/services/pegawaiImport.service';
import { ambilPesanError } from '@/lib/utils';

interface Props {
  onSelesai?: () => void; // dipanggil setelah import berhasil (untuk refetch)
}

export function ImportPegawaiDialog({ onSelesai }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const [hasil, setHasil] = useState<HasilImportPegawai | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setHasil(null);
    setMengunggah(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const unduhTemplate = async () => {
    try {
      await pegawaiImportService.unduhTemplate();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengunduh template.'));
    }
  };

  const proses = async () => {
    if (!file) return;
    setMengunggah(true);
    setHasil(null);
    try {
      const res = await pegawaiImportService.importExcel(file);
      setHasil(res);
      const adaPerubahan = res.ditambahkan > 0 || res.diperbarui > 0;
      if (adaPerubahan) {
        notify.suksess(`Sinkron: +${res.ditambahkan} akun baru, ${res.diperbarui} data diri diperbarui.`);
        onSelesai?.();
      } else if (res.gagal === 0) {
        notify.info('Data pegawai sudah sinkron dengan file. Tidak ada perubahan.');
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
          <Upload className="h-4 w-4" /> Import Pegawai
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Data Pegawai</DialogTitle>
          <DialogDescription>
            Mengisi &amp; menyinkronkan <strong>data diri peminjam</strong> dari file master pegawai. Field yang
            diisi sama dengan halaman Pengaturan Akun. Data diri yang <strong>kosong akan diisi</strong> dan yang{' '}
            <strong>berubah akan diperbarui</strong> (dicocokkan lewat NIP). Sel yang <strong>kosong di Excel tidak
            akan menimpa</strong> data lama. NIP yang <strong>belum terdaftar dibuatkan akun peminjam baru</strong>.
            Import <strong>tidak pernah menghapus akun</strong> — penghapusan hanya bisa dilakukan admin secara manual.
          </DialogDescription>
        </DialogHeader>

        {/* Langkah 1: template */}
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="mb-2 font-medium text-foreground">Belum punya format file?</p>
          <Button variant="secondary" size="sm" type="button" onClick={unduhTemplate}>
            <Download className="h-4 w-4" /> Unduh Template
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Kolom: NIP, Nama, Jabatan, Email, Unit Kerja, Eselon II, Eselon III, Eselon IV. Kolom{' '}
            <strong>NIP, Nama, Email</strong> wajib diisi. File master pegawai (kolom{' '}
            <strong>Jabatan1, UE2, UE3, UE4</strong>) juga langsung dikenali. Akun baru memakai password default{' '}
            <strong>Bmn@2026</strong> — sampaikan ke peminjam agar segera menggantinya.
          </p>
        </div>

        {/* Langkah 2: pilih file */}
        <div>
          <label
            htmlFor="file-import-pegawai"
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
            id="file-import-pegawai"
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
                <UserPlus className="h-4 w-4" /> {hasil.ditambahkan} akun baru
              </span>
              <span className="inline-flex items-center gap-1.5 text-blue-700">
                <RefreshCw className="h-4 w-4" /> {hasil.diperbarui} diperbarui
              </span>
              {hasil.takBerubah > 0 && (
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <MinusCircle className="h-4 w-4" /> {hasil.takBerubah} sudah sinkron
                </span>
              )}
              {hasil.gagal > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="h-4 w-4" /> {hasil.gagal} baris gagal
                </span>
              )}
            </div>

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
              <details className="rounded-md bg-blue-50 p-2">
                <summary className="cursor-pointer text-xs font-medium text-blue-800">
                  Data diri diperbarui ({hasil.detailDiperbarui.length})
                </summary>
                <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-blue-800">
                  {hasil.detailDiperbarui.map((u, i) => (
                    <li key={i}>
                      {u.nama} — NIP {u.nip}
                      {u.perubahan.length > 0 ? ` (isi/ubah: ${u.perubahan.join(', ')})` : ''}
                    </li>
                  ))}
                </ul>
              </details>
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
