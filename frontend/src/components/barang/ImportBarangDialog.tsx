// ============================================================
//  Dialog Import Barang dari Excel/CSV (mode tambah).
//  - Unduh template agar format kolom benar.
//  - Unggah file .xlsx/.xls/.csv lalu tampilkan laporan hasil.
// ============================================================

'use client';

import { useRef, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  PlusCircle,
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
import { barangService, type HasilImport } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';

interface Props {
  onSelesai?: () => void; // dipanggil setelah import berhasil (untuk refetch)
}

export function ImportBarangDialog({ onSelesai }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const [hasil, setHasil] = useState<HasilImport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setHasil(null);
    setMengunggah(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const unduhTemplate = async () => {
    try {
      await barangService.unduhTemplate();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengunduh template.'));
    }
  };

  const proses = async () => {
    if (!file) return;
    setMengunggah(true);
    setHasil(null);
    try {
      const res = await barangService.importExcel(file);
      setHasil(res);
      const adaPerubahan = res.ditambahkan + res.diperbarui + res.dihapus > 0;
      if (adaPerubahan) {
        notify.suksess(
          `Impor: +${res.ditambahkan} baru, ${res.diperbarui} diperbarui, ${res.dihapus} dihapus.`
        );
        onSelesai?.();
      } else if (res.gagal === 0) {
        // Data sudah sama persis dengan file — tidak ada yang berubah.
        notify.info('Data sudah sesuai dengan file. Tidak ada perubahan.');
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
          <Upload className="h-4 w-4" /> Import Excel
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Barang dari Excel</DialogTitle>
          <DialogDescription>
            Unggah file .xlsx, .xls, atau .csv. Database akan <strong>disinkronkan</strong> dengan isi
            file: baris baru <strong>ditambahkan</strong>, yang sudah ada <strong>diperbarui</strong>, dan
            aset yang <strong>tidak ada lagi di file akan dihapus</strong> — kecuali unit yang sedang/pernah
            dipinjam (otomatis dilindungi). Setiap baris = 1 unit barang.
          </DialogDescription>
        </DialogHeader>

        {/* Langkah 1: template */}
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="mb-2 font-medium text-foreground">Belum punya format file?</p>
          <Button variant="secondary" size="sm" type="button" onClick={unduhTemplate}>
            <Download className="h-4 w-4" /> Unduh Template
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Kolom: Kode Satker, Nama Satker, Kode Barang, NUP, Nama Barang, Merk, Tipe, Jenis BMN,
            Kondisi (Baik/Rusak Ringan/Rusak Berat), Lokasi Ruang (BU), Deskripsi. Kolom{' '}
            <strong>NUP</strong> wajib — kode barang otomatis dibentuk dari{' '}
            <strong>Kode Satker · Kode Barang · NUP</strong>.
          </p>
        </div>

        {/* Langkah 2: pilih file */}
        <div>
          <label
            htmlFor="file-import"
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
            id="file-import"
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
                <PlusCircle className="h-4 w-4" /> {hasil.ditambahkan} ditambahkan
              </span>
              <span className="inline-flex items-center gap-1.5 text-blue-700">
                <RefreshCw className="h-4 w-4" /> {hasil.diperbarui} diperbarui
              </span>
              <span className="inline-flex items-center gap-1.5 text-orange-700">
                <Trash2 className="h-4 w-4" /> {hasil.dihapus} dihapus
              </span>
              {hasil.dilindungi > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <ShieldCheck className="h-4 w-4" /> {hasil.dilindungi} dilindungi
                </span>
              )}
              {hasil.gagal > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="h-4 w-4" /> {hasil.gagal} gagal
                </span>
              )}
            </div>
            {hasil.dilindungi > 0 && (
              <p className="text-xs text-amber-700">
                {hasil.dilindungi} aset tidak ada di file tetapi <strong>tidak dihapus</strong> karena
                terkait peminjaman. Hapus manual bila benar-benar perlu.
              </p>
            )}
            {hasil.detailGagal.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md bg-red-50 p-2">
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
