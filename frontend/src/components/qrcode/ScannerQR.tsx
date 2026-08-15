// ============================================================
//  Pemindai QR Code untuk pengembalian. Tiga cara:
//   1) Pindai langsung via kamera (html5-qrcode)
//   2) Unggah gambar QR Code (foto/screenshot)
//   3) Masukkan kode peminjaman secara manual
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Keyboard, Search, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { notify } from '@/components/ui/toast';

interface Props {
  onHasil: (kodePeminjaman: string) => void;
}

const ID_READER = 'qr-reader';
const ID_FILE_READER = 'qr-file-reader';

export function ScannerQR({ onHasil }: Props) {
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aktif, setAktif] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [sedangBacaFile, setSedangBacaFile] = useState(false);

  // Ekstrak kode peminjaman dari teks hasil scan (QR berisi JSON)
  const ekstrakKode = (teks: string): string => {
    try {
      const obj = JSON.parse(teks);
      return obj.kodePeminjaman || teks;
    } catch {
      return teks;
    }
  };

  const mulai = async () => {
    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(ID_READER);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const kode = ekstrakKode(decodedText);
          hentikan();
          onHasil(kode);
        },
        undefined
      );
      setAktif(true);
    } catch {
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan, unggah gambar QR, atau gunakan input manual.');
      setAktif(false);
    }
  };

  const hentikan = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        /* abaikan */
      }
      scannerRef.current = null;
    }
    setAktif(false);
  };

  // Bersihkan kamera saat komponen dilepas
  useEffect(() => {
    return () => {
      hentikan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Baca QR dari gambar yang diunggah
  const tanganiFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset agar file yang sama bisa dipilih lagi
    if (!file) return;

    setError(null);
    setSedangBacaFile(true);
    try {
      if (aktif) await hentikan(); // matikan kamera bila sedang menyala
      const { Html5Qrcode } = await import('html5-qrcode');
      const fileScanner = new Html5Qrcode(ID_FILE_READER);
      const decodedText = await fileScanner.scanFile(file, false);
      await fileScanner.clear();
      onHasil(ekstrakKode(decodedText));
    } catch {
      setError('QR Code pada gambar tidak terbaca. Pastikan gambar jelas & fokus pada QR Code.');
    } finally {
      setSedangBacaFile(false);
    }
  };

  const cariManual = () => {
    if (manual.trim().length < 3) return notify.gagal('Masukkan kode peminjaman yang valid.');
    onHasil(manual.trim());
  };

  return (
    <div className="space-y-4">
      {/* Area kamera */}
      <div className="overflow-hidden rounded-xl border bg-black/5">
        <div id={ID_READER} className="mx-auto w-full max-w-sm" />
        {!aktif && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Camera className="h-10 w-10 text-muted-foreground" />
            <p className="px-6 text-center text-sm text-muted-foreground">
              Nyalakan kamera untuk memindai QR Code, atau unggah gambar QR di bawah.
            </p>
          </div>
        )}
      </div>

      {/* Elemen tersembunyi untuk pemindaian dari file */}
      <div id={ID_FILE_READER} className="hidden" />

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Tombol kamera & unggah gambar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {!aktif ? (
          <Button onClick={mulai} disabled={sedangBacaFile}>
            <Camera className="h-4 w-4" /> Nyalakan Kamera
          </Button>
        ) : (
          <Button variant="destructive" onClick={hentikan}>
            <CameraOff className="h-4 w-4" /> Matikan Kamera
          </Button>
        )}

        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={sedangBacaFile}>
          {sedangBacaFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Unggah Gambar QR
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={tanganiFile} />
      </div>

      {/* Input manual */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <Label className="flex items-center gap-2">
          <Keyboard className="h-4 w-4" /> Atau masukkan kode secara manual
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="Contoh: 015110199411868004KP-3100102002-16"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), cariManual())}
          />
          <Button onClick={cariManual} variant="secondary">
            <Search className="h-4 w-4" /> Cari
          </Button>
        </div>
      </div>
    </div>
  );
}
