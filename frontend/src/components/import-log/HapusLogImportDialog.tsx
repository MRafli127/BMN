// ============================================================
//  Dialog hapus log import dengan verifikasi 2 langkah:
//  1. Konfirmasi yakin.
//  2. Ketik: jenis import, nama pengimport, dan tanggal.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, ShieldCheck, Type, Tag, User, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTanggal } from '@/lib/utils';
import type { ImportLog } from '@/services/importLog.service';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  target: ImportLog | null;
  sedangProses?: boolean;
  onKonfirmasi: () => Promise<void>;
}

type Langkah = 'yakin' | 'ketik';

const LABEL_JENIS: Record<string, string> = {
  PEMINJAM: 'Import Peminjam',
  BARANG: 'Import Barang',
  PEGAWAI: 'Import Pegawai',
};

export function HapusLogImportDialog({
  terbuka,
  onUbahTerbuka,
  target,
  sedangProses = false,
  onKonfirmasi,
}: Props) {
  const [langkah, setLangkah] = useState<Langkah>('yakin');
  const [inputJenis, setInputJenis] = useState('');
  const [inputNama, setInputNama] = useState('');
  const [inputTanggal, setInputTanggal] = useState('');
  const [sedangHapus, setSedangHapus] = useState(false);

  useEffect(() => {
    if (terbuka) {
      setLangkah('yakin');
      setInputJenis('');
      setInputNama('');
      setInputTanggal('');
      setSedangHapus(false);
    }
  }, [terbuka]);

  const jenisTarget = target ? (LABEL_JENIS[target.jenisImport] ?? target.jenisImport) : '';
  const namaTarget = target?.userNama ?? '';
  const tanggalTarget = target ? formatTanggal(target.createdAt) : '';

  const cocokJenis = inputJenis.trim().toLowerCase() === jenisTarget.toLowerCase();
  const cocokNama = inputNama.trim().toLowerCase() === namaTarget.toLowerCase();
  const cocokTanggal = inputTanggal.trim().toLowerCase() === tanggalTarget.toLowerCase();
  const semuaCocok = cocokJenis && cocokNama && cocokTanggal;

  const isProcessing = sedangHapus || sedangProses;

  const handleKonfirmasi = async () => {
    if (!semuaCocok || isProcessing) return;
    setSedangHapus(true);
    try {
      await onKonfirmasi();
    } catch {
      // Error sudah ditampilkan via toast; biarkan dialog terbuka
    } finally {
      setSedangHapus(false);
    }
  };

  const handleBatal = () => {
    if (isProcessing) return;
    onUbahTerbuka(false);
  };

  return (
    <Dialog open={terbuka} onOpenChange={(o) => !isProcessing && o === false && handleBatal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          {langkah === 'yakin' ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <DialogTitle>Yakin Hapus Log Import?</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Hapus log import{' '}
                <span className="font-semibold text-foreground">{jenisTarget}</span>{' '}
                oleh <span className="font-semibold text-foreground">{namaTarget}</span> pada{' '}
                <span className="font-semibold text-foreground">{tanggalTarget}</span>
                ? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <ShieldCheck className="h-5 w-5 text-red-600" />
                </div>
                <DialogTitle>Verifikasi Penghapusan</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Untuk melanjutkan, isi ketiga field di bawah ini sesuai informasi log import.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {langkah === 'ketik' && (
          <div className="space-y-3">
            {/* Field: Jenis Import */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="verify-jenis" className="text-sm font-medium">
                  Jenis Import
                </label>
              </div>
              <Input
                id="verify-jenis"
                value={inputJenis}
                onChange={(e) => setInputJenis(e.target.value)}
                placeholder={jenisTarget}
                autoComplete="off"
                disabled={isProcessing}
              />
              {inputJenis.length > 0 && !cocokJenis && (
                <p className="text-xs text-destructive">Tidak cocok. Ketik: &quot;{jenisTarget}&quot;</p>
              )}
            </div>

            {/* Field: Nama Pengimport */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="verify-nama" className="text-sm font-medium">
                  Nama Pengimport
                </label>
              </div>
              <Input
                id="verify-nama"
                value={inputNama}
                onChange={(e) => setInputNama(e.target.value)}
                placeholder={namaTarget}
                autoComplete="off"
                disabled={isProcessing}
              />
              {inputNama.length > 0 && !cocokNama && (
                <p className="text-xs text-destructive">Tidak cocok. Ketik: &quot;{namaTarget}&quot;</p>
              )}
            </div>

            {/* Field: Tanggal */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="verify-tanggal" className="text-sm font-medium">
                  Tanggal Import
                </label>
              </div>
              <Input
                id="verify-tanggal"
                value={inputTanggal}
                onChange={(e) => setInputTanggal(e.target.value)}
                placeholder={tanggalTarget}
                autoComplete="off"
                disabled={isProcessing}
              />
              {inputTanggal.length > 0 && !cocokTanggal && (
                <p className="text-xs text-destructive">Tidak cocok. Ketik: &quot;{tanggalTarget}&quot;</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleBatal} disabled={isProcessing}>
            Batal
          </Button>

          {langkah === 'yakin' ? (
            <Button
              variant="destructive"
              onClick={() => setLangkah('ketik')}
              disabled={isProcessing}
            >
              Yakin, Lanjutkan
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleKonfirmasi}
              disabled={!semuaCocok || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
