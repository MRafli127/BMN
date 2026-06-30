// ============================================================
//  Langkah Surat Pernyataan - Design User-Friendly.
//   Layout vertikal: Data peminjam, barang, signature pad besar.
//   Langsung kirim tanpa upload PDF (signature digital).
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Send,
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
  Eraser,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { ItemPengajuan, Peminjaman } from '@/types/peminjaman.type';

interface ItemDenganNama extends ItemPengajuan {
  namaBarang?: string;
}

interface Props {
  items: ItemPengajuan[] | ItemDenganNama[];
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  onSelesai: (peminjaman: Peminjaman) => void;
  onKembali?: () => void;
}

export function LangkahSuratPernyataan({
  items,
  tanggalPinjamRencana,
  tanggalKembaliRencana,
  onSelesai,
  onKembali,
}: Props) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [suratUrl, setSuratUrl] = useState<string | null>(null);
  const [memuatSurat, setMemuatSurat] = useState(false);
  const [gagalSurat, setGagalSurat] = useState(false);
  const [sedangKirim, setSedangKirim] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  // Generate surat preview
  const buatSurat = useCallback(() => {
    if (items.length === 0) return;
    setMemuatSurat(true);
    setGagalSurat(false);

    peminjamanService
      .previewSurat({ items, tanggalPinjamRencana, tanggalKembaliRencana })
      .then(setSuratUrl)
      .catch(() => {
        setGagalSurat(true);
        notify.gagal('Gagal menyiapkan surat pernyataan.');
      })
      .finally(() => setMemuatSurat(false));
  }, [items, tanggalPinjamRencana, tanggalKembaliRencana]);

  useEffect(() => {
    buatSurat();
  }, [buatSurat]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
      }
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Drawing functions
  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    setLastX(pos.x);
    setLastY(pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastX(pos.x);
    setLastY(pos.y);
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  // Convert canvas signature to data URL PNG
  const getSignatureDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;
    return canvas.toDataURL('image/png');
  };

  // Submit
  const ajukan = async () => {
    if (!hasSignature) return notify.gagal('Silakan tanda tangan terlebih dahulu.');

    setSedangKirim(true);
    try {
      // Capture signature as data URL
      const signatureDataUrl = getSignatureDataUrl();

      const p = await peminjamanService.create({
        items,
        tanggalPinjamRencana,
        tanggalKembaliRencana,
        signatureDataUrl,
      });

      onSelesai(p);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengirim pengajuan.'));
    } finally {
      setSedangKirim(false);
    }
  };

  const formatTanggal = (tgl?: string) => {
    if (!tgl) return '-';
    const date = new Date(tgl);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <FileText className="h-7 w-7" />
            Formulir Pengajuan Peminjaman
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Tanda tangani surat pernyataan untuk mengajukan peminjaman barang.
          </p>
        </div>
        {onKembali && (
          <Button variant="outline" size="lg" onClick={onKembali}>
            <ArrowLeft className="h-5 w-5" />
            Kembali
          </Button>
        )}
      </div>

      {/* Main Content - 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* KIRI: Form (3/5) */}
        <div className="space-y-5 lg:col-span-3">
          {/* Data Peminjam */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Data Peminjam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-base sm:grid-cols-3">
                <div>
                  <span className="text-sm text-muted-foreground">Nama</span>
                  <p className="font-semibold">{user?.nama ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">NIP</span>
                  <p className="font-semibold">{user?.nip ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Unit Kerja</span>
                  <p className="font-semibold">{user?.unitKerjaPegawai ?? user?.unitKerja ?? '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barang Dipinjam */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Barang Dipinjam</CardTitle>
                <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-primary px-3 text-sm font-bold text-white">
                  {items.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {items.map((item, index) => (
                  <div
                    key={`${item.barangId}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="font-medium">
                        {'namaBarang' in item ? item.namaBarang : `Barang #${index + 1}`}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-muted-foreground">x{item.jumlahPinjam}</span>
                  </div>
                ))}
              </div>
              {(tanggalPinjamRencana || tanggalKembaliRencana) && (
                <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                  {tanggalPinjamRencana && (
                    <div>
                      <span className="text-muted-foreground">Tanggal Pinjam:</span>{' '}
                      <span className="font-medium">{formatTanggal(tanggalPinjamRencana)}</span>
                    </div>
                  )}
                  {tanggalKembaliRencana && (
                    <div>
                      <span className="text-muted-foreground">Rencana Kembali:</span>{' '}
                      <span className="font-medium">{formatTanggal(tanggalKembaliRencana)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tanda Tangan */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tanda Tangan</CardTitle>
                <span className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white">WAJIB</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tanda tangan di bawah ini sebagai persetujuan peminjaman
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-white shadow-inner">
                <div className="flex justify-end border-b p-2">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700"
                  >
                    <Eraser className="h-4 w-4" />
                    Hapus Tanda Tangan
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  className="block w-full cursor-crosshair"
                  style={{ height: '180px', touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="border-t p-3 text-center text-sm text-muted-foreground">
                  Klik dan drag untuk membuat tanda tangan
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KANAN: Preview Surat (2/5) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Preview Surat Pernyataan</CardTitle>
                <div className="flex gap-2">
                  {suratUrl && (
                    <>
                      <Button asChild variant="ghost" size="sm">
                        <a href={suratUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={suratUrl} download="surat-pernyataan-peminjaman.pdf">
                          <Download className="h-4 w-4" />
                          Unduh
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {memuatSurat ? (
                <div className="flex h-[400px] items-center justify-center">
                  <span className="flex items-center gap-3 text-base text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Menyiapkan surat...
                  </span>
                </div>
              ) : gagalSurat ? (
                <div className="flex h-[200px] flex-col items-center justify-center gap-4">
                  <p className="text-base text-muted-foreground">Surat gagal dibuat.</p>
                  <Button variant="outline" onClick={buatSurat}>
                    <RefreshCw className="h-4 w-4" />
                    Coba Lagi
                  </Button>
                </div>
              ) : suratUrl ? (
                <iframe
                  src={suratUrl}
                  title="Surat Pernyataan Peminjaman"
                  className="h-[500px] w-full rounded-b-lg border-0"
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center justify-end border-t pt-6">
        <Button
          onClick={ajukan}
          disabled={!hasSignature || sedangKirim}
          size="lg"
          className="px-8 text-base"
        >
          {sedangKirim ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          Kirim Pengajuan
        </Button>
      </div>
    </div>
  );
}